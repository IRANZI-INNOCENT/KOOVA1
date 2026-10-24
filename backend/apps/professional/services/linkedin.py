from __future__ import annotations

import base64
import json
import os
from datetime import timedelta
from urllib.parse import urlencode, urlparse

import requests
from django.conf import settings
from django.core import signing
from django.utils import timezone

from ..models import LinkedInConnection, ProfessionalPost


class LinkedInError(Exception):
    pass


def linkedin_configured() -> bool:
    return bool(
        os.getenv("LINKEDIN_CLIENT_ID")
        and os.getenv("LINKEDIN_CLIENT_SECRET"),
    )


LINKEDIN_CALLBACK_PATH = "/api/professional/linkedin/callback/"
OAUTH_STATE_SALT = "linkedin-oauth"
# Share on LinkedIn + Sign In with OpenID. offline_access is omitted: LinkedIn
# rejects the consent screen when that scope is not enabled on the app.
DEFAULT_OAUTH_SCOPES = ("openid", "profile", "email", "w_member_social")
OAUTH_ERROR_CODES = {
    "access_denied",
    "scope",
    "token",
    "member",
    "state",
    "state_expired",
    "profile",
    "proxy",
    "api_unreachable",
    "callback",
}
LINKEDIN_ERROR_ALIASES = {
    "user_cancelled_login": "access_denied",
    "user_cancelled_authorize": "access_denied",
    "unauthorized_scope_error": "scope",
    "invalid_scope": "scope",
    "invalid_scope_error": "scope",
}


def linkedin_oauth_redirect_uri(request=None) -> str:
    """
    Redirect URI sent to LinkedIn — must match the Developer app exactly.

    Priority:
    1. LINKEDIN_REDIRECT_URI (API env)
    2. FRONTEND_URL + LINKEDIN_CALLBACK_PATH (site proxy — recommended on Railway)
    3. Request host (local dev fallback when request is provided)
    """
    explicit = os.getenv("LINKEDIN_REDIRECT_URI", "").strip()
    if explicit:
        return explicit if explicit.endswith("/") else f"{explicit}/"

    front = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if front:
        return f"{front}{LINKEDIN_CALLBACK_PATH}"

    if request is not None:
        return request.build_absolute_uri(LINKEDIN_CALLBACK_PATH)

    return ""


def linkedin_connect_config(request=None) -> dict:
    """Non-secret OAuth setup Kova uses (for Connect UI and ops)."""
    redirect_uri = linkedin_oauth_redirect_uri(request)
    front = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    explicit = bool(os.getenv("LINKEDIN_REDIRECT_URI", "").strip())
    return {
        "configured": linkedin_configured(),
        "redirect_uri": redirect_uri,
        "redirect_source": (
            "LINKEDIN_REDIRECT_URI"
            if explicit
            else "FRONTEND_URL"
            if front
            else "request"
        ),
        "frontend_url": front,
        "callback_path": LINKEDIN_CALLBACK_PATH,
        "api_public_url": os.getenv("API_PUBLIC_URL", "").strip().rstrip("/"),
    }


def oauth_scopes() -> list[str]:
    raw = os.getenv("LINKEDIN_OAUTH_SCOPES", "").strip()
    if not raw:
        return list(DEFAULT_OAUTH_SCOPES)
    scopes = [part for part in raw.replace(",", " ").split() if part]
    return scopes or list(DEFAULT_OAUTH_SCOPES)


def accepted_callback_uri(value: str) -> str:
    """Keep a redirect URI only when it is this app's LinkedIn callback."""
    candidate = (value or "").strip()
    if not candidate:
        return ""
    parsed = urlparse(candidate)
    if parsed.scheme == "https":
        pass
    elif parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}:
        pass
    else:
        return ""
    path = (parsed.path or "").rstrip("/")
    if not path.endswith("/api/professional/linkedin/callback"):
        return ""
    return candidate if candidate.endswith("/") else f"{candidate}/"


def build_oauth_state(*, profile_id: int, redirect_uri: str) -> str:
    return signing.dumps(
        {"profile_id": int(profile_id), "redirect_uri": redirect_uri},
        salt=OAUTH_STATE_SALT,
    )


def read_oauth_state(state: str) -> dict:
    payload = signing.loads(state, salt=OAUTH_STATE_SALT, max_age=900)
    if not isinstance(payload, dict) or "profile_id" not in payload:
        raise ValueError("invalid oauth state")
    return payload


