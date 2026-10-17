"""
Autopilot shift.

The owner has handed Kova the company. A shift reads the brand and
profile, plans the day, then does the work: polish a listing, write
and schedule a post, answer waiting customers, and file the report.
"""

from __future__ import annotations

import json
from datetime import timedelta

from django.utils import timezone

from apps.brief.models import MorningBrief
from apps.business_brain.models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessPolicy,
    BusinessProfile,
)
from apps.businesses.models import Business
from apps.commerce.models import Product
from apps.content.services.campaign import draft_campaign
from apps.content.services.schedule import schedule_posts
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService
from apps.social.models import AutopilotEvent, AutopilotShift, SocialMessage
from apps.social.services.command import _quiet_products, _waiting_messages
from apps.social.services.inbox import draft_reply, send_reply
from apps.social.services.publish import dispatch_due, refresh_due_metrics

HOLD_FOR = timedelta(minutes=20)


def latest_shift(business: Business) -> AutopilotShift | None:
    return business.autopilot_shifts.first()


def shift_work(business: Business, shift: AutopilotShift) -> dict:
    """Facts from one shift: posts, replies, listings, and the report."""
    end = (shift.finished_at or timezone.now()) + timedelta(seconds=15)
    start = shift.started_at - timedelta(seconds=2)
    events = list(shift.events.all())

    posts = _post_items(business, start, end)
    if not posts:
        posts = _items_from_events(events, _post_event)

    replies = _reply_items(business, start, end)
    if not replies:
        replies = _items_from_events(events, _reply_event)

    listings = _items_from_events(events, _listing_event)
    report = _items_from_events(events, _report_event)[:1]
    stopped = next((event.detail[:180] for event in events if event.title == "The shift stopped"), "")

    return {
        "summary": {
            "posts": _count_label(posts),
            "replies": _count_label(replies, empty="Clear"),
            "listings": _listing_label(listings),
            "report": _report_label(report),
        },
        "posts": posts,
        "replies": replies,
        "listings": listings,
        "report": report,
        "stopped": stopped,
    }


def _count_label(items: list[dict], empty: str = "0") -> str:
    done = [item for item in items if item["state"] not in {"clear"}]
    return str(len(done)) if done else empty


def _listing_label(items: list[dict]) -> str:
    done = [item for item in items if item["state"] == "done"]
    if done:
        return str(len(done))
    if any(item["state"] == "failed" for item in items):
        return "Check"
    return "Ready" if items else "—"


def _report_label(items: list[dict]) -> str:
    if any(item["state"] == "filed" for item in items):
        return "Filed"
    if any(item["state"] == "failed" for item in items):
        return "Check"
    return "—"


def _item(item_id: str, title: str, detail: str, state: str, href: str, when=None) -> dict:
    return {
        "id": item_id,
        "title": title[:160],
        "detail": (detail or "")[:160],
        "when": when.isoformat() if when else "",
        "state": state,
        "href": href,
    }


def _post_items(business: Business, start, end) -> list[dict]:
    from apps.social.models import SocialPost

    rows = (
        SocialPost.objects.filter(
            content__business=business,
            created_at__gte=start,
            created_at__lte=end,
        )
        .select_related("content__product", "social_account")
        .order_by("created_at")
    )
    items = []
    for post in rows:
        product = post.content.product.name if post.content.product_id else "Post"
        state = {
            SocialPost.PublishingStatus.PUBLISHED: "done",
            SocialPost.PublishingStatus.SCHEDULED: "scheduled",
            SocialPost.PublishingStatus.FAILED: "failed",
        }.get(post.publishing_status, "scheduled")
        items.append(
            _item(
                f"post-{post.id}",
                product,
                post.social_account.get_platform_display(),
                state,
                "/workspace/social/calendar",
                post.published_at or post.scheduled_at,
            )
        )
    return items


def _reply_items(business: Business, start, end) -> list[dict]:
    rows = (
        SocialMessage.objects.filter(
            business=business,
            direction=SocialMessage.Direction.OUTBOUND,
            created_at__gte=start,
            created_at__lte=end,
        )
        .select_related("in_reply_to")
        .order_by("created_at")
    )
    items = []
    for message in rows:
        inbound = message.in_reply_to
        who = (inbound.customer_name if inbound and inbound.customer_name else "") or "Customer"
        about = (inbound.body if inbound else message.body) or ""
        state = "failed" if message.delivery_status == SocialMessage.Delivery.FAILED else "sent"
        items.append(
            _item(
                f"reply-{message.id}",
                who,
                about,
                state,
                "/workspace/social/engagement",
                message.created_at,
            )
        )
    return items


