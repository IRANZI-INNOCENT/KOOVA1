"""Search the public web for a market brief.

OpenRouter runs the search. Gemini uses its provider search. Other models
use Exa through the same web plugin. Callers keep only the citations that
come back with the answer.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService


class MarketSearchError(Exception):
    """Raised when market search cannot return a usable result."""


def search_market(
    service: OpenRouterService,
    query: str,
) -> tuple[str, list[dict[str, str]]]:
    """Search once and return the note plus citation records."""

    try:
        response = service.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You search the public web for a small business. "
                        "Report only what the pages say. "
                        "Name a shop, price, or offer only when a result states it. "
                        "If the results are thin, say that plainly."
                    ),
                },
                {"role": "user", "content": query},
            ],
            temperature=0.2,
            max_tokens=1600,
            plugins=[{"id": "web", "max_results": 5}],
            feature="market_research",
        )
    except OpenRouterError as exc:
        raise MarketSearchError(
            "Kova could not search the market just now. You can try again, or leave this step and come back."
        ) from exc

    try:
        message = response["choices"][0]["message"]
    except (KeyError, IndexError, TypeError) as exc:
        raise MarketSearchError(
            "Kova could not read the market search."
        ) from exc

    if not isinstance(message, dict):
        raise MarketSearchError("Kova could not read the market search.")

    return _message_text(message), _citations(message)


def _message_text(message: dict[str, Any]) -> str:
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(part.strip() for part in parts if part.strip())
    return ""


def _citations(message: dict[str, Any]) -> list[dict[str, str]]:
    annotations = message.get("annotations") or []
    if not isinstance(annotations, list):
        return []

    sources: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in annotations:
        if not isinstance(item, dict) or item.get("type") != "url_citation":
            continue
        citation = item.get("url_citation") or {}
        if not isinstance(citation, dict):
            continue
        url = str(citation.get("url") or "").strip()
        if not url.startswith("http"):
            continue
        key = url.split("#", 1)[0].rstrip("/")
        if key in seen:
            continue
        seen.add(key)
        title = str(citation.get("title") or url).strip() or url
        snippet = str(citation.get("content") or "").strip()
        sources.append(
            {
                "title": title[:300],
                "url": url[:500],
                "snippet": snippet[:800],
            }
        )
    return sources
