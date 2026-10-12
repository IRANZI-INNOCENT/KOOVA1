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
from apps.social.adapters.base import ChannelAdapter, MetaPageGrant, TokenExchange
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


def fit_profile_picture_url(url: str) -> str:
    """Meta CDN URLs with query strings can exceed legacy column limits."""
    cleaned = (url or "").strip()
    if not cleaned:
        return ""
    if len(cleaned) <= 2048:
        return cleaned
    without_query = cleaned.split("?", 1)[0]
    if len(without_query) <= 2048:
        return without_query
    return without_query[:2048]


def get_adapter(platform: str) -> ChannelAdapter:
    """Return the adapter for a platform string."""
    if platform in (
        SocialAccount.Platform.FACEBOOK_PAGE,
        SocialAccount.Platform.INSTAGRAM,
    ):
        return MetaAdapter()
    raise ValueError(f"No adapter for platform: {platform}")


def _pages_from_exchange(exchange: TokenExchange) -> list[MetaPageGrant]:
    if exchange.pages:
        return list(exchange.pages)
    return [
        MetaPageGrant(
            page_id=exchange.page_id,
            page_name=exchange.page_name,
            page_access_token=exchange.page_access_token,
            instagram_account_id=exchange.instagram_account_id,
            instagram_username=exchange.instagram_username,
        ),
    ]


def _connect_facebook_page(
    business: Business,
    adapter: MetaAdapter,
    grant: MetaPageGrant,
    *,
    scopes: list[str],
    expires,
    now,
) -> SocialAccount:
    fb_account, _ = SocialAccount.objects.update_or_create(
        business=business,
        platform=SocialAccount.Platform.FACEBOOK_PAGE,
        platform_account_id=grant.page_id,
        defaults={
            "account_name": grant.page_name,
            "access_token": grant.page_access_token,
            "token_expires_at": expires,
            "scopes": scopes,
            "connection_status": SocialAccount.ConnectionStatus.CONNECTED,
            "connection_error": "",
            "last_verified_at": now,
        },
    )
    sync_account_profile(fb_account)
    fb_account.refresh_from_db()
    _store_baseline(adapter, fb_account)
    SocialAction.objects.create(
        business=business,
        social_account=fb_account,
        action_type=SocialAction.ActionType.VERIFY_CONNECTION,
        action_status=SocialAction.ActionStatus.COMPLETED,
        intent="Connect Facebook Page via OAuth.",
        result=f"Connected {grant.page_name}.",
        requires_approval=False,
    )
    return fb_account


def _connect_instagram_account(
    business: Business,
    adapter: MetaAdapter,
    grant: MetaPageGrant,
    *,
    scopes: list[str],
    expires,
    now,
) -> SocialAccount:
    ig_account, _ = SocialAccount.objects.update_or_create(
        business=business,
        platform=SocialAccount.Platform.INSTAGRAM,
        platform_account_id=grant.instagram_account_id,
        defaults={
            "account_name": grant.instagram_username,
            "account_username": grant.instagram_username,
            "access_token": grant.page_access_token,
            "token_expires_at": expires,
            "scopes": scopes,
            "connection_status": SocialAccount.ConnectionStatus.CONNECTED,
            "connection_error": "",
            "last_verified_at": now,
        },
    )
    sync_account_profile(ig_account)
    ig_account.refresh_from_db()
    _store_baseline(adapter, ig_account)
    SocialAction.objects.create(
        business=business,
        social_account=ig_account,
        action_type=SocialAction.ActionType.VERIFY_CONNECTION,
        action_status=SocialAction.ActionStatus.COMPLETED,
        intent="Connect Instagram Professional via Facebook Page.",
        result=f"Connected @{grant.instagram_username} (via {grant.page_name}).",
        requires_approval=False,
    )
    return ig_account


def connect_meta(
    business: Business,
    code: str,
    redirect_uri: str,
    platform: str = "both",
) -> dict:
    """
    Exchange a Facebook OAuth code and create SocialAccount records.

    Connects every Facebook Page the user granted in Meta Login (not only
    the first). Each Page gets its own token; linked Instagram accounts
    are connected when requested.

    Returns a dict with the connected account(s) for the API response.
    """
    from apps.social.services.page_brains import (
        business_for_page,
        pending_page_payload,
        resolve_target_business_for_new_page,
        upsert_pending_page,
    )

    adapter = MetaAdapter()
    exchange = adapter.exchange_code(code, redirect_uri)
    pages = _pages_from_exchange(exchange)

    now = timezone.now()
    expires = now + timedelta(seconds=exchange.expires_in or 5_184_000)
    scopes = list(exchange.scopes or [])
    connected: list[dict] = []
    pending_pages: list[dict] = []
    seen_ids: set[int] = set()
    want_facebook = platform in {"both", "facebook"}
    want_instagram = platform in {"both", "instagram"}
    owner = business.owner

    def append_account(account: SocialAccount) -> None:
        if account.id in seen_ids:
            return
        seen_ids.add(account.id)
        connected.append(
            {
                "id": account.id,
                "platform": account.platform,
                "account_name": account.account_name or account.account_username,
                "connection_status": account.connection_status,
            },
        )

    if want_instagram and platform == "instagram":
        if not any(p.instagram_account_id for p in pages):
            primary = pages[0]
            raise MetaAdapterError(
                "No Instagram Professional account is linked to any of your "
                "Facebook Pages. Link Instagram to a Page in Meta Business Suite, "
                "then try Connect Instagram again.",
                code="INSTAGRAM_NOT_LINKED_TO_PAGE",
                details={
                    "page_name": primary.page_name,
                    "page_id": primary.page_id,
                },
            )

    if want_facebook:
        for grant in pages:
            target = resolve_target_business_for_new_page(
                owner,
                grant.page_id,
                business,
            )
            if target is None:
                pending = upsert_pending_page(
                    owner,
                    grant,
                    scopes=scopes,
                    expires=expires,
                )
                pending_pages.append(pending_page_payload(pending))
                continue
            fb_account = _connect_facebook_page(
                target,
                adapter,
                grant,
                scopes=scopes,
                expires=expires,
                now=now,
            )
            if target.id == business.id:
                append_account(fb_account)

    if want_instagram:
        for grant in pages:
            if not grant.instagram_account_id:
                continue
            ig_business = business_for_page(owner, grant.page_id)
            if not ig_business:
                continue
            ig_account = _connect_instagram_account(
                ig_business,
                adapter,
                grant,
                scopes=scopes,
                expires=expires,
                now=now,
            )
            if ig_business.id == business.id:
                append_account(ig_account)

    return {"accounts": connected, "pending_pages": pending_pages}