def _items_from_events(events, reader) -> list[dict]:
    items = []
    for event in events:
        item = reader(event)
        if item:
            items.append(item)
    return items


def _post_event(event: AutopilotEvent) -> dict | None:
    title = event.title
    if title.startswith("Published posts for "):
        return _item(
            f"event-{event.id}",
            title.removeprefix("Published posts for "),
            event.detail or "Live on your channels",
            "done",
            "/workspace/social/calendar",
            event.created_at,
        )
    if title.startswith("Scheduled posts for "):
        return _item(
            f"event-{event.id}",
            title.removeprefix("Scheduled posts for "),
            event.detail or "On the calendar",
            "scheduled",
            "/workspace/social/calendar",
            event.created_at,
        )
    if title.startswith("Published organic"):
        return _item(
            f"event-{event.id}",
            "Organic posts",
            event.detail or "Live on your channels",
            "done",
            "/workspace/social/calendar",
            event.created_at,
        )
    if title.startswith("Scheduled organic"):
        return _item(
            f"event-{event.id}",
            "Organic posts",
            event.detail or "On the calendar",
            "scheduled",
            "/workspace/social/calendar",
            event.created_at,
        )
    if title.startswith("Content seed:"):
        return _item(
            f"event-{event.id}",
            title.removeprefix("Content seed:").strip(),
            event.detail or "Used for organic content",
            "scheduled",
            "/workspace/social/studio",
            event.created_at,
        )
    if title.startswith("Could not write a post for ") or title.startswith("No post was saved for "):
        name = title.split(" for ", 1)[-1]
        return _item(f"event-{event.id}", name, "The post was not saved", "failed", "/workspace/social/studio", event.created_at)
    if title.startswith("Posts for ") and title.endswith("are drafted"):
        name = title.removeprefix("Posts for ").removesuffix(" are drafted").strip()
        return _item(f"event-{event.id}", name, "Draft saved. The calendar time was not set.", "failed", "/workspace/social/calendar", event.created_at)
    if title == "Content":
        return _item(f"event-{event.id}", "Posts", "Nothing needed a post in this shift.", "clear", "/workspace/social/calendar")
    return None


def _reply_event(event: AutopilotEvent) -> dict | None:
    if event.title == "Replied to a customer":
        return _item(
            f"event-{event.id}",
            "Reply sent",
            event.detail,
            "sent",
            "/workspace/social/engagement",
            event.created_at,
        )
    if event.title in {"No reply was ready", "A reply did not send"}:
        return _item(
            f"event-{event.id}",
            "Reply",
            event.detail or event.title,
            "failed",
            "/workspace/social/engagement",
            event.created_at,
        )
    if event.title == "Inbox":
        return _item(f"event-{event.id}", "Inbox", "No customer is waiting.", "clear", "/workspace/social/engagement")
    return None


def _listing_event(event: AutopilotEvent) -> dict | None:
    if event.title.startswith("Polished "):
        return _item(
            f"event-{event.id}",
            event.title.removeprefix("Polished "),
            "Description updated",
            "done",
            "/workspace/commerce",
            event.created_at,
        )
    if event.title.startswith("Could not polish "):
        return _item(
            f"event-{event.id}",
            event.title.removeprefix("Could not polish "),
            "The description was left as it is.",
            "failed",
            "/workspace/commerce",
            event.created_at,
        )
    if event.title == "Listings":
        return _item(f"event-{event.id}", "Listings", "Descriptions are already in place.", "clear", "/workspace/commerce")
    return None


