"""Publish owner-uploaded short videos to connected Meta channels."""

from __future__ import annotations

from apps.businesses.models import Business
from apps.commerce.services.storefront import absolute_media_url
from apps.content.models import Content, ContentBatch, OwnerMediaAsset
from apps.content.services.campaign import get_connected_channels
from apps.social.models import SocialAccount


def create_content_from_owner_video(
    business: Business,
    asset: OwnerMediaAsset,
    *,
    caption: str = "",
    platform: str = "all",
) -> dict:
    if asset.media_type != OwnerMediaAsset.MediaType.VIDEO:
        raise ValueError("That file is not a video.")

    video_url = absolute_media_url(asset.file.url)
    accounts = get_connected_channels(business)
    chosen = (platform or "all").strip().lower()

    batch = ContentBatch.objects.create(
        business=business,
        product=None,
        brief=(caption or "Owner video").strip()[:2000],
        kind=ContentBatch.Kind.OWNER_VIDEO,
    )

    pieces: list[dict] = []
    for account in accounts:
        account_platform = (
            "facebook"
            if account.platform == SocialAccount.Platform.FACEBOOK_PAGE
            else "instagram"
            if account.platform == SocialAccount.Platform.INSTAGRAM
            else ""
        )
        if chosen not in {"", "all"} and account_platform != chosen:
            continue

        content_type = (
            Content.ContentType.REEL
            if account.platform == SocialAccount.Platform.INSTAGRAM
            else Content.ContentType.POST
        )
        content = Content.objects.create(
            business=business,
            batch=batch,
            social_account=account,
            platform=account_platform or Content.Platform.OTHER,
            content_type=content_type,
            caption=(caption or " ")[:4000],
            media_urls=[video_url],
            created_by_ai=False,
            status=Content.Status.DRAFT,
        )
        pieces.append({
            "id": content.id,
            "account_id": account.id,
            "account_name": account.account_name or account.account_username,
            "platform": content.platform,
            "content_type": content.content_type,
            "caption": content.caption,
            "media_urls": content.media_urls,
            "status": content.status,
        })

    if not pieces:
        batch.delete()
        raise ValueError("Connect Facebook or Instagram to publish this video.")

    return {
        "batch_id": str(batch.id),
        "kind": batch.kind,
        "asset_id": str(asset.id),
        "video_url": video_url,
        "pieces": pieces,
    }
