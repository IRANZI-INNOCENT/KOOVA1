"""
Meta channel adapter — Facebook Pages and Instagram Professional accounts.

This adapter talks to the Meta Graph API.  It requires a Meta App
(FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in the environment).

The adapter handles:
- OAuth code exchange for user tokens
- User token → long-lived token → page token
- Facebook Page publishing via /{page-id}/feed
- Instagram publishing via the Content Publishing API
- Token verification and refresh
- Post metrics via Insights

Meta API constraints this adapter respects:
- Instagram Content Publishing requires an IG Professional account
  linked to a Facebook Page.
- Page tokens obtained from a system user do not expire.
- User tokens expire; we exchange for long-lived tokens (60 days).
- Publishing images to Instagram is a two-step process (create
  container, then publish).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

import requests
from django.conf import settings

from apps.social.models import SocialAccount

from .base import (
    AccountInfo,
    ChannelAdapter,
    PublishResult,
    TokenExchange,
)


GRAPH_URL = "https://graph.facebook.com/v21.0"


def _local_media_path(url: str) -> str | None:
    """Return the file on disk when the image is one Kova stored."""
    raw = unquote(urlparse(url).path if "://" in url else url).lstrip("/")
    prefix = settings.MEDIA_URL.lstrip("/")
    if not raw.startswith(prefix):
        return None
    relative = raw[len(prefix):].lstrip("/")
    full = Path(settings.MEDIA_ROOT) / relative
    if full.is_file():
        return str(full)
    return None


def _app_id() -> str:
    return os.getenv("FACEBOOK_APP_ID", "")


def _app_secret() -> str:
    return os.getenv("FACEBOOK_APP_SECRET", "")


class MetaAdapterError(Exception):
    """Meta Graph / Login error with a stable code for the Channels UI."""

    def __init__(
        self,
        message: str,
        *,
        code: str = "META_ADAPTER_ERROR",
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.code = code
        self.details = details or {}


class MetaAdapter(ChannelAdapter):
    """
    Adapter for Facebook Pages and Instagram Professional accounts.
    """

    # ------------------------------------------------------------------ #
    # OAuth
    # ------------------------------------------------------------------ #

    def exchange_code(self, code: str, redirect_uri: str) -> TokenExchange:
        """
        Exchange a Facebook login code for tokens.

        Steps:
        1. Code → short-lived user token
        2. Short-lived → long-lived user token
        3. Long-lived user token → page access token
        4. Discover linked Instagram account (if any)
        """
        short_token = self._code_to_short_token(code, redirect_uri)
        long_token = self._short_to_long_token(short_token)
        pages = self._get_pages(long_token)

        if not pages:
            raise MetaAdapterError(
                "No Facebook Pages found.  The user must be an admin of "
                "at least one Page."
            )

        page = pages[0]
        page_token = page.get("access_token", "")
        page_id = page.get("id", "")
        page_name = page.get("name", "")

        ig_id = ""
        ig_username = ""
        try:
            ig_id, ig_username = self._get_instagram_account(page_id, page_token)
        except Exception:
            pass

        scopes = self._granted_scopes(long_token, page_token)

        return TokenExchange(
            access_token=long_token,
            expires_in=60 * 60 * 24 * 60,
            scopes=scopes,
            page_id=page_id,
            page_name=page_name,
            page_access_token=page_token,
            instagram_account_id=ig_id,
            instagram_username=ig_username,
        )

    # ------------------------------------------------------------------ #
    # Account info
    # ------------------------------------------------------------------ #

    def get_account_info(self, account: SocialAccount) -> AccountInfo:
        token = account.access_token
        if account.platform == SocialAccount.Platform.INSTAGRAM:
            return self._ig_account_info(account.platform_account_id, token)
        return self._fb_page_info(account.platform_account_id, token)

    # ------------------------------------------------------------------ #
    # Verify connection
    # ------------------------------------------------------------------ #

    def verify_connection(self, account: SocialAccount) -> bool:
        try:
            resp = requests.get(
                f"{GRAPH_URL}/debug_token",
                params={
                    "input_token": account.access_token,
                    "access_token": f"{_app_id()}|{_app_secret()}",
                },
                timeout=10,
            )
            data = resp.json().get("data", {})
            return data.get("is_valid", False)
        except Exception:
            return False

    def refresh_granted_scopes(self, account: SocialAccount) -> list[str]:
        """Read scopes Meta actually granted for the stored token."""

        return self._granted_scopes(account.access_token)

    # ------------------------------------------------------------------ #
    # Publish
    # ------------------------------------------------------------------ #

    def publish_post(
        self,
        account: SocialAccount,
        caption: str,
        *,
        image_url: str = "",
        video_url: str = "",
        link: str = "",
    ) -> PublishResult:
        if video_url:
            if account.platform == SocialAccount.Platform.INSTAGRAM:
                return self._ig_video_reel(account, caption, video_url=video_url)
            return self._fb_video(account, caption, video_url=video_url)
        if account.platform == SocialAccount.Platform.INSTAGRAM:
            return self._ig_publish(account, caption, image_url=image_url)
        return self._fb_publish(account, caption, link=link, image_url=image_url)

    # ------------------------------------------------------------------ #
    # Token refresh
    # ------------------------------------------------------------------ #

    def refresh_token(self, account: SocialAccount) -> str:
        new_token = self._short_to_long_token(account.access_token)
        return new_token

    # ------------------------------------------------------------------ #
    # Post metrics
    # ------------------------------------------------------------------ #

    def send_reply(
        self,
        account: SocialAccount,
        *,
        kind: str,
        target_id: str,
        body: str,
    ) -> PublishResult:
        """Reply to a comment, or send a direct message, on the connected account."""
        if not target_id:
            return PublishResult(success=False, error="This item has no platform id to reply to.")
        if kind == "comment":
            edge = "replies" if account.platform == SocialAccount.Platform.INSTAGRAM else "comments"
            resp = requests.post(
                f"{GRAPH_URL}/{target_id}/{edge}",
                data={"message": body, "access_token": account.access_token},
                timeout=30,
            )
        else:
            resp = requests.post(
                f"{GRAPH_URL}/{account.platform_account_id}/messages",
                json={
                    "recipient": {"id": target_id},
                    "message": {"text": body},
                    "messaging_type": "RESPONSE",
                },
                params={"access_token": account.access_token},
                timeout=30,
            )
        try:
            data = resp.json()
        except ValueError:
            return PublishResult(success=False, error="The platform returned an unreadable response.")
        external_id = str(data.get("id") or data.get("message_id") or "")
        if resp.ok and external_id:
            return PublishResult(success=True, external_post_id=external_id, raw_response=data)
        error = data.get("error", {}).get("message") if isinstance(data.get("error"), dict) else ""
        return PublishResult(
            success=False,
            error=error or "The platform did not accept the reply.",
            raw_response=data,
        )

    def list_recent_posts(self, account: SocialAccount) -> list[dict[str, str]]:
        """Read a short baseline of posts already on the account."""
        if account.platform == SocialAccount.Platform.INSTAGRAM:
            fields = "id,caption,timestamp"
            edge = "media"
        else:
            fields = "id,message,created_time"
            edge = "posts"
        resp = requests.get(
            f"{GRAPH_URL}/{account.platform_account_id}/{edge}",
            params={
                "fields": fields,
                "limit": 5,
                "access_token": account.access_token,
            },
            timeout=15,
        )
        payload = resp.json()
        found: list[dict[str, str]] = []
        for item in payload.get("data") or []:
            text = (item.get("caption") or item.get("message") or "").strip()
            found.append({
                "id": str(item.get("id") or ""),
                "text": text[:180],
                "created_time": str(item.get("timestamp") or item.get("created_time") or ""),
            })
        return found

    def list_recent_comments(self, account: SocialAccount) -> list[dict[str, str]]:
        """Read recent comments on the Page or Instagram account."""
        if account.platform == SocialAccount.Platform.INSTAGRAM:
            fields = "comments.limit(5){id,text,username}"
            edge = "media"
        else:
            fields = "comments.limit(5){id,message,from}"
            edge = "posts"
        resp = requests.get(
            f"{GRAPH_URL}/{account.platform_account_id}/{edge}",
            params={
                "fields": fields,
                "limit": 5,
                "access_token": account.access_token,
            },
            timeout=15,
        )
        payload = resp.json()
        found: list[dict[str, str]] = []
        for item in payload.get("data") or []:
            for comment in (item.get("comments") or {}).get("data") or []:
                text = (comment.get("text") or comment.get("message") or "").strip()
                author = comment.get("from") if isinstance(comment.get("from"), dict) else {}
                name = comment.get("username") or author.get("name") or ""
                comment_id = str(comment.get("id") or "")
                if text and comment_id:
                    found.append({"id": comment_id, "text": text, "name": name})
        return found

    def get_post_metrics(
        self,
        account: SocialAccount,
        external_post_id: str,
    ) -> dict[str, int]:
        if account.platform == SocialAccount.Platform.INSTAGRAM:
            return self._ig_metrics(account, external_post_id)
        return self._fb_metrics(account, external_post_id)

    # ================================================================== #
    # Private helpers
    # ================================================================== #

    @staticmethod
    def _granted_scopes(*tokens: str) -> list[str]:
        app_token = f"{_app_id()}|{_app_secret()}"
        found: set[str] = set()
        for token in tokens:
            if not token:
                continue
            try:
                resp = requests.get(
                    f"{GRAPH_URL}/debug_token",
                    params={
                        "input_token": token,
                        "access_token": app_token,
                    },
                    timeout=15,
                )
                data = resp.json().get("data", {})
                for scope in data.get("scopes") or []:
                    if isinstance(scope, str) and scope.strip():
                        found.add(scope.strip())
                for item in data.get("granular_scopes") or []:
                    if isinstance(item, dict):
                        scope = str(item.get("scope") or "").strip()
                        if scope:
                            found.add(scope)
            except Exception:
                continue
        return sorted(found)

    @staticmethod
    def _code_to_short_token(code: str, redirect_uri: str) -> str:
        resp = requests.get(
            f"{GRAPH_URL}/oauth/access_token",
            params={
                "client_id": _app_id(),
                "client_secret": _app_secret(),
                "redirect_uri": redirect_uri,
                "code": code,
            },
            timeout=15,
        )
        data = resp.json()
        token = data.get("access_token")
        if not token:
            raise MetaAdapterError(
                data.get("error", {}).get("message", "Could not exchange code.")
            )
        return token

    @staticmethod
    def _short_to_long_token(short_token: str) -> str:
        resp = requests.get(
            f"{GRAPH_URL}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": _app_id(),
                "client_secret": _app_secret(),
                "fb_exchange_token": short_token,
            },
            timeout=15,
        )
        data = resp.json()
        token = data.get("access_token")
        if not token:
            raise MetaAdapterError("Could not exchange for a long-lived token.")
        return token

    @staticmethod
    def _get_pages(user_token: str) -> list[dict[str, Any]]:
        resp = requests.get(
            f"{GRAPH_URL}/me/accounts",
            params={"access_token": user_token},
            timeout=15,
        )
        return resp.json().get("data", [])

    @staticmethod
    def _get_instagram_account(
        page_id: str,
        page_token: str,
    ) -> tuple[str, str]:
        resp = requests.get(
            f"{GRAPH_URL}/{page_id}",
            params={
                "fields": "instagram_business_account",
                "access_token": page_token,
            },
            timeout=15,
        )
        ig = resp.json().get("instagram_business_account", {})
        ig_id = ig.get("id", "")
        if not ig_id:
            return "", ""
        info = requests.get(
            f"{GRAPH_URL}/{ig_id}",
            params={
                "fields": "username",
                "access_token": page_token,
            },
            timeout=15,
        ).json()
        return ig_id, info.get("username", "")

    @staticmethod
    def _fb_page_info(page_id: str, token: str) -> AccountInfo:
        resp = requests.get(
            f"{GRAPH_URL}/{page_id}",
            params={
                "fields": "name,username,picture,fan_count,category",
                "access_token": token,
            },
            timeout=15,
        )
        data = resp.json()
        pic = data.get("picture", {}).get("data", {}).get("url", "")
        return AccountInfo(
            platform_account_id=page_id,
            name=data.get("name", ""),
            username=data.get("username", ""),
            profile_picture_url=pic,
            followers=data.get("fan_count", 0),
            metadata={"category": data.get("category", "")},
        )

    @staticmethod
    def _ig_account_info(ig_id: str, token: str) -> AccountInfo:
        resp = requests.get(
            f"{GRAPH_URL}/{ig_id}",
            params={
                "fields": "username,name,profile_picture_url,followers_count",
                "access_token": token,
            },
            timeout=15,
        )
        data = resp.json()
        return AccountInfo(
            platform_account_id=ig_id,
            name=data.get("name", ""),
            username=data.get("username", ""),
            profile_picture_url=data.get("profile_picture_url", ""),
            followers=data.get("followers_count", 0),
        )

    @staticmethod
    def _fb_publish(
        account: SocialAccount,
        caption: str,
        *,
        link: str = "",
        image_url: str = "",
    ) -> PublishResult:
        if image_url:
            return MetaAdapter._fb_photo(account, caption, image_url)
        payload: dict[str, str] = {
            "message": caption,
            "access_token": account.access_token,
        }
        if link:
            payload["link"] = link
        resp = requests.post(
            f"{GRAPH_URL}/{account.platform_account_id}/feed",
            data=payload,
            timeout=30,
        )
        data = resp.json()
        if "id" in data:
            return PublishResult(
                success=True,
                external_post_id=data["id"],
                raw_response=data,
            )
        return PublishResult(
            success=False,
            error=data.get("error", {}).get("message", "Publishing failed."),
            raw_response=data,
        )

    @staticmethod
    def _fb_photo(account: SocialAccount, caption: str, image_url: str) -> PublishResult:
        """Publish a Page photo, uploading the product file when it lives on this server."""
        data: dict[str, str] = {
            "message": caption,
            "access_token": account.access_token,
            "published": "true",
        }
        local_path = _local_media_path(image_url)
        photo_file = None
        files = None
        if local_path:
            photo_file = open(local_path, "rb")
            files = {"source": (os.path.basename(local_path), photo_file)}
        elif image_url.startswith("http://") or image_url.startswith("https://"):
            data["url"] = image_url
        else:
            return PublishResult(
                success=False,
                error="Kova could not find the product image to send with this post.",
            )
        try:
            resp = requests.post(
                f"{GRAPH_URL}/{account.platform_account_id}/photos",
                data=data,
                files=files,
                timeout=60,
            )
            body = resp.json()
        finally:
            if photo_file is not None:
                photo_file.close()
        external_id = str(body.get("post_id") or body.get("id") or "")
        if external_id:
            return PublishResult(success=True, external_post_id=external_id, raw_response=body)
        error = body.get("error", {}).get("message") if isinstance(body.get("error"), dict) else ""
        return PublishResult(
            success=False,
            error=error or "Facebook did not accept the photo.",
            raw_response=body,
        )

    @staticmethod
    def _ig_video_reel(
        account: SocialAccount,
        caption: str,
        *,
        video_url: str,
    ) -> PublishResult:
        if not video_url:
            return PublishResult(
                success=False,
                error="Instagram Reels require a public video URL.",
            )
        token = account.access_token
        ig_id = account.platform_account_id
        container = requests.post(
            f"{GRAPH_URL}/{ig_id}/media",
            data={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "access_token": token,
            },
            timeout=120,
        ).json()
        creation_id = container.get("id")
        if not creation_id:
            return PublishResult(
                success=False,
                error=container.get("error", {}).get(
                    "message",
                    "Video container creation failed.",
                ),
                raw_response=container,
            )
        publish_resp = requests.post(
            f"{GRAPH_URL}/{ig_id}/media_publish",
            data={
                "creation_id": creation_id,
                "access_token": token,
            },
            timeout=120,
        ).json()
        post_id = publish_resp.get("id", "")
        if post_id:
            return PublishResult(
                success=True,
                external_post_id=post_id,
                raw_response=publish_resp,
            )
        return PublishResult(
            success=False,
            error=publish_resp.get("error", {}).get("message", "Publish step failed."),
            raw_response=publish_resp,
        )

    @staticmethod
    def _fb_video(
        account: SocialAccount,
        caption: str,
        *,
        video_url: str,
    ) -> PublishResult:
        data: dict[str, str] = {
            "description": caption,
            "access_token": account.access_token,
        }
        local_path = _local_media_path(video_url)
        video_file = None
        files = None
        if local_path:
            video_file = open(local_path, "rb")
            files = {"source": (os.path.basename(local_path), video_file)}
        elif video_url.startswith("http://") or video_url.startswith("https://"):
            data["file_url"] = video_url
        else:
            return PublishResult(
                success=False,
                error="Kova could not find the video file to publish.",
            )
        try:
            resp = requests.post(
                f"{GRAPH_URL}/{account.platform_account_id}/videos",
                data=data,
                files=files,
                timeout=180,
            )
            body = resp.json()
        finally:
            if video_file is not None:
                video_file.close()
        external_id = str(body.get("id") or "")
        if external_id:
            return PublishResult(success=True, external_post_id=external_id, raw_response=body)
        error = body.get("error", {}).get("message") if isinstance(body.get("error"), dict) else ""
        return PublishResult(
            success=False,
            error=error or "Facebook did not accept the video.",
            raw_response=body,
        )

    @staticmethod
    def _ig_publish(
        account: SocialAccount,
        caption: str,
        *,
        image_url: str = "",
    ) -> PublishResult:
        if not image_url:
            return PublishResult(
                success=False,
                error="Instagram requires an image URL to publish.",
            )
        token = account.access_token
        ig_id = account.platform_account_id
        container = requests.post(
            f"{GRAPH_URL}/{ig_id}/media",
            data={
                "image_url": image_url,
                "caption": caption,
                "access_token": token,
            },
            timeout=30,
        ).json()
        creation_id = container.get("id")
        if not creation_id:
            return PublishResult(
                success=False,
                error=container.get("error", {}).get("message", "Container creation failed."),
                raw_response=container,
            )
        publish_resp = requests.post(
            f"{GRAPH_URL}/{ig_id}/media_publish",
            data={
                "creation_id": creation_id,
                "access_token": token,
            },
            timeout=30,
        ).json()
        post_id = publish_resp.get("id", "")
        if post_id:
            return PublishResult(
                success=True,
                external_post_id=post_id,
                raw_response=publish_resp,
            )
        return PublishResult(
            success=False,
            error=publish_resp.get("error", {}).get("message", "Publish step failed."),
            raw_response=publish_resp,
        )

    @staticmethod
    def _read_json(resp) -> dict:
        try:
            data = resp.json()
        except ValueError:
            return {}
        return data if isinstance(data, dict) else {}

    @staticmethod
    def _insight_values(account: SocialAccount, post_id: str, metric: str) -> dict[str, int]:
        resp = requests.get(
            f"{GRAPH_URL}/{post_id}/insights",
            params={"metric": metric, "access_token": account.access_token},
            timeout=12,
        )
        data = MetaAdapter._read_json(resp)
        if data.get("error"):
            return {}
        found: dict[str, int] = {}
        for item in data.get("data") or []:
            name = str(item.get("name") or "")
            values = item.get("values") or [{}]
            raw = values[0].get("value", 0) if values else 0
            if isinstance(raw, dict):
                raw = raw.get("value", 0)
            try:
                found[name] = int(raw or 0)
            except (TypeError, ValueError):
                found[name] = 0
        return found

    @staticmethod
    def _fb_metrics(account: SocialAccount, post_id: str) -> dict[str, int]:
        resp = requests.get(
            f"{GRAPH_URL}/{post_id}",
            params={
                "fields": "likes.summary(true),comments.summary(true),shares,reactions.summary(true)",
                "access_token": account.access_token,
            },
            timeout=12,
        )
        data = MetaAdapter._read_json(resp)
        likes = int(((data.get("likes") or {}).get("summary") or {}).get("total_count") or 0)
        reactions = int(((data.get("reactions") or {}).get("summary") or {}).get("total_count") or 0)
        comments = int(((data.get("comments") or {}).get("summary") or {}).get("total_count") or 0)
        shares = int(((data.get("shares") or {}).get("count")) or 0)
        insights = MetaAdapter._insight_values(
            account,
            post_id,
            "post_media_view,post_clicks,post_impressions_unique",
        )
        if not insights:
            insights = MetaAdapter._insight_values(
                account,
                post_id,
                "post_impressions,post_impressions_unique,post_clicks",
            )
        return {
            "likes": likes or reactions,
            "comments_count": comments,
            "shares": shares,
            "impressions": insights.get("post_media_view") or insights.get("post_impressions") or 0,
            "reach": insights.get("post_impressions_unique") or 0,
            "clicks": insights.get("post_clicks") or 0,
        }

    @staticmethod
    def _ig_metrics(account: SocialAccount, post_id: str) -> dict[str, int]:
        media = MetaAdapter._read_json(requests.get(
            f"{GRAPH_URL}/{post_id}",
            params={
                "fields": "like_count,comments_count",
                "access_token": account.access_token,
            },
            timeout=12,
        ))
        insights = MetaAdapter._insight_values(
            account,
            post_id,
            "reach,views,likes,comments,shares",
        )
        if not insights:
            insights = MetaAdapter._insight_values(
                account,
                post_id,
                "reach,impressions,likes,comments,shares",
            )
        return {
            "likes": insights.get("likes", int(media.get("like_count") or 0)),
            "comments_count": insights.get("comments", int(media.get("comments_count") or 0)),
            "shares": insights.get("shares", 0),
            "impressions": insights.get("views", insights.get("impressions", 0)),
            "reach": insights.get("reach", 0),
            "clicks": 0,
        }