def results_brief(business: Business) -> dict:
    """The figures Ask Kova may use when the owner asks for a summary."""
    picture = business_picture(business)

    def product(item: dict) -> dict:
        return {
            "name": item["name"],
            "likes": item["likes"],
            "impressions": item["impressions"],
            "reach": item["reach"],
            "comments": item["comments"],
        }

    def post(item: dict) -> dict:
        return {
            "product": item["product"],
            "platform": item["platform"],
            "likes": item["likes"],
            "impressions": item["impressions"],
        }

    return {
        "impressions": picture["impressions"],
        "likes": picture["likes"],
        "reach": picture["reach"],
        "comments": picture["comments"],
        "shares": picture["shares"],
        "clicks": picture["clicks"],
        "published": picture["published"],
        "scheduled": picture["scheduled"],
        "leads": picture["leads"],
        "orders": picture["orders"],
        "performing_products": [
            product(item) for item in picture["products"] if item.get("band") != "low"
        ],
        "quiet_products": [
            product(item) for item in picture["products"] if item.get("band") == "low"
        ],
        "performing_posts": [
            post(item) for item in picture["posts"] if item.get("band") != "low"
        ],
        "quiet_posts": [
            post(item) for item in picture["posts"] if item.get("band") == "low"
        ],
    }


def business_picture(business: Business) -> dict:
    """Likes, impressions, and the products those numbers belong to."""
    from apps.commerce.models import Order
    from apps.leads.models import Lead
    from apps.social.models import SocialPost

    base = SocialPost.objects.filter(social_account__business=business)
    published = list(
        base.filter(publishing_status=SocialPost.PublishingStatus.PUBLISHED)
        .select_related("content__product", "social_account")
    )
    products: dict[str, dict] = {}
    for post in published:
        name = post.content.product.name if post.content.product_id else "Post"
        bucket = products.setdefault(name, {
            "name": name,
            "likes": 0,
            "impressions": 0,
            "reach": 0,
            "comments": 0,
            "shares": 0,
            "clicks": 0,
            "posts": 0,
        })
        bucket["likes"] += post.likes or 0
        bucket["impressions"] += post.impressions or 0
        bucket["reach"] += post.reach or 0
        bucket["comments"] += post.comments_count or 0
        bucket["shares"] += post.shares or 0
        bucket["clicks"] += post.clicks or 0
        bucket["posts"] += 1

    ranked = _high_and_low(
        list(products.values()),
        lambda item: (item["impressions"], item["likes"], item["reach"]),
    )

    def _post_row(post: SocialPost) -> dict:
        when = post.published_at or post.scheduled_at
        return {
            "id": post.id,
            "product": post.content.product.name if post.content.product_id else "Post",
            "platform": post.social_account.get_platform_display(),
            "status": post.get_publishing_status_display(),
            "likes": post.likes or 0,
            "impressions": post.impressions or 0,
            "reach": post.reach or 0,
            "comments": post.comments_count or 0,
            "shares": post.shares or 0,
            "clicks": post.clicks or 0,
            "when": when.isoformat() if when else "",
            "highlight": False,
            "band": "high",
        }

    shown_posts = _high_and_low(
        [_post_row(post) for post in published],
        lambda item: (item["impressions"], item["likes"], item["reach"]),
    )

    return {
        "likes": sum(post.likes or 0 for post in published),
        "impressions": sum(post.impressions or 0 for post in published),
        "reach": sum(post.reach or 0 for post in published),
        "comments": sum(post.comments_count or 0 for post in published),
        "shares": sum(post.shares or 0 for post in published),
        "clicks": sum(post.clicks or 0 for post in published),
        "published": len(published),
        "scheduled": base.filter(
            publishing_status=SocialPost.PublishingStatus.SCHEDULED,
        ).count(),
        "leads": Lead.objects.filter(business=business).count(),
        "orders": Order.objects.filter(business=business).count(),
        "posts": shown_posts,
        "products": ranked,
    }


def _high_and_low(items: list[dict], score) -> list[dict]:
    """Keep up to four leaders and up to four that trail them. Skip the middle."""
    ordered = sorted(items, key=score, reverse=True)
    high = [item for item in ordered if score(item) > (0, 0, 0)][:4]
    high_ids = {id(item) for item in high}
    floor = score(high[-1]) if high else (0, 0, 0)
    trailing = [item for item in ordered if id(item) not in high_ids and score(item) < floor]
    if not high:
        trailing = ordered
    low = trailing[-4:]
    leader = score(high[0]) if high else None
    for item in high:
        item["band"] = "high"
        item["highlight"] = leader is not None and score(item) == leader
    for item in low:
        item["band"] = "low"
        item["highlight"] = False
    return high + low