def instagram_link_status(business: Business) -> dict:
    """
    Report whether the connected Facebook Page has a linked Instagram
    Professional account (via Graph API), and whether Kova already stores IG.
    """

    fb_accounts = list(
        SocialAccount.objects.filter(
            business=business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        ).order_by("-updated_at"),
    )
    fb_account = fb_accounts[0] if fb_accounts else None

    ig_connected = SocialAccount.objects.filter(
        business=business,
        platform=SocialAccount.Platform.INSTAGRAM,
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    ).exists()

    facebook_pages = [
        {
            "id": account.platform_account_id,
            "name": account.account_name,
        }
        for account in fb_accounts
    ]

    if not fb_account or not fb_account.access_token:
        return {
            "facebook_connected": False,
            "facebook_page_count": 0,
            "facebook_pages": [],
            "instagram_linked_to_page": False,
            "instagram_connected_in_kova": ig_connected,
            "facebook_page_name": "",
            "facebook_page_id": "",
            "instagram_username": "",
        }

    adapter = MetaAdapter()
    ig_id = ""
    ig_username = ""
    any_page_has_ig = False
    for account in fb_accounts:
        try:
            page_ig_id, page_ig_user = adapter._get_instagram_account(
                account.platform_account_id,
                account.access_token,
            )
        except Exception:
            continue
        if page_ig_id:
            any_page_has_ig = True
            if not ig_id:
                ig_id = page_ig_id
                ig_username = page_ig_user

    return {
        "facebook_connected": True,
        "facebook_page_count": len(fb_accounts),
        "facebook_pages": facebook_pages,
        "facebook_page_name": fb_account.account_name,
        "facebook_page_id": fb_account.platform_account_id,
        "instagram_linked_to_page": any_page_has_ig or bool(ig_id),
        "instagram_username": ig_username,
        "instagram_connected_in_kova": ig_connected,
    }


def backfill_missing_profiles(accounts) -> None:
    """Refresh profile photos and names for connected accounts missing pictures."""
    for account in accounts:
        if (
            account.connection_status
            == SocialAccount.ConnectionStatus.CONNECTED
            and not account.profile_picture_url
            and account.access_token
        ):
            sync_account_profile(account)
            account.refresh_from_db()


def sync_account_profile(account: SocialAccount) -> bool:
    """
    Refresh name, username, and profile picture from the platform API.
    """
    if (
        not account.access_token
        or account.connection_status == SocialAccount.ConnectionStatus.REVOKED
    ):
        return False
    try:
        adapter = get_adapter(account.platform)
        info = adapter.get_account_info(account)
    except Exception:
        return False

    update_fields: list[str] = []
    if info.profile_picture_url:
        account.profile_picture_url = fit_profile_picture_url(
            info.profile_picture_url,
        )
        update_fields.append("profile_picture_url")
    if info.name:
        account.account_name = info.name
        update_fields.append("account_name")
    if info.username:
        account.account_username = info.username
        update_fields.append("account_username")
    if info.metadata:
        merged = dict(account.metadata or {})
        merged.update(info.metadata)
        account.metadata = merged
        update_fields.append("metadata")

    if not update_fields:
        return False

    update_fields.append("updated_at")
    try:
        account.save(update_fields=update_fields)
    except Exception:
        if "profile_picture_url" not in update_fields:
            raise
        account.profile_picture_url = ""
        trimmed = [f for f in update_fields if f != "profile_picture_url"]
        if len(trimmed) > 1:
            account.save(update_fields=trimmed)
        return False
    return True


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
        sync_account_profile(account)
        if "profile_picture_url" not in update_fields:
            update_fields.extend(
                [
                    f
                    for f in (
                        "profile_picture_url",
                        "account_name",
                        "account_username",
                        "metadata",
                    )
                    if f not in update_fields
                ],
            )
    else:
        account.connection_status = SocialAccount.ConnectionStatus.EXPIRED
        account.connection_error = "Token verification failed."

    account.save(update_fields=update_fields)
    return valid
