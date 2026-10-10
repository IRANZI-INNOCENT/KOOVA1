"""One business, as Kova has actually been running it."""

from __future__ import annotations

import os

from apps.brief.models import MorningBrief
from apps.business_brain.models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessPolicy,
    BusinessProfile,
)
from apps.commerce.models import CommercePage, Product
from apps.commerce.services.storefront import absolute_product_url, store_paths
from apps.content.models import Content
from apps.kova_ai.models import KovaExchange
from apps.leads.models import Lead
from apps.social.models import SocialAccount, SocialAction, SocialMessage, SocialPost


def _clip(value, limit=140):
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _lines(value):
    text = str(value or "").strip()
    if not text:
        return []
    return [line.strip() for line in text.splitlines() if line.strip()]


def brief_blocks(sections):
    """Turn the morning-brief JSON into titled lines an admin can read."""

    sections = sections if isinstance(sections, dict) else {}
    blocks = []

    pulse = sections.get("pulse") if isinstance(sections.get("pulse"), dict) else {}
    pulse_lines = _lines(pulse.get("summary"))
    for metric in pulse.get("metrics") or []:
        if isinstance(metric, dict) and metric.get("label"):
            pulse_lines.append(f"{metric.get('label')}: {metric.get('value')}")
    if pulse_lines:
        blocks.append({"title": "Pulse", "lines": pulse_lines})

    pending = sections.get("pending") if isinstance(sections.get("pending"), dict) else {}
    pending_lines = _lines(pending.get("summary"))
    for item in pending.get("items") or []:
        if isinstance(item, dict) and item.get("title"):
            pending_lines.append(f"{item.get('title')} — {item.get('description') or ''}".strip(" —"))
    if pending_lines:
        blocks.append({"title": "Needs attention", "lines": pending_lines})

    opportunities = sections.get("opportunities") if isinstance(sections.get("opportunities"), dict) else {}
    opportunity_lines = _lines(opportunities.get("summary"))
    for item in opportunities.get("items") or []:
        if isinstance(item, dict) and item.get("title"):
            opportunity_lines.append(str(item.get("title")))
    if opportunity_lines:
        blocks.append({"title": "Opportunities", "lines": opportunity_lines})

    performance = sections.get("performance") if isinstance(sections.get("performance"), dict) else {}
    performance_lines = _lines(performance.get("summary"))
    performance_lines.extend(str(item) for item in (performance.get("highlights") or []) if item)
    if performance_lines:
        blocks.append({"title": "Performance", "lines": performance_lines})

    plan = sections.get("plan") if isinstance(sections.get("plan"), dict) else {}
    plan_lines = _lines(plan.get("summary"))
    plan_lines.extend(str(step) for step in (plan.get("steps") or []) if step)
    if plan_lines:
        blocks.append({"title": "Plan", "lines": plan_lines})

    actions = sections.get("kova_actions") if isinstance(sections.get("kova_actions"), dict) else {}
    action_lines = []
    for label, key in (
        ("Done", "completed"),
        ("Planned", "planned"),
        ("Waiting for the owner", "needs_approval"),
    ):
        for item in actions.get(key) or []:
            if item:
                action_lines.append(f"{label}: {item}")
    if action_lines:
        blocks.append({"title": "What Kova did and plans", "lines": action_lines})

    return blocks


def _policy_lines(policy: BusinessPolicy | None):
    if policy is None:
        return ["Operating rules have not been saved."]
    flags = (
        ("Content writing", policy.allow_content_creation),
        ("Publishing without asking", policy.allow_auto_publish),
        ("Comment replies", policy.allow_comment_replies),
        ("Direct message replies", policy.allow_dm_replies),
        ("Lead creation", policy.allow_lead_creation),
        ("Product changes", policy.allow_product_management),
        ("Order changes", policy.allow_order_management),
        ("Discount approval", policy.require_discount_approval),
        ("Refund approval", policy.require_refund_approval),
        ("Payment approval", policy.require_payment_approval),
    )
    lines = [f"Mode: {policy.get_social_operating_mode_display()}"]
    lines.append(f"Largest automatic discount: {policy.max_auto_discount_percent}%")
    for label, enabled in flags:
        lines.append(f"{label}: {'on' if enabled else 'off'}")
    return lines


def _image_url(product: Product):
    image = next((item for item in product.images.all() if item.is_primary), None)
    if image is None:
        image = next(iter(product.images.all()), None)
    if image is None or not image.image:
        return ""
    try:
        return image.image.url
    except ValueError:
        return ""