def _report_event(event: AutopilotEvent) -> dict | None:
    if event.title in {"Today's report is already filed", "Filed today's report"}:
        return _item(f"event-{event.id}", "Today's report", "Ready to read.", "filed", "/workspace/brief", event.created_at)
    if event.title == "The report did not finish":
        return _item(f"event-{event.id}", "Today's report", "It did not finish.", "failed", "/workspace/brief", event.created_at)
    return None


def run_shift(business: Business, *, force: bool = False) -> AutopilotShift:
    policy = BusinessPolicy.objects.filter(business=business).first()
    if policy is None or policy.social_operating_mode != BusinessPolicy.OperatingMode.AUTOPILOT:
        raise ValueError("Turn Autopilot on before Kova starts this shift.")

    current = latest_shift(business)
    if (
        not force
        and current is not None
        and current.started_at > timezone.now() - HOLD_FOR
        and current.status != AutopilotShift.Status.FAILED
    ):
        return current

    shift = AutopilotShift.objects.create(business=business)
    try:
        briefing = _briefing(business)
        shift.briefing = briefing
        shift.save(update_fields=["briefing"])
        _event(shift, "Read the company", briefing)

        plan = _plan(business, briefing)
        shift.plan = plan.get("focus") or "Work from the products, the inbox, and today's report."
        shift.save(update_fields=["plan"])
        _event(shift, "Planned the day", shift.plan)

        _polish(shift, business, plan.get("polish") or [])
        _publish(shift, business, plan.get("posts") or [])
        _publish_organic(shift, business, plan.get("organic_posts") or [])
        _reply(shift, business)
        _report(shift, business)
        dispatch_due(business.id)
        refresh_due_metrics(business.id)
        shift.status = AutopilotShift.Status.FINISHED
    except Exception as exc:
        shift.status = AutopilotShift.Status.FAILED
        _event(shift, "The shift stopped", str(exc)[:500], failed=True)
    shift.finished_at = timezone.now()
    shift.save(update_fields=["status", "finished_at", "plan", "briefing"])
    return shift


def _event(shift: AutopilotShift, title: str, detail: str = "", *, failed: bool = False) -> None:
    AutopilotEvent.objects.create(
        shift=shift,
        title=title[:200],
        detail=detail,
        status=AutopilotEvent.Status.FAILED if failed else AutopilotEvent.Status.DONE,
    )


def _briefing(business: Business) -> str:
    profile = BusinessProfile.objects.filter(business=business).first()
    audience = BusinessAudience.objects.filter(business=business).first()
    brand = BusinessBrand.objects.filter(business=business).first()
    goals = BusinessGoal.objects.filter(business=business).first()
    lines = [
        f"Company: {business.name}.",
        f"What it does: {business.description or 'The owner has not written a description yet.'}",
        f"Where: {business.location or 'Location not set.'}",
    ]
    if profile and profile.mission:
        lines.append(f"Mission: {profile.mission}")
    if profile and profile.value_proposition:
        lines.append(f"Value: {profile.value_proposition}")
    if audience and audience.primary_audience:
        lines.append(f"Customers: {audience.primary_audience}")
    if brand and brand.voice:
        lines.append(f"Voice: {brand.voice}")
    if brand and brand.tone:
        lines.append(f"Tone: {brand.tone}")
    if goals and goals.primary_goal:
        lines.append(f"Goal: {goals.primary_goal}")
    products = list(
        Product.objects.filter(business=business, status=Product.Status.ACTIVE)[:8]
    )
    if products:
        names = ", ".join(
            f"{product.name} ({product.currency} {product.price})"
            if product.price is not None
            else product.name
            for product in products
        )
        lines.append(f"Products on the shelf: {names}.")
    lines.append("Start the work from these facts. Use the prices and stock that are recorded.")
    return "\n".join(lines)


