"""Build a market brief from the saved business and a public web search."""

from __future__ import annotations

import json
import re

from django.utils import timezone

from apps.business_brain.models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessProfile,
)
from apps.business_brain.services.draft import _parse_json
from apps.business_brain.services.search import MarketSearchError, search_market
from apps.businesses.models import Business
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService

THIN_SUMMARY = (
    "Public web results did not name competitors clearly enough to use. "
    "Kova did not invent shops, prices, or claims."
)


def research_market(business: Business) -> BusinessMarketBrief:
    """Search, write a brief from the citations, and clear any previous keep."""

    service = OpenRouterService(timeout=120)
    note, citations = search_market(service, _search_query(business))
    if citations or _named_links(note):
        draft = _from_citations(service, business, note, citations)
    else:
        draft = _thin_brief()

    brief, _created = BusinessMarketBrief.objects.get_or_create(business=business)
    brief.status = BusinessMarketBrief.Status.READY
    brief.kept = False
    brief.summary = draft["summary"]
    brief.competitors = draft["competitors"]
    brief.gap = draft["gap"]
    brief.positioning = draft["positioning"]
    brief.sources = draft["sources"]
    brief.researched_at = timezone.now()
    brief.save()
    return brief


def _search_query(business: Business) -> str:
    facts = _facts(business)
    return (
        "Search the public web for who sells a similar offer, especially near the business location, "
        "and for how those pages describe or price it.\n"
        f"Business facts:\n{json.dumps(facts, ensure_ascii=True)}\n"
        "Look up the industry and location, the offer in the description, and the customers if they are known. "
        "Cite every fact with a markdown link. Skip any shop or price a page does not state."
    )


def _facts(business: Business) -> dict:
    facts = {
        "name": business.name,
        "description": business.description,
        "industry": business.industry,
        "location": business.location,
    }
    profile = BusinessProfile.objects.filter(business=business).first()
    if profile:
        for field in ("mission", "value_proposition", "target_market", "business_model"):
            value = getattr(profile, field, "")
            if isinstance(value, str) and value.strip():
                facts[field] = value.strip()
    audience = BusinessAudience.objects.filter(business=business).first()
    if audience and audience.primary_audience.strip():
        facts["primary_audience"] = audience.primary_audience.strip()
    brand = BusinessBrand.objects.filter(business=business).first()
    if brand and brand.positioning.strip():
        facts["positioning"] = brand.positioning.strip()
    goals = BusinessGoal.objects.filter(business=business).first()
    if goals and goals.primary_goal.strip():
        facts["primary_goal"] = goals.primary_goal.strip()
    return facts


def _from_citations(
    service: OpenRouterService,
    business: Business,
    note: str,
    citations: list[dict[str, str]],
) -> dict:
    try:
        response = service.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You write a short market brief for a small business. "
                        "Use only the research note and the source list. "
                        "Every competitor needs a source_url copied from that list. "
                        "Do not add shops, prices, or awards that are not in the sources. "
                        "Reply with one JSON object and no markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": _synthesis_prompt(business, note, citations),
                },
            ],
            temperature=0.2,
            max_tokens=2000,
            response_format={"type": "json_object"},
            feature="market_research",
            business_id=getattr(business, "id", None),
        )
    except OpenRouterError as exc:
        raise MarketSearchError(
            "Kova searched the market but could not write the brief. You can try again."
        ) from exc

    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise MarketSearchError(
            "Kova searched the market but could not write the brief. You can try again."
        ) from exc

    if not isinstance(content, str):
        return _brief_from_sources(note, citations)

    linked = [
        {"title": item["name"], "url": item["url"], "snippet": ""}
        for item in _named_links(note)
    ]
    try:
        parsed = _parse_json(content)
    except OpenRouterError:
        return _brief_from_sources(note, citations)
    return _keep_cited(parsed, [*citations, *linked])


