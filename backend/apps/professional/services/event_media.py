from __future__ import annotations

from django.http import HttpRequest

from apps.commerce.services.storefront import absolute_media_url

from ..models import ProfessionalProgram


def event_image_urls(
    program: ProfessionalProgram,
    request: HttpRequest | None = None,
) -> list[str]:
    """Public URLs for all event photos on a program (max 5 in practice)."""
    urls: list[str] = []

    for row in program.event_images.all():
        if row.image:
            urls.append(_absolute(row.image.url, request))

    if program.event_image and len(urls) < 5:
        legacy = _absolute(program.event_image.url, request)
        if legacy not in urls:
            urls.append(legacy)

    return urls[:5]


def _absolute(path: str, request: HttpRequest | None) -> str:
    if request is not None:
        return request.build_absolute_uri(path)
    return absolute_media_url(path)


def assign_event_media_to_posts(
    program: ProfessionalProgram,
    posts: list,
    *,
    request: HttpRequest | None = None,
) -> None:
    """Attach event photos to the primary event post in an arc."""
    urls = event_image_urls(program, request)
    if not urls or not posts:
        return

    from ..models import ProfessionalPost

    target = next(
        (p for p in posts if p.post_role == ProfessionalPost.PostRole.EVENT),
        posts[0],
    )
    target.media_urls = urls
    target.save(update_fields=["media_urls", "updated_at"])
