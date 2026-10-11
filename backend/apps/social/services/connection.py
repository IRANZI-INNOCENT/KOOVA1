"""
Social account connection service.

Handles connecting, disconnecting, and verifying social accounts.
The service sits between views and channel adapters so the views
never talk to platform APIs directly.
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.businesses.models import Business
from apps.social.adapters.base import ChannelAdapter
from apps.social.adapters.meta import MetaAdapter, MetaAdapterError
from apps.social.models import SocialAccount, SocialAction


def _store_baseline(adapter: MetaAdapter, account: SocialAccount) -> None:
    try:
        recent = adapter.list_recent_posts(account)
    except Exception:
        return
    if not isinstance(recent, list):
        return
    metadata = dict(account.metadata or {})
    metadata["recent_posts"] = recent[:5]
    account.metadata = metadata
    account.save(update_fields=["metadata", "updated_at"])


def get_adapter(platform: str) -> ChannelAdapter:
    """Return the adapter for a platform string."""
    if platform in (
        SocialAccount.Platform.FACEBOOK_PAGE,
        SocialAccount.Platform.INSTAGRAM,
    ):
        return MetaAdapter()
    raise ValueError(f"No adapter for platform: {platform}")


def connect_meta(
    business: Business,
    code: str,
    redirect_uri: str,
    platform: str = "both",
) -> dict:
    """
    Exchange a Facebook OAuth code and create SocialAccount records.

    Returns a dict with the connected account(s) for the API response.
    """
    adapter = MetaAdapter()
    exchange = adapter.exchange_code(code, redirect_uri)

    now = timezone.now()
    expires = now + timedelta(seconds=exchange.expires_in or 5_184_000)
    connected: list[dict] = []
    want_facebook = platform in {"both", "facebook"}
    want_instagram = platform in {"both", "instagram"}

    if want_instagram and not exchange.instagram_account_id:
        raise MetaAdapterError(
            "No Instagram Professional account is linked to this Facebook Page. "
            "Switch the Instagram account to Professional (Business or Creator), "
            "link it to this Page in Meta Business Suite, then try Connect "
            "Instagram again.",
            code="INSTAGRAM_NOT_LINKED_TO_PAGE",
            details={
                "page_name": exchange.page_name,
                "page_id": exchange.page_id,
            },
        )

    if want_facebook:
        fb_account, _ = SocialAccount.objects.update_or_create(
            business=business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id=exchange.page_id,
            defaults={
                "account_name": exchange.page_name,
                "access_token": exchange.page_access_token,
                "token_expires_at": expires,
                "scopes": exchange.scopes or [],
                "connection_status": SocialAccount.ConnectionStatus.CONNECTED,
                "connection_error": "",
                "last_verified_at": now,
            },
        )
        connected.append({
            "id": fb_account.id,
            "platform": fb_account.platform,
            "account_name": fb_account.account_name,
            "connection_status": fb_account.connection_status,
        })
        _store_baseline(adapter, fb_account)
        SocialAction.objects.create(
            business=business,
            social_account=fb_account,
            action_type=SocialAction.ActionType.VERIFY_CONNECTION,
            action_status=SocialAction.ActionStatus.COMPLETED,
            intent="Connect Facebook Page via OAuth.",
            result=f"Connected {exchange.page_name}.",
            requires_approval=False,
        )

    if want_instagram and exchange.instagram_account_id:
        ig_account, _ = SocialAccount.objects.update_or_create(
            business=business,
            platform=SocialAccount.Platform.INSTAGRAM,
            platform_account_id=exchange.instagram_account_id,
            defaults={
                "account_name": exchange.instagram_username,
                "account_username": exchange.instagram_username,
                "access_token": exchange.page_access_token,
                "token_expires_at": expires,
                "scopes": exchange.scopes or [],
                "connection_status": SocialAccount.ConnectionStatus.CONNECTED,
                "connection_error": "",
                "last_verified_at": now,
            },
        )
        connected.append({
            "id": ig_account.id,
            "platform": ig_account.platform,
            "account_name": ig_account.account_name or ig_account.account_username,
            "connection_status": ig_account.connection_status,
        })

        _store_baseline(adapter, ig_account)
        SocialAction.objects.create(
            business=business,
            social_account=ig_account,
            action_type=SocialAction.ActionType.VERIFY_CONNECTION,
            action_status=SocialAction.ActionStatus.COMPLETED,
            intent="Connect Instagram Professional via Facebook Page.",
            result=f"Connected @{exchange.instagram_username}.",
            requires_approval=False,
        )

    return {"accounts": connected}


def instagram_link_status(business: Business) -> dict:
    """
    Report whether the connected Facebook Page has a linked Instagram
    Professional account (via Graph API), and whether Kova already stores IG.
    """

    fb_account = (
        SocialAccount.objects.filter(
            business=business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        .order_by("-updated_at")
        .first()
    )

    ig_connected = SocialAccount.objects.filter(
        business=business,
        platform=SocialAccount.Platform.INSTAGRAM,
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    ).exists()

    if not fb_account or not fb_account.access_token:
        return {
            "facebook_connected": False,
            "instagram_linked_to_page": False,
            "instagram_connected_in_kova": ig_connected,
            "facebook_page_name": "",
            "instagram_username": "",
        }

    adapter = MetaAdapter()
    ig_id = ""
    ig_username = ""
    try:
        ig_id, ig_username = adapter._get_instagram_account(
            fb_account.platform_account_id,
            fb_account.access_token,
        )
    except Exception:
        pass

    return {
        "facebook_connected": True,
        "facebook_page_name": fb_account.account_name,
        "facebook_page_id": fb_account.platform_account_id,
        "instagram_linked_to_page": bool(ig_id),
        "instagram_username": ig_username,
        "instagram_connected_in_kova": ig_connected,
    }


def disconnect_account(account: SocialAccount) -> None:
    """Mark an account as revoked and clear its token."""
    account.access_token = ""
    account.connection_status = SocialAccount.ConnectionStatus.REVOKED
    account.save(update_fields=["access_token", "connection_status", "updated_at"])

    SocialAction.objects.create(
        business=account.business,
        social_account=account,
        action_type=SocialAction.ActionType.VERIFY_CONNECTION,
        action_status=SocialAction.ActionStatus.COMPLETED,
        intent="Disconnect social account.",
        result=f"Disconnected {account.account_name}.",
        requires_approval=False,
    )


def verify_account(account: SocialAccount) -> bool:
    """Check whether the stored token is still valid."""
    try:
        adapter = get_adapter(account.platform)
    except ValueError:
        return False

    valid = adapter.verify_connection(account)
    now = timezone.now()
    account.last_verified_at = now

    update_fields = [
        "connection_status",
        "connection_error",
        "last_verified_at",
        "updated_at",
    ]
    refresh_scopes = getattr(adapter, "refresh_granted_scopes", None)
    if callable(refresh_scopes):
        scopes = refresh_scopes(account)
        if scopes:
            account.scopes = scopes
            update_fields.append("scopes")

    if valid:
        account.connection_status = SocialAccount.ConnectionStatus.CONNECTED
        account.connection_error = ""
    else:
        account.connection_status = SocialAccount.ConnectionStatus.EXPIRED
        account.connection_error = "Token verification failed."

    account.save(update_fields=update_fields)
    return valid