def _plan(business: Business, briefing: str) -> dict:
    quiet = [product.name for product in _quiet_products(business)[:3]]
    thin = [
        product.name
        for product in Product.objects.filter(business=business, status=Product.Status.ACTIVE)
        if len((product.description or "").strip()) < 40
    ][:3]
    try:
        service = OpenRouterService(timeout=45)
        response = service.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Kova, newly responsible for this business. "
                        "Plan today's work from the briefing. Mix product posts and organic "
                        "value posts (educate, tips, story — not always selling). "
                        "Return JSON with keys focus (string), "
                        "polish (list of product names that need a stronger public description), "
                        "posts (list of objects with product_name and note), "
                        "organic_posts (list of objects with theme and note; "
                        "theme one of: educate, tip, behind_scenes, story, faq, seasonal, community)."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "briefing": briefing,
                            "quiet_products": quiet,
                            "thin_descriptions": thin,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=700,
            response_format={"type": "json_object"},
            reasoning={"effort": "low"},
        )
        raw = response["choices"][0]["message"]["content"]
        parsed = json.loads(raw if isinstance(raw, str) else "{}")
        if isinstance(parsed, dict):
            return parsed
    except (OpenRouterError, KeyError, TypeError, json.JSONDecodeError):
        pass
    return {
        "focus": "Feature a quiet product, share one organic tip, and answer the inbox.",
        "polish": thin[:1],
        "posts": [{"product_name": name, "note": "Feature this product today."} for name in quiet[:1]],
        "organic_posts": [
            {"theme": "tip", "note": "Share one useful tip for your customers today."},
        ],
    }


def _polish(shift: AutopilotShift, business: Business, names: list) -> None:
    from apps.commerce.services.product_polish import polish_product

    chosen = _products_named(business, names)[:1]
    if not chosen:
        chosen = [
            product
            for product in Product.objects.filter(business=business, status=Product.Status.ACTIVE)
            if len((product.description or "").strip()) < 40
        ][:1]
    if not chosen:
        _event(shift, "Listings", "Every active product already has a description.")
        return
    product = chosen[0]
    try:
        polish_product(product)
    except Exception as exc:
        _event(shift, f"Could not polish {product.name}", str(exc)[:400], failed=True)
        return
    _event(shift, f"Polished {product.name}", "The public description now follows the photos and the brand.")


def _publish(shift: AutopilotShift, business: Business, posts: list) -> None:
    from apps.content.services.product_pipeline import product_has_open_pipeline

    names = []
    for item in posts:
        if isinstance(item, dict) and item.get("product_name"):
            names.append(str(item["product_name"]))
        elif isinstance(item, str):
            names.append(item)
    pool = _products_named(business, names) or _quiet_products(business)
    product = next(
        (candidate for candidate in pool if not product_has_open_pipeline(business, candidate.id)),
        None,
    )
    if product is None:
        _event(
            shift,
            "Content",
            "Every product either has posts on the calendar already or was featured recently.",
        )
        return
    try:
        result = draft_campaign(
            business,
            note=f"Feature {product.name} for today's customers. Use the recorded price.",
            product_id=product.id,
            primary_only=True,
        )
    except Exception as exc:
        _event(shift, f"Could not write a post for {product.name}", str(exc)[:400], failed=True)
        return
    content_ids = [piece["id"] for piece in (result.get("pieces") or []) if piece.get("id")]
    if not content_ids:
        _event(shift, f"No post was saved for {product.name}", "", failed=True)
        return
    try:
        schedule_posts(business, content_ids, autopilot=True)
        detail = _autopilot_publish_detail(content_ids)
        _event(
            shift,
            f"Published posts for {product.name}",
            detail,
        )
    except Exception as exc:
        _event(shift, f"Posts for {product.name} are drafted", str(exc)[:400], failed=True)