def build_dossier(business):
    page = CommercePage.objects.filter(business=business).first()
    paths = store_paths(page)
    frontend = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    store_url = f"{frontend}{paths['store_path']}" if paths.get("store_path") else ""

    products = list(
        Product.objects.filter(business=business)
        .prefetch_related("images")
        .order_by("-updated_at")[:24]
    )
    product_ids = [product.id for product in products]
    content_rows = Content.objects.filter(product_id__in=product_ids)
    content_counts: dict[int, dict[str, int]] = {}
    for row in content_rows:
        bucket = content_counts.setdefault(
            row.product_id,
            {"draft": 0, "approved": 0, "published": 0},
        )
        if row.status in bucket:
            bucket[row.status] += 1
    scheduled_ids = set(
        SocialPost.objects.filter(
            content__product_id__in=product_ids,
            publishing_status=SocialPost.PublishingStatus.SCHEDULED,
        ).values_list("content__product_id", flat=True)
    )

    profile = BusinessProfile.objects.filter(business=business).first()
    audience = BusinessAudience.objects.filter(business=business).first()
    brand = BusinessBrand.objects.filter(business=business).first()
    goals = BusinessGoal.objects.filter(business=business).first()
    policy = BusinessPolicy.objects.filter(business=business).first()
    market = BusinessMarketBrief.objects.filter(business=business).first()
    brief = MorningBrief.objects.filter(business=business).order_by("-date").first()

    brain = []
    if profile is not None:
        brain.extend([
            ("Mission", profile.mission),
            ("Value", profile.value_proposition),
            ("Market", profile.target_market),
            ("Model", profile.business_model),
            ("Stage", profile.business_stage),
            ("Website", profile.website),
        ])
    if audience is not None:
        brain.extend([
            ("Audience", audience.primary_audience),
            ("Needs", audience.customer_needs),
            ("Pain", audience.pain_points),
            ("Why they buy", audience.buying_motivations),
            ("Channels they use", audience.preferred_channels),
        ])
    if brand is not None:
        brain.extend([
            ("Voice", brand.voice),
            ("Tone", brand.tone),
            ("Positioning", brand.positioning),
            ("Content style", brand.content_style),
        ])
    if goals is not None:
        brain.extend([
            ("Primary goal", goals.primary_goal),
            ("Growth", goals.growth_priorities),
            ("Challenges", goals.current_challenges),
            ("Horizon", goals.time_horizon),
        ])
    brain = [{"label": label, "text": _clip(text, 400)} for label, text in brain if str(text or "").strip()]

    competitors = []
    prompts = []
    if market is not None:
        for item in market.competitors or []:
            if isinstance(item, dict):
                competitors.append(item.get("name") or item.get("title") or _clip(item, 80))
            elif item:
                competitors.append(_clip(item, 80))
        prompts = [str(item) for item in (market.starter_prompts or []) if item]

    contents = []
    for content in (
        Content.objects.filter(business=business)
        .select_related("product", "social_account")
        .order_by("-created_at")[:20]
    ):
        contents.append(
            {
                "id": content.id,
                "platform": content.get_platform_display(),
                "kind": content.get_content_type_display(),
                "status": content.get_status_display(),
                "product": content.product.name if content.product_id else "",
                "caption": _clip(content.caption, 180),
                "call_to_action": _clip(content.call_to_action, 120),
                "hashtags": ", ".join(str(tag) for tag in (content.hashtags or [])[:8]),
                "slides": len(content.slides or []),
                "href": f"/admin/content/content/{content.id}/change/",
            }
        )

    posts = []
    for post in (
        SocialPost.objects.filter(content__business=business)
        .select_related("content", "content__product", "social_account")
        .order_by("-created_at")[:20]
    ):
        posts.append(
            {
                "id": post.id,
                "account": post.social_account.account_name or post.social_account.platform_account_id,
                "platform": post.social_account.get_platform_display(),
                "status": post.get_publishing_status_display(),
                "when": post.published_at or post.scheduled_at or post.created_at,
                "caption": _clip(post.content.caption, 160),
                "error": _clip(post.publishing_error, 180),
                "likes": post.likes,
                "comments": post.comments_count,
                "reach": post.reach,
                "attempts": post.publishing_attempts,
                "href": f"/admin/social/socialpost/{post.id}/change/",
            }
        )

    messages = []
    for message in (
        SocialMessage.objects.filter(business=business)
        .select_related("lead")
        .order_by("-created_at")[:20]
    ):
        messages.append(
            {
                "id": message.id,
                "when": message.created_at,
                "channel": message.get_channel_display(),
                "kind": message.get_kind_display(),
                "direction": message.get_direction_display(),
                "intent": message.get_intent_display(),
                "delivery": message.get_delivery_status_display(),
                "customer": message.customer_name,
                "body": _clip(message.body, 180),
                "draft": _clip(message.draft_reply, 180),
                "lead": message.lead_id,
                "error": _clip(message.reply_error, 160),
                "href": f"/admin/social/socialmessage/{message.id}/change/",
            }
        )

    exchanges = []
    for exchange in business.kova_exchanges.select_related("user").all()[:15]:
        tool_names = [
            str(call.get("tool_name"))
            for call in (exchange.tool_calls or [])
            if isinstance(call, dict) and call.get("tool_name")
        ]
        exchanges.append(
            {
                "id": exchange.id,
                "when": exchange.created_at,
                "who": exchange.user.email if exchange.user_id else "",
                "task": exchange.task,
                "status": exchange.get_status_display(),
                "request": _clip(exchange.request_text, 180),
                "response": _clip(exchange.response_text, 220),
                "error": _clip(exchange.error, 180),
                "tools": ", ".join(tool_names),
                "model": exchange.model_name,
                "href": f"/admin/kova_ai/kovaexchange/{exchange.id}/change/",
            }
        )

    actions = []
    for action in business.social_actions.select_related("social_account").all()[:15]:
        actions.append(
            {
                "when": action.created_at,
                "type": action.get_action_type_display(),
                "status": action.get_action_status_display(),
                "intent": _clip(action.intent, 160),
                "result": _clip(action.result, 160),
                "href": f"/admin/social/socialaction/{action.id}/change/",
            }
        )

    return {
        "business_id": business.id,
        "store_url": store_url,
        "store_published": bool(page and page.is_published),
        "store_slug": page.slug if page else "",
        "whatsapp": (page.whatsapp if page else "") or business.phone,
        "policy_lines": _policy_lines(policy),
        "brain": brain,
        "market": {
            "status": market.get_status_display() if market else "Empty",
            "kept": bool(market and market.kept),
            "summary": _clip(market.summary, 500) if market else "",
            "gap": _clip(market.gap, 400) if market else "",
            "positioning": _clip(market.positioning, 400) if market else "",
            "competitors": competitors[:8],
            "prompts": prompts[:6],
            "researched_at": market.researched_at if market else None,
        },
        "products": [
            {
                "id": product.id,
                "name": product.name,
                "status": product.get_status_display(),
                "price": product.price,
                "has_price": product.price is not None,
                "currency": product.currency,
                "stock": product.stock,
                "category": product.category,
                "url": absolute_product_url(product),
                "image": _image_url(product),
                "drafts": content_counts.get(product.id, {}).get("draft", 0),
                "published": content_counts.get(product.id, {}).get("published", 0),
                "scheduled": product.id in scheduled_ids,
                "href": f"/admin/commerce/product/{product.id}/change/",
            }
            for product in products
        ],
        "channels": [
            {
                "name": account.account_name or account.platform_account_id,
                "platform": account.get_platform_display(),
                "status": account.get_connection_status_display(),
                "scopes": ", ".join(str(scope) for scope in (account.scopes or [])),
                "verified": account.last_verified_at,
                "error": _clip(account.connection_error, 180),
                "token": bool(account.access_token),
                "href": f"/admin/social/socialaccount/{account.id}/change/",
            }
            for account in business.social_accounts.all()[:12]
        ],
        "contents": contents,
        "posts": posts,
        "messages": messages,
        "leads": [
            {
                "name": lead.customer_name or lead.customer_id or "Customer",
                "source": lead.get_source_display(),
                "status": lead.get_status_display(),
                "interest": _clip(lead.interest, 160),
                "when": lead.created_at,
                "href": f"/admin/leads/lead/{lead.id}/change/",
            }
            for lead in business.leads.all()[:15]
        ],
        "orders": [
            {
                "id": order.id,
                "product": order.product.name if order.product_id else "",
                "customer": order.customer_name,
                "phone": order.phone,
                "quantity": order.quantity,
                "status": order.get_status_display(),
                "source": order.get_source_display(),
                "note": _clip(order.note, 120),
                "when": order.created_at,
                "href": f"/admin/commerce/order/{order.id}/change/",
            }
            for order in business.orders.select_related("product").all()[:15]
        ],
        "brief": {
            "date": brief.date if brief else None,
            "status": brief.get_status_display() if brief else "",
            "greeting": brief.greeting if brief else "",
            "error": brief.error_message if brief else "",
            "blocks": brief_blocks(brief.sections) if brief else [],
            "href": f"/admin/brief/morningbrief/{brief.id}/change/" if brief else "",
        },
        "exchanges": exchanges,
        "actions": actions,
    }
