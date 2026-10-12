"""
One Business Brain per Facebook Page.

The first Page connected to a business stays on that brain. Additional
Pages from the same Meta Login are held as pending until the owner
assigns each Page to its own (new or existing) business.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.businesses.models import Business
from apps.businesses.services.provisioning import BusinessProvisioningService
from apps.social.adapters.base import MetaPageGrant
from apps.social.models import PendingMetaPageGrant, SocialAccount

from .connection import (
    _connect_facebook_page,
    _connect_instagram_account,
    get_adapter,
)

User = get_user_model()


class PageBrainError(Exception):
    def __init__(self, message: str, *, code: str = "page_brain_error"):
        super().__init__(message)
        self.code = code


def business_has_facebook_page(business: Business) -> bool:
    return SocialAccount.objects.filter(
        business=business,
        platform=SocialAccount.Platform.FACEBOOK_PAGE,
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    ).exists()


def find_facebook_page_account(
    owner,
    page_id: str,
) -> SocialAccount | None:
    return (
        SocialAccount.objects.filter(
            business__owner=owner,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id=page_id,
        )
        .select_related("business")
        .first()
    )


def business_for_page(owner, page_id: str) -> Business | None:
    account = find_facebook_page_account(owner, page_id)
    return account.business if account else None


def upsert_pending_page(
    owner,
    grant: MetaPageGrant,
    *,
    scopes: list[str],
    expires,
) -> PendingMetaPageGrant:
    pending, _ = PendingMetaPageGrant.objects.update_or_create(
        owner=owner,
        page_id=grant.page_id,
        defaults={
            "page_name": grant.page_name,
            "page_access_token": grant.page_access_token,
            "token_expires_at": expires,
            "scopes": scopes,
            "instagram_account_id": grant.instagram_account_id or "",
            "instagram_username": grant.instagram_username or "",
        },
    )
    return pending


def pending_page_payload(pending: PendingMetaPageGrant) -> dict:
    return {
        "id": pending.id,
        "page_id": pending.page_id,
        "page_name": pending.page_name,
        "instagram_username": pending.instagram_username,
        "has_instagram": bool(pending.instagram_account_id),
    }


def resolve_target_business_for_new_page(
    owner,
    page_id: str,
    oauth_business: Business,
) -> Business | None:
    """
    Return the business that should receive this Page, or None → pending.
    """
    existing = find_facebook_page_account(owner, page_id)
    if existing:
        return existing.business
    if not business_has_facebook_page(oauth_business):
        return oauth_business
    return None


def assign_pending_page_to_business(
    owner,
    pending_id: int,
    *,
    business_id: int | None = None,
    new_business_name: str = "",
    connect_instagram: bool = True,
) -> dict:
    pending = PendingMetaPageGrant.objects.filter(
        owner=owner,
        id=pending_id,
    ).first()
    if not pending:
        raise PageBrainError("This Page is no longer waiting for a brain.", code="not_found")

    if business_id is not None:
        business = Business.objects.filter(owner=owner, id=business_id).first()
        if not business:
            raise PageBrainError("Business not found.", code="business_not_found")
    else:
        name = (new_business_name or pending.page_name or "New business").strip()
        if not name:
            raise PageBrainError("Name the new business brain.", code="name_required")
        business = Business.objects.create(
            owner=owner,
            name=name,
            email=owner.email or "",
        )
        BusinessProvisioningService.provision(business)

    if business_has_facebook_page(business):
        raise PageBrainError(
            "This business brain already has a Facebook Page. "
            "Create a new brain for this Page.",
            code="brain_has_page",
        )

    grant = MetaPageGrant(
        page_id=pending.page_id,
        page_name=pending.page_name,
        page_access_token=pending.page_access_token,
        instagram_account_id=pending.instagram_account_id,
        instagram_username=pending.instagram_username,
    )
    adapter = get_adapter(SocialAccount.Platform.FACEBOOK_PAGE)
    now = timezone.now()
    expires = pending.token_expires_at
    scopes = list(pending.scopes or [])

    fb_account = _connect_facebook_page(
        business,
        adapter,
        grant,
        scopes=scopes,
        expires=expires,
        now=now,
    )
    connected = [
        {
            "id": fb_account.id,
            "platform": fb_account.platform,
            "account_name": fb_account.account_name or fb_account.account_username,
            "connection_status": fb_account.connection_status,
        },
    ]

    if connect_instagram and pending.instagram_account_id:
        ig_account = _connect_instagram_account(
            business,
            adapter,
            grant,
            scopes=scopes,
            expires=expires,
            now=now,
        )
        connected.append(
            {
                "id": ig_account.id,
                "platform": ig_account.platform,
                "account_name": ig_account.account_name or ig_account.account_username,
                "connection_status": ig_account.connection_status,
            },
        )

    pending.delete()

    return {
        "business_id": business.id,
        "business_name": business.name,
        "accounts": connected,
    }
