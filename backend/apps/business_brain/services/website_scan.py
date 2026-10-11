"""Scan a business website and suggest Business Profile field updates."""

from __future__ import annotations

import ipaddress
import json
import re
import socket
from urllib.parse import urlparse

import requests
from django.utils.html import strip_tags

from apps.business_brain.services.draft import SECTION_FIELDS, _parse_json
from apps.business_brain.services.search import search_market
from apps.businesses.models import Business
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService

PROFILE_FIELDS = SECTION_FIELDS["profile"]

_USER_AGENT = "KovaBusinessScanner/1.0"
_MAX_BYTES = 512_000
_MIN_FETCH_CHARS = 180


class WebsiteScanError(Exception):
    """Raised when the website cannot be scanned safely or usefully."""


def scan_website_for_profile(business: Business, website: str) -> dict:
    """Return suggested profile fields from the public website."""

    url = normalize_website_url(website)
    validate_public_url(url)

    service = OpenRouterService(timeout=120)
    page_text, fetch_error = _fetch_page_text(url)
    sources: list[dict[str, str]] = [{"title": url, "url": url, "snippet": ""}]

    if len(page_text) >= _MIN_FETCH_CHARS:
        research_note = (
            f"Text extracted from {url}:\n{page_text[:12000]}"
        )
        sources[0]["snippet"] = page_text[:500]
    else:
        note, citations = search_market(service, _search_prompt(business, url))
        research_note = note.strip()
        if citations:
            sources = [
                {
                    "title": item["title"],
                    "url": item["url"],
                    "snippet": item.get("snippet", "")[:500],
                }
                for item in citations[:6]
            ]
        elif fetch_error and not research_note:
            raise WebsiteScanError(fetch_error)
        if not research_note:
            raise WebsiteScanError(
                "Kova could not read enough from that website. Check the URL is public and try again."
            )

    suggestions = _suggest_fields(service, business, url, research_note)
    summary = _scan_summary(suggestions, url)

    return {
        "website": url,
        "summary": summary,
        "suggestions": suggestions,
        "sources": sources,
    }


def normalize_website_url(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        raise WebsiteScanError("Add a website URL to scan.")
    if not re.match(r"^https?://", value, re.IGNORECASE):
        value = f"https://{value}"
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise WebsiteScanError("Enter a valid website address, for example https://example.com.")
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"
    return f"{parsed.scheme}://{parsed.netloc}{path}".rstrip("/") or f"{parsed.scheme}://{parsed.netloc}"


def validate_public_url(url: str) -> None:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host:
        raise WebsiteScanError("Enter a valid website address.")
    if host in {"localhost", "127.0.0.1", "0.0.0.0"} or host.endswith(".local"):
        raise WebsiteScanError("Kova can only scan public websites.")
    if host.startswith("169.254.") or host.endswith(".internal"):
        raise WebsiteScanError("Kova can only scan public websites.")

    try:
        ipaddress.ip_address(host)
        addresses = [host]
    except ValueError:
        try:
            infos = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
        except socket.gaierror as exc:
            raise WebsiteScanError(
                "Kova could not resolve that website address. Check the spelling and try again."
            ) from exc
        addresses = [info[4][0] for info in infos]

    for address in addresses:
        ip = ipaddress.ip_address(address)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
        ):
            raise WebsiteScanError("Kova can only scan public websites.")


def _fetch_page_text(url: str) -> tuple[str, str]:
    headers = {"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    try:
        response = requests.get(
            url,
            headers=headers,
            timeout=20,
            allow_redirects=True,
        )
    except requests.RequestException as exc:
        return "", "Kova could not open that website. It may be down or blocking automated visits."

    try:
        validate_public_url(response.url)
    except WebsiteScanError:
        return "", "That website redirected to an address Kova is not allowed to open."

    if response.status_code >= 400:
        return "", f"That website returned an error ({response.status_code})."

    raw = response.content[:_MAX_BYTES]
    encoding = response.encoding or "utf-8"
    try:
        html = raw.decode(encoding, errors="replace")
    except LookupError:
        html = raw.decode("utf-8", errors="replace")

    text = strip_tags(html)
    text = re.sub(r"\s+", " ", text).strip()
    return text, ""


def _search_prompt(business: Business, url: str) -> str:
    facts = {
        "name": business.name,
        "description": business.description,
        "industry": business.industry,
        "location": business.location,
        "website": url,
    }
    return (
        f"Read the public website {url} and any indexed pages for this business. "
        "Report what the site says about what they sell, who they serve, and how they operate. "
        "Use only what the pages state. Cite sources with markdown links.\n"
        f"Known business facts:\n{json.dumps(facts, ensure_ascii=True)}"
    )


def _suggest_fields(
    service: OpenRouterService,
    business: Business,
    url: str,
    research_note: str,
) -> dict[str, str]:
    facts = {
        "name": business.name,
        "description": business.description,
        "industry": business.industry,
        "location": business.location,
    }
    try:
        response = service.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You read a business website for Kova. "
                        "Suggest Business Profile fields using only the research note and business facts. "
                        "Do not invent awards, locations, or offers that are not supported. "
                        "business_model and business_stage must be short phrases under 80 characters. "
                        "Reply with one JSON object and no markdown."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Website scanned: {url}\n"
                        f"Required keys: {', '.join(PROFILE_FIELDS)}\n"
                        "mission, value_proposition, target_market: one or two short sentences each when the site supports them.\n"
                        "website: repeat the scanned URL.\n"
                        "Leave a key as an empty string when the site does not mention it.\n"
                        f"Business facts:\n{json.dumps(facts, ensure_ascii=True)}\n"
                        f"Research note:\n{research_note[:14000]}"
                    ),
                },
            ],
            temperature=0.2,
            max_tokens=1400,
            response_format={"type": "json_object"},
        )
    except OpenRouterError as exc:
        raise WebsiteScanError(
            "Kova read the site but could not suggest profile fields. You can try again."
        ) from exc

    try:
        content = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise WebsiteScanError(
            "Kova read the site but could not suggest profile fields. You can try again."
        ) from exc

    if not isinstance(content, str):
        raise WebsiteScanError(
            "Kova read the site but could not suggest profile fields. You can try again."
        )

    parsed = _parse_json(content)
    cleaned: dict[str, str] = {}
    for key in PROFILE_FIELDS:
        value = parsed.get(key)
        if not isinstance(value, str):
            continue
        text = value.strip()
        if key in ("business_model", "business_stage"):
            text = text[:100]
        elif key == "website":
            if text and not text.startswith("http"):
                text = f"https://{text}"
            text = text[:500]
        else:
            text = text[:2000]
        if text:
            cleaned[key] = text

    if not any(cleaned.get(key) for key in PROFILE_FIELDS if key != "website"):
        raise WebsiteScanError(
            "Kova could not find enough on that website to suggest profile fields. "
            "Try a page with more about the business, or fill the fields manually."
        )

    cleaned["website"] = url
    return cleaned


def _scan_summary(suggestions: dict[str, str], url: str) -> str:
    filled = [
        key.replace("_", " ")
        for key in PROFILE_FIELDS
        if key != "website" and suggestions.get(key)
    ]
    if not filled:
        return f"Kova scanned {url} but did not find new profile details."
    label = ", ".join(filled[:4])
    if len(filled) > 4:
        label = f"{label}, and more"
    return f"Kova scanned {url} and suggests updates for {label}. Review before you save."