def public_oauth_error(raw: str) -> str:
    key = (raw or "").strip()
    if key in OAUTH_ERROR_CODES:
        return key
    return LINKEDIN_ERROR_ALIASES.get(key, "callback")


def sanitize_oauth_detail(value: str) -> str:
    text = " ".join(str(value or "").split())
    text = "".join(ch for ch in text if ch.isprintable())
    return text[:160]


def connect_page_url(
    front: str,
    *,
    error: str = "",
    detail: str = "",
    connected: bool = False,
    profile_pending: bool = False,
) -> str:
    base = f"{front.rstrip('/')}/workspace/linkedin/connect"
    params: dict[str, str] = {}
    if connected:
        params["connected"] = "1"
    if profile_pending:
        params["profile"] = "pending"
    code = public_oauth_error(error) if error else ""
    if error and code:
        params["error"] = code
    cleaned = sanitize_oauth_detail(detail)
    if cleaned and params.get("error"):
        params["detail"] = cleaned
    if not params:
        return base
    return f"{base}?{urlencode(params)}"


def effective_connection_status(connection: LinkedInConnection) -> str:
    status = connection.connection_status
    expires = connection.token_expires_at
    if (
        status == LinkedInConnection.Status.CONNECTED
        and expires is not None
        and expires <= timezone.now()
    ):
        return LinkedInConnection.Status.EXPIRED
    return status


def claims_from_id_token(bundle: dict) -> dict:
    """Read name and member id from LinkedIn's id_token when userinfo is down."""
    token = str((bundle or {}).get("id_token") or "")
    parts = token.split(".")
    if len(parts) < 2:
        return {}
    padded = parts[1] + "=" * (-len(parts[1]) % 4)
    try:
        data = json.loads(base64.urlsafe_b64decode(padded.encode("ascii")))
    except (ValueError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def oauth_authorize_url(*, state: str, redirect_uri: str) -> str:
    client_id = os.getenv("LINKEDIN_CLIENT_ID", "")
    scopes = " ".join(oauth_scopes())
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": scopes,
    }
    return f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"


def exchange_code(*, code: str, redirect_uri: str) -> dict:
    client_id = os.getenv("LINKEDIN_CLIENT_ID", "")
    client_secret = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    response = requests.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=30,
    )
    if not response.ok:
        detail = ""
        try:
            body = response.json()
            if isinstance(body, dict):
                detail = str(body.get("error_description") or body.get("error") or "")
        except ValueError:
            detail = response.text[:200]
        raise LinkedInError(
            detail or "LinkedIn token exchange failed. Check redirect URL and app secret.",
        )
    return response.json()


