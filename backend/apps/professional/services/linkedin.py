from __future__ import annotations

import os
from datetime import timedelta
from urllib.parse import urlencode

import requests
from django.conf import settings
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


def oauth_authorize_url(*, state: str, redirect_uri: str) -> str:
    client_id = os.getenv("LINKEDIN_CLIENT_ID", "")
    scopes = " ".join(
        [
            "openid",
            "profile",
            "email",
            "w_member_social",
            "offline_access",
        ],
    )
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
    if connection.connection_status != LinkedInConnection.Status.CONNECTED:
        raise LinkedInError("LinkedIn is not connected.")

    access_token = connection.access_token
    if not access_token:
        raise LinkedInError("LinkedIn access token missing.")

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
    if not response.ok:
        raise LinkedInError(response.text[:400] or "LinkedIn publish failed.")

    post_id = response.headers.get("x-restli-id", "")
    return post_id


def apply_token_bundle(connection: LinkedInConnection, bundle: dict) -> None:
    access = bundle.get("access_token", "")
    expires_in = int(bundle.get("expires_in", 0) or 0)
    connection.access_token = access
    connection.refresh_token = bundle.get("refresh_token", connection.refresh_token)
    if expires_in:
        connection.token_expires_at = timezone.now() + timedelta(seconds=expires_in)
    connection.connection_status = LinkedInConnection.Status.CONNECTED
    connection.save()


def frontend_redirect_base() -> str:
    return getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