def _synthesis_prompt(
    business: Business,
    note: str,
    citations: list[dict[str, str]],
) -> str:
    return (
        f"Business: {business.name}\n"
        "Write keys summary, competitors, gap, positioning, sources.\n"
        "summary: two or three sentences on what the public pages show.\n"
        "competitors: a list of objects with name, note, and source_url. "
        "note is one sentence from that page. Omit a competitor when no source states the name.\n"
        "gap: one short paragraph on the opening this business can own, using the business facts and the sources.\n"
        "positioning: one sentence the owner could use. Do not present it as already true in the market.\n"
        "sources: a list of objects with title and url, copied from the source list.\n"
        f"Research note:\n{_readable_note(note)[:1800]}\n"
        "Named sources already found:\n"
        f"{json.dumps(_named_links(note), ensure_ascii=True)}\n"
        "Keep every string on one line and under 400 characters.\n"
        f"Sources:\n{json.dumps(citations, ensure_ascii=True)}"
    )


def _keep_cited(draft: dict, citations: list[dict[str, str]]) -> dict:
    allowed = {_normal_url(item["url"]): item["url"] for item in citations}
    competitors = []
    for item in draft.get("competitors") or []:
        if not isinstance(item, dict):
            continue
        url = allowed.get(_normal_url(str(item.get("source_url") or "")))
        name = str(item.get("name") or "").strip()
        if not url or not name:
            continue
        competitors.append(
            {
                "name": name[:160],
                "note": str(item.get("note") or "").strip()[:500],
                "source_url": url,
            }
        )
        if len(competitors) == 8:
            break

    sources = []
    seen: set[str] = set()
    for item in draft.get("sources") or []:
        if not isinstance(item, dict):
            continue
        url = allowed.get(_normal_url(str(item.get("url") or "")))
        if not url or url in seen:
            continue
        seen.add(url)
        title = str(item.get("title") or url).strip() or url
        sources.append({"title": title[:200], "url": url})
        if len(sources) == 8:
            break

    if not sources:
        sources = [
            {"title": item["title"][:200], "url": item["url"]}
            for item in citations[:8]
        ]

    summary = str(draft.get("summary") or "").strip()[:2000]
    if not summary:
        summary = THIN_SUMMARY

    return {
        "summary": summary,
        "competitors": competitors,
        "gap": str(draft.get("gap") or "").strip()[:1500],
        "positioning": str(draft.get("positioning") or "").strip()[:500],
        "sources": sources,
    }


_LINK = re.compile(r"\[([^\]]{2,120})\]\((https?://[^)\s]+)\)")
_SKIP_LINK_NAMES = {"source", "link", "here", "website"}


def _named_links(note: str) -> list[dict[str, str]]:
    links: list[dict[str, str]] = []
    seen: set[str] = set()
    for match in _LINK.finditer(note or ""):
        name = re.sub(r"[*_#]+", "", match.group(1)).strip()
        url = match.group(2).strip()
        key = _normal_url(url)
        if not name or name.lower() in _SKIP_LINK_NAMES or key in seen:
            continue
        seen.add(key)
        links.append({"name": name[:160], "url": url[:500]})
        if len(links) == 8:
            break
    return links


def _readable_note(note: str) -> str:
    text = _LINK.sub(
        lambda match: re.sub(r"[*_#]+", "", match.group(1)).strip(),
        note or "",
    )
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"^#{1,6}\s*", "", text, flags=re.M)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text[:4000]


def _brief_from_sources(note: str, citations: list[dict[str, str]]) -> dict:
    """Use the search note when the model does not return readable JSON."""

    links = _named_links(note)
    summary = _readable_note(note)
    if not summary:
        snippets = [
            item["snippet"].strip()
            for item in citations
            if item.get("snippet", "").strip()
        ]
        summary = " ".join(snippets)[:1200] or THIN_SUMMARY

    sources = [{"title": item["name"], "url": item["url"]} for item in links]
    seen = {_normal_url(item["url"]) for item in sources}
    for item in citations:
        key = _normal_url(item["url"])
        if key in seen:
            continue
        seen.add(key)
        sources.append({"title": item["title"][:200], "url": item["url"]})
        if len(sources) == 8:
            break

    return {
        "summary": summary,
        "competitors": [
            {"name": item["name"], "note": "", "source_url": item["url"]}
            for item in links
        ],
        "gap": "",
        "positioning": "",
        "sources": sources[:8],
    }


def _thin_brief() -> dict:
    return {
        "summary": THIN_SUMMARY,
        "competitors": [],
        "gap": "",
        "positioning": "",
        "sources": [],
    }


def _normal_url(url: str) -> str:
    return url.strip().split("#", 1)[0].rstrip("/")
