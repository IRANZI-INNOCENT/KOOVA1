"""Draft a Business Brain section from the business the owner already described."""

from __future__ import annotations

import json
import re

from apps.business_brain.models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessPolicy,
    BusinessProfile,
)
from apps.businesses.models import Business
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService

SECTIONS = ("profile", "audience", "brand", "goals", "policy")

SECTION_FIELDS = {
    "profile": (
        "mission",
        "value_proposition",
        "target_market",
        "business_model",
        "business_stage",
        "website",
    ),
    "audience": (
        "primary_audience",
        "customer_needs",
        "pain_points",
        "buying_motivations",
        "customer_behavior",
        "preferred_channels",
    ),
    "brand": (
        "voice",
        "tone",
        "positioning",
        "brand_personality",
        "content_style",
        "communication_preferences",
    ),
    "goals": (
        "primary_goal",
        "secondary_goals",
        "growth_priorities",
        "success_metrics",
        "current_challenges",
        "time_horizon",
    ),
    "policy": (
        "allow_content_creation",
        "allow_auto_publish",
        "allow_comment_replies",
        "allow_dm_replies",
        "allow_lead_creation",
        "allow_product_management",
        "allow_order_management",
        "require_discount_approval",
        "max_auto_discount_percent",
        "require_refund_approval",
        "require_payment_approval",
    ),
}


def draft_section(business: Business, section: str) -> dict:
    """Return suggested field values. The caller saves them only after the owner edits."""

    if section not in SECTION_FIELDS:
        raise ValueError("Unknown Business Brain section.")

    service = OpenRouterService(timeout=60)
    response = service.chat(
        messages=[
            {
                "role": "system",
                "content": (
                    "You draft Business Brain fields for Kova, an assistant for small businesses. "
                    "Use only the business facts provided. Do not invent a website, phone number, "
                    "or awards. Write plain sentences the owner can edit. "
                    "Reply with one JSON object and no markdown."
                ),
            },
            {
                "role": "user",
                "content": _prompt(business, section),
            },
        ],
        temperature=0.4,
        max_tokens=1200,
        response_format={"type": "json_object"},
        feature="business_draft",
        business_id=getattr(business, "id", None),
    )
    return _fields_from_response(response, section)


def section_is_complete(business: Business, section: str) -> bool:
    if section == "profile":
        record = BusinessProfile.objects.filter(business=business).first()
        return bool(record and (record.mission.strip() or record.value_proposition.strip()))
    if section == "audience":
        record = BusinessAudience.objects.filter(business=business).first()
        return bool(record and record.primary_audience.strip())
    if section == "brand":
        record = BusinessBrand.objects.filter(business=business).first()
        return bool(record and record.voice.strip())
    if section == "goals":
        record = BusinessGoal.objects.filter(business=business).first()
        return bool(record and record.primary_goal.strip())
    if section == "policy":
        try:
            policy = business.policy
        except BusinessPolicy.DoesNotExist:
            return False
        return (policy.updated_at - policy.created_at).total_seconds() > 1
    if section == "market":
        try:
            brief = business.market_brief
        except BusinessMarketBrief.DoesNotExist:
            return False
        if brief.status == BusinessMarketBrief.Status.SKIPPED:
            return True
        return brief.status == BusinessMarketBrief.Status.READY and brief.kept
    return False


def _prompt(business: Business, section: str) -> str:
    facts = {
        "name": business.name,
        "description": business.description,
        "industry": business.industry,
        "location": business.location,
        "email": business.email,
        "phone": business.phone,
    }
    profile = BusinessProfile.objects.filter(business=business).first()
    if profile and profile.mission:
        facts["mission"] = profile.mission
    if profile and profile.value_proposition:
        facts["value_proposition"] = profile.value_proposition

    fields = SECTION_FIELDS[section]
    guidance = (
        "Keep automatic publishing, comment replies, direct messages, "
        "product changes, orders, discounts, refunds, and payments off or requiring approval "
        "unless the business description clearly asks Kova to do them. "
        "max_auto_discount_percent must be a number from 0 to 20."
        if section == "policy"
        else "Every text field should be one or two short paragraphs. Leave website as an empty string if it was not provided."
    )
    return (
        f"Draft the {section} section.\n"
        f"Required keys: {', '.join(fields)}\n"
        f"{guidance}\n"
        f"Business facts:\n{json.dumps(facts, ensure_ascii=True)}"
    )


def _fields_from_response(response: dict, section: str) -> dict:
    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not read a draft from the model.") from exc

    parsed = _parse_json(content)
    allowed = SECTION_FIELDS[section]
    cleaned = {}
    for key in allowed:
        if key not in parsed:
            continue
        value = parsed[key]
        if section == "policy" and key == "max_auto_discount_percent":
            try:
                number = float(value)
            except (TypeError, ValueError):
                continue
            cleaned[key] = max(0, min(100, number))
        elif section == "policy":
            cleaned[key] = bool(value)
        elif isinstance(value, str):
            cleaned[key] = value.strip()
    if not cleaned:
        raise OpenRouterError("Kova returned a draft without usable fields.")
    return cleaned


def _parse_json(raw: str) -> dict:
    cleaned = raw.strip()
    cleaned = re.sub(r"^\s*```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned).strip()
    candidates = [cleaned]
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        candidates.append(cleaned[start : end + 1])
    for candidate in candidates:
        try:
            result = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(result, dict):
            return result
    raise OpenRouterError("Kova returned a draft that was not JSON.")
