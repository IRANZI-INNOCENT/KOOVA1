"""
Read customer comments and messages with the model, then send the reply.
"""

from __future__ import annotations

import json

from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService
from apps.leads.models import Lead
from apps.social.adapters.base import PublishResult
from apps.social.adapters.meta import MetaAdapter
from apps.social.models import SocialAccount, SocialMessage


_SYSTEM = (
    "You are Kova, the operator for a small business. "
    "Read one customer comment or direct message and answer as that business. "
    "Use only facts in the business context. Do not invent prices, stock, or delivery promises. "
    "Write a short reply in the customer's language, ready to post as a comment or chat message. "
    'Return JSON with keys intent ("buying", "question", or "other"), '
    "draft_reply (string), and create_lead (boolean). "
    "create_lead is true when the person wants to buy, asks the price, checks availability, "
    "or asks about delivery."
)


def understand_customer(business, body: str, *, kind: str, channel: str) -> dict:
    """Ask the model what the customer wants and how the business should reply."""
    service = OpenRouterService(timeout=45)
    response = service.chat(
        messages=[
            {"role": "system", "content": _SYSTEM},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "business": _business_context(business),
                        "channel": channel,
                        "kind": kind,
                        "customer_text": body,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        temperature=0.4,
        max_tokens=500,
        response_format={"type": "json_object"},
    )
    try:
        raw = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not read that customer message.") from exc
    parsed = _parse_json(raw if isinstance(raw, str) else "")
    intent = parsed.get("intent")
    if intent not in {
        SocialMessage.Intent.BUYING,
        SocialMessage.Intent.QUESTION,
        SocialMessage.Intent.OTHER,
    }:
        intent = SocialMessage.Intent.OTHER
    draft = str(parsed.get("draft_reply") or "").strip()
    create_lead = bool(parsed.get("create_lead")) or intent == SocialMessage.Intent.BUYING
    return {"intent": intent, "draft_reply": draft, "create_lead": create_lead}


def pull_recent_comments(business) -> int:
    """Bring in comments already on the connected Page or Instagram account."""
    saved = 0
    accounts = SocialAccount.objects.filter(
        business=business,
        connection_status=SocialAccount.ConnectionStatus.CONNECTED,
    )
    for account in accounts:
        channel = (
            SocialMessage.Channel.INSTAGRAM
            if account.platform == SocialAccount.Platform.INSTAGRAM
            else SocialMessage.Channel.FACEBOOK
        )
        try:
            comments = MetaAdapter().list_recent_comments(account)
        except Exception:
            continue
        for comment in comments:
            if saved >= 8:
                return saved
            if SocialMessage.objects.filter(
                business=business,
                external_id=comment["id"],
                direction=SocialMessage.Direction.INBOUND,
            ).exists():
                continue
            record_inbound(
                business=business,
                body=comment["text"],
                channel=channel,
                kind=SocialMessage.Kind.COMMENT,
                customer_name=comment.get("name") or "",
                external_id=comment["id"],
                reply_target_id=comment["id"],
                social_account=account,
            )
            saved += 1
    return saved


def record_inbound(
    *,
    business,
    body: str,
    channel: str,
    customer_name: str = "",
    external_id: str = "",
    social_account: SocialAccount | None = None,
    kind: str = SocialMessage.Kind.MESSAGE,
    reply_target_id: str = "",
) -> SocialMessage:
    """Save a comment or direct message, then let Kova read it and draft a reply."""
    if kind not in {SocialMessage.Kind.MESSAGE, SocialMessage.Kind.COMMENT}:
        kind = SocialMessage.Kind.MESSAGE
    if external_id:
        existing = SocialMessage.objects.filter(
            business=business,
            external_id=external_id,
            direction=SocialMessage.Direction.INBOUND,
        ).first()
        if existing:
            return existing

    message = SocialMessage.objects.create(
        business=business,
        social_account=social_account,
        channel=channel or SocialMessage.Channel.WEB,
        kind=kind,
        reply_target_id=reply_target_id or "",
        direction=SocialMessage.Direction.INBOUND,
        customer_name=customer_name or "",
        body=body,
        external_id=external_id or "",
        delivery_status=SocialMessage.Delivery.RECEIVED,
    )
    try:
        reading = understand_customer(business, body, kind=kind, channel=message.channel)
    except OpenRouterError as exc:
        message.reply_error = str(exc)[:500]
        message.save(update_fields=["reply_error"])
        return message

    message.intent = reading["intent"]
    message.draft_reply = reading["draft_reply"]
    message.save(update_fields=["intent", "draft_reply"])
    if reading["create_lead"]:
        _attach_lead(message)
    _autopilot_send(message)
    return message


def draft_reply(message: SocialMessage) -> SocialMessage:
    """Ask Kova again for the reply to this comment or message."""
    reading = understand_customer(
        message.business,
        message.body,
        kind=message.kind,
        channel=message.channel,
    )
    message.intent = reading["intent"]
    message.draft_reply = reading["draft_reply"]
    message.reply_error = ""
    message.save(update_fields=["intent", "draft_reply", "reply_error"])
    if reading["create_lead"] and message.lead_id is None:
        _attach_lead(message)
    return message


def send_reply(message: SocialMessage, body: str) -> SocialMessage:
    """Send a drafted reply to the comment or direct message when the platform can take it."""
    text = (body or "").strip()
    account = message.social_account
    delivery = SocialMessage.Delivery.SAVED
    external_id = ""
    error = ""
    can_send = (
        account is not None
        and bool(message.reply_target_id)
        and message.channel in {SocialMessage.Channel.INSTAGRAM, SocialMessage.Channel.FACEBOOK}
    )
    if can_send:
        try:
            result = MetaAdapter().send_reply(
                account,
                kind=message.kind,
                target_id=message.reply_target_id,
                body=text,
            )
        except Exception as exc:
            result = PublishResult(success=False, error=str(exc)[:500])
        if result.success:
            delivery = SocialMessage.Delivery.SENT
            external_id = result.external_post_id
        else:
            delivery = SocialMessage.Delivery.FAILED
            error = result.error or "The platform did not accept the reply."

    return SocialMessage.objects.create(
        business=message.business,
        social_account=account,
        channel=message.channel,
        kind=message.kind,
        reply_target_id=message.reply_target_id,
        direction=SocialMessage.Direction.OUTBOUND,
        customer_name=message.customer_name,
        body=text,
        external_id=external_id,
        intent=SocialMessage.Intent.OTHER,
        lead=message.lead,
        reply_error=error,
        in_reply_to=message,
        delivery_status=delivery,
    )


def _attach_lead(message: SocialMessage) -> None:
    source = message.channel if message.channel in Lead.Source.values else Lead.Source.OTHER
    lead = Lead.objects.create(
        business=message.business,
        customer_name=message.customer_name or "",
        customer_id=message.external_id or "",
        source=source,
        interest=message.body[:500],
        status=Lead.Status.NEW,
        created_by_ai=True,
    )
    message.lead = lead
    message.save(update_fields=["lead"])


def _autopilot_send(message: SocialMessage) -> None:
    from apps.business_brain.models import BusinessPolicy

    policy = BusinessPolicy.objects.filter(business=message.business).first()
    if policy is None or policy.social_operating_mode != BusinessPolicy.OperatingMode.AUTOPILOT:
        return
    if message.kind == SocialMessage.Kind.COMMENT and not policy.allow_comment_replies:
        return
    if message.kind == SocialMessage.Kind.MESSAGE and not policy.allow_dm_replies:
        return
    if not (message.draft_reply or "").strip():
        return
    send_reply(message, message.draft_reply)


def _business_context(business) -> dict:
    from apps.business_brain.models import BusinessBrand
    from apps.commerce.models import Product

    brand = BusinessBrand.objects.filter(business=business).first()
    products = [
        {"name": product.name, "price": str(product.price), "currency": product.currency}
        for product in Product.objects.filter(
            business=business,
            status=Product.Status.ACTIVE,
        ).order_by("-updated_at")[:6]
    ]
    return {
        "name": business.name,
        "description": business.description,
        "location": business.location,
        "voice": getattr(brand, "voice", "") or "",
        "tone": getattr(brand, "tone", "") or "",
        "products": products,
    }


def _parse_json(raw: str) -> dict:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise OpenRouterError("Kova returned a reply Kova could not read.") from exc
    if not isinstance(parsed, dict):
        raise OpenRouterError("Kova returned a reply Kova could not read.")
    return parsed
