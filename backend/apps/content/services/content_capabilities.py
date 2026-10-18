"""What Kova can create and publish for a business (beyond Meta OAuth scopes)."""

from __future__ import annotations

from apps.businesses.models import Business
from apps.content.services.kenya_relatable import (
    is_kenya_relatable_enabled,
    organic_themes_for_business,
)
from apps.social.models import SocialAccount
from apps.social.services.capabilities import account_capabilities


def business_content_capabilities(business: Business) -> dict:
    accounts = list(
        SocialAccount.objects.filter(
            business=business,
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        ),
    )
    has_meta = any(
        a.platform
        in (
            SocialAccount.Platform.FACEBOOK_PAGE,
            SocialAccount.Platform.INSTAGRAM,
        )
        for a in accounts
    )
    granted_video = has_meta and any(
        "pages_manage_posts" in (a.scopes or [])
        or "instagram_content_publish" in (a.scopes or [])
        for a in accounts
    )
    kenya_relatable = is_kenya_relatable_enabled(business)

    return {
        "product_campaigns": has_meta,
        "organic_campaigns": has_meta,
        "organic_themes": organic_themes_for_business(business),
        "kenya_relatable_mode": kenya_relatable,
        "reel_skit_briefs": kenya_relatable,
        "owner_video_upload": has_meta,
        "video_publish": granted_video,
        "autopilot": {
            "product_posts": has_meta,
            "organic_posts": has_meta,
            "owner_videos": granted_video,
        },
        "accounts": [
            {
                "id": account.id,
                "platform": account.platform,
                "name": account.account_name or account.account_username,
                "capabilities": account_capabilities(account),
            }
            for account in accounts
        ],
    }