def _publish_organic(shift: AutopilotShift, business: Business, items: list) -> None:
    from apps.content.services.organic import ORGANIC_THEMES, draft_organic_campaign
    from apps.content.services.organic_seeds import (
        generate_organic_seeds,
        pick_autopilot_organic_seed,
    )

    valid_themes = {t["key"] for t in ORGANIC_THEMES}
    seeds = generate_organic_seeds(business)
    seed_by_theme = {s["theme_key"]: s for s in seeds}

    theme_key = ""
    note = ""
    seed_title = ""

    for item in items:
        if not isinstance(item, dict):
            continue
        theme = str(item.get("theme") or "").strip().lower()
        if theme not in valid_themes:
            continue
        theme_key = theme
        note = str(item.get("note") or "").strip()
        break

    if not theme_key:
        picked = pick_autopilot_organic_seed(business)
        theme_key = picked["theme_key"]
        note = picked["brief"]
        seed_title = picked.get("title") or picked.get("theme_label") or theme_key
        _event(
            shift,
            f"Content seed: {seed_title}",
            note[:500],
        )
    else:
        matched = seed_by_theme.get(theme_key)
        if matched and len(note) < 40:
            note = matched["brief"]
            seed_title = matched.get("title") or theme_key
        elif matched:
            seed_title = matched.get("title") or theme_key
        else:
            seed_title = theme_key
        if seed_title:
            _event(shift, f"Content seed: {seed_title}", note[:500] if note else "")
    try:
        result = draft_organic_campaign(
            business,
            note=note,
            organic_theme=theme_key,
            primary_only=True,
        )
    except Exception as exc:
        _event(shift, "Organic content", str(exc)[:400], failed=True)
        return

    content_ids = [piece["id"] for piece in (result.get("pieces") or []) if piece.get("id")]
    if not content_ids:
        _event(shift, "Organic content", "No organic drafts were saved.", failed=True)
        return
    try:
        schedule_posts(business, content_ids, autopilot=True)
        detail = _autopilot_publish_detail(content_ids)
        _event(
            shift,
            f"Published organic ({theme_key}) posts",
            detail or "Educational / brand content sent to your channels.",
        )
    except Exception as exc:
        _event(shift, "Organic drafts saved", str(exc)[:400], failed=True)


def _reply(shift: AutopilotShift, business: Business) -> None:
    inbound = SocialMessage.objects.filter(
        business=business,
        direction=SocialMessage.Direction.INBOUND,
    )
    waiting = _waiting_messages(inbound)[:4]
    if not waiting:
        _event(shift, "Inbox", "No customer is waiting.")
        return
    for message in waiting:
        try:
            if not (message.draft_reply or "").strip():
                draft_reply(message)
                message.refresh_from_db()
            if (message.draft_reply or "").strip():
                send_reply(message, message.draft_reply)
                _event(shift, "Replied to a customer", message.body[:180])
            else:
                _event(shift, "No reply was ready", message.body[:180], failed=True)
        except Exception as exc:
            _event(shift, "A reply did not send", str(exc)[:300], failed=True)


def _report(shift: AutopilotShift, business: Business) -> None:
    from apps.brief.services.reason import generate_brief

    existing = MorningBrief.objects.filter(
        business=business,
        date=timezone.localdate(),
        status=MorningBrief.Status.READY,
    ).first()
    if existing:
        _event(shift, "Today's report is already filed", existing.greeting or "")
        return
    try:
        brief = generate_brief(business)
    except Exception as exc:
        _event(shift, "The report did not finish", str(exc)[:400], failed=True)
        return
    if brief.status == MorningBrief.Status.READY:
        _event(shift, "Filed today's report", brief.greeting or brief.sections.get("pulse", {}).get("summary", ""))
    else:
        _event(shift, "The report did not finish", brief.error_message[:400], failed=True)


def _autopilot_publish_detail(content_ids: list[int]) -> str:
    from apps.social.models import SocialPost

    if not content_ids:
        return ""
    rows = SocialPost.objects.filter(content_id__in=content_ids)
    published = rows.filter(
        publishing_status=SocialPost.PublishingStatus.PUBLISHED,
    ).count()
    scheduled = rows.filter(
        publishing_status=SocialPost.PublishingStatus.SCHEDULED,
    ).count()
    failed = rows.filter(
        publishing_status=SocialPost.PublishingStatus.FAILED,
    ).count()
    parts: list[str] = []
    if published:
        parts.append(f"{published} live on your channel{'s' if published != 1 else ''}.")
    if scheduled:
        parts.append(f"{scheduled} sending in the next few minutes.")
    if failed:
        parts.append(f"{failed} failed — open Calendar to retry.")
    return " ".join(parts) or "Queued to publish."


def _products_named(business: Business, names: list) -> list[Product]:
    wanted = {str(name).strip().lower() for name in names if str(name).strip()}
    if not wanted:
        return []
    found = []
    for product in Product.objects.filter(business=business, status=Product.Status.ACTIVE):
        if product.name.lower() in wanted:
            found.append(product)
    return found