def fetch_member_profile(access_token: str) -> dict:
    response = requests.get(
        "https://api.linkedin.com/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    if not response.ok:
        raise LinkedInError("Could not read LinkedIn profile.")
    return response.json()


def _api_headers(access_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "LinkedIn-Version": "202405",
        "X-Restli-Protocol-Version": "2.0.0",
    }


def _download_bytes(url: str) -> bytes:
    response = requests.get(url, timeout=45)
    if not response.ok:
        raise LinkedInError("Could not fetch an image for LinkedIn upload.")
    return response.content


def _upload_image(access_token: str, owner_urn: str, image_url: str) -> str:
    init = requests.post(
        "https://api.linkedin.com/rest/images?action=initializeUpload",
        headers=_api_headers(access_token),
        json={"initializeUploadRequest": {"owner": owner_urn}},
        timeout=30,
    )
    try:
        payload = init.json()
    except ValueError as exc:
        raise LinkedInError("LinkedIn image upload failed.") from exc
    if not init.ok:
        raise LinkedInError(
            str(payload.get("message") or init.text[:400] or "LinkedIn image upload failed."),
        )
    value = payload.get("value") or {}
    upload_url = value.get("uploadUrl") or ""
    image_urn = value.get("image") or ""
    if not upload_url or not image_urn:
        raise LinkedInError("LinkedIn did not return an upload URL.")

    binary = _download_bytes(image_url)
    put = requests.put(
        upload_url,
        data=binary,
        headers={"Content-Type": "application/octet-stream"},
        timeout=60,
    )
    if not put.ok:
        raise LinkedInError("LinkedIn rejected the uploaded image.")
    return str(image_urn)


def publish_text_post(connection: LinkedInConnection, post: ProfessionalPost) -> str:
    """Publish a text (and optional multi-image) post. Returns post id/urn if available."""
    access_token = ensure_access_token(connection)

    member_id = connection.linkedin_member_id
    if not member_id:
        raise LinkedInError("LinkedIn member id missing.")

    author = f"urn:li:person:{member_id}"
    payload: dict = {
        "author": author,
        "commentary": post.body[:3000],
        "visibility": "PUBLIC",
        "lifecycleState": "PUBLISHED",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
    }

    image_urls: list[str] = []
    if isinstance(post.media_urls, list):
        image_urls = [str(item).strip() for item in post.media_urls if item][:5]

    if image_urls:
        urns = [_upload_image(access_token, author, url) for url in image_urls]
        if len(urns) == 1:
            payload["content"] = {"media": {"id": urns[0]}}
        else:
            payload["content"] = {
                "multiImage": {"images": [{"id": urn} for urn in urns]},
            }

    response = requests.post(
        "https://api.linkedin.com/rest/posts",
        headers=_api_headers(access_token),
        json=payload,
        timeout=90,
    )
    if response.status_code == 401:
        _mark_expired(connection)
        raise LinkedInError("LinkedIn access expired. Reconnect LinkedIn.")
    if not response.ok:
        raise LinkedInError(response.text[:400] or "LinkedIn publish failed.")

    post_id = response.headers.get("x-restli-id", "")
    return post_id


def apply_token_bundle(connection: LinkedInConnection, bundle: dict) -> None:
    access = bundle.get("access_token", "")
    expires_in = int(bundle.get("expires_in", 0) or 0)
    connection.access_token = access
    refresh = bundle.get("refresh_token")
    if refresh:
        connection.refresh_token = refresh
    if expires_in:
        connection.token_expires_at = timezone.now() + timedelta(seconds=expires_in)
    connection.connection_status = LinkedInConnection.Status.CONNECTED
    connection.save()


def _mark_expired(connection: LinkedInConnection) -> None:
    if connection.connection_status == LinkedInConnection.Status.EXPIRED:
        return
    connection.connection_status = LinkedInConnection.Status.EXPIRED
    connection.save(update_fields=["connection_status", "updated_at"])


def refresh_access_token(refresh_token: str) -> dict:
    client_id = os.getenv("LINKEDIN_CLIENT_ID", "")
    client_secret = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    response = requests.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=30,
    )
    if not response.ok:
        raise LinkedInError("LinkedIn access expired. Reconnect LinkedIn.")
    return response.json()


def ensure_access_token(connection: LinkedInConnection) -> str:
    """Return a usable access token, refreshing it when LinkedIn issued one."""
    if connection.connection_status == LinkedInConnection.Status.DISCONNECTED:
        raise LinkedInError("LinkedIn is not connected.")

    expires = connection.token_expires_at
    stale = bool(expires and expires <= timezone.now() + timedelta(minutes=2))
    expired_flag = connection.connection_status == LinkedInConnection.Status.EXPIRED
    if stale or expired_flag:
        refresh = (connection.refresh_token or "").strip()
        if not refresh:
            _mark_expired(connection)
            raise LinkedInError("LinkedIn access expired. Reconnect LinkedIn.")
        try:
            bundle = refresh_access_token(refresh)
        except LinkedInError:
            _mark_expired(connection)
            raise
        apply_token_bundle(connection, bundle)

    token = (connection.access_token or "").strip()
    if not token:
        raise LinkedInError("LinkedIn access token missing.")
    return token


_BIND_HOSTS = {"0.0.0.0", "127.0.0.1", "localhost", "::1"}


def is_public_origin(value: str) -> bool:
    """True when a URL is a host a browser can open. Bind addresses are not."""
    candidate = (value or "").strip()
    if not candidate:
        return False
    parsed = urlparse(candidate if "://" in candidate else f"https://{candidate}")
    host = (parsed.hostname or "").lower()
    if not host or host in _BIND_HOSTS:
        return False
    return parsed.scheme in {"http", "https"}


def frontend_redirect_base(request=None) -> str:
    """
    Where the browser should land after LinkedIn returns.

    FRONTEND_URL wins when it is a real public site. A container bind address
    such as https://0.0.0.0:8080 is ignored, and the site origin forwarded by
    the Next callback is used instead.
    """
    configured = (getattr(settings, "FRONTEND_URL", "") or "").strip().rstrip("/")
    if is_public_origin(configured):
        return configured

    if request is not None:
        hinted = (
            request.META.get("HTTP_X_KOVA_SITE_ORIGIN", "") or ""
        ).strip().rstrip("/")
        if is_public_origin(hinted):
            return hinted

    if configured:
        return configured
    return "http://localhost:3000"
