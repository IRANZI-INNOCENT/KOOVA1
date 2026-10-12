"""Pull LinkedIn member profile fields into Kova's brain when connected."""

from __future__ import annotations

from typing import Any

import requests
from django.utils import timezone

from ..models import LinkedInConnection
from .linkedin import LinkedInError, _api_headers, fetch_member_profile


def sync_connection_profile(connection: LinkedInConnection) -> dict[str, Any]:
    """Fetch what LinkedIn allows for this token and store on the connection."""
    if connection.connection_status != LinkedInConnection.Status.CONNECTED:
        raise LinkedInError("LinkedIn is not connected.")
    if not (connection.access_token or "").strip():
        raise LinkedInError("LinkedIn access token missing.")

    snapshot = build_profile_snapshot(connection.access_token)
    connection.profile_snapshot = snapshot
    connection.profile_synced_at = timezone.now()
    connection.save(
        update_fields=["profile_snapshot", "profile_synced_at", "updated_at"],
    )
    _maybe_prefill_kova_profile(connection, snapshot)
    return snapshot


def build_profile_snapshot(access_token: str) -> dict[str, Any]:
    openid = fetch_member_profile(access_token)
    snapshot: dict[str, Any] = {
        "openid": {
            "member_id": openid.get("sub", ""),
            "name": openid.get("name", ""),
            "given_name": openid.get("given_name", ""),
            "family_name": openid.get("family_name", ""),
            "email": openid.get("email", ""),
            "picture": openid.get("picture", ""),
            "locale": openid.get("locale", ""),
        },
        "sources": ["openid_userinfo"],
    }

    identity = _fetch_identity_me(access_token)
    if identity:
        snapshot["identity_me"] = identity
        snapshot["sources"].append("identity_me")
        _merge_identity_me(snapshot, identity)

    legacy = _fetch_v2_me(access_token)
    if legacy:
        snapshot["v2_me"] = legacy
        snapshot["sources"].append("v2_me")
        _merge_v2_me(snapshot, legacy)

    positions = _fetch_positions(access_token)
    if positions:
        snapshot["positions"] = positions
        snapshot["sources"].append("positions")

    if snapshot.get("vanity_name"):
        snapshot["profile_url"] = f"https://www.linkedin.com/in/{snapshot['vanity_name']}/"

    return snapshot


def profile_knowledge_for_brain(connection: LinkedInConnection | None) -> dict[str, Any]:
    if connection is None or connection.connection_status != LinkedInConnection.Status.CONNECTED:
        return {}
    raw = connection.profile_snapshot if isinstance(connection.profile_snapshot, dict) else {}
    if not raw:
        return {"available": False}

    positions = raw.get("positions") or []
    position_lines = []
    for row in positions[:6]:
        if not isinstance(row, dict):
            continue
        title = row.get("title") or ""
        company = row.get("company") or ""
        if title or company:
            position_lines.append(
                f"{title} at {company}".strip(" at ")
                if company
                else title,
            )

    return {
        "available": True,
        "synced_at": (
            connection.profile_synced_at.isoformat()
            if connection.profile_synced_at
            else ""
        ),
        "name": raw.get("name") or (raw.get("openid") or {}).get("name", ""),
        "headline": raw.get("headline") or "",
        "summary": (raw.get("summary") or "")[:1200],
        "location": raw.get("location") or "",
        "profile_url": raw.get("profile_url") or "",
        "photo_url": raw.get("photo_url") or (raw.get("openid") or {}).get("picture", ""),
        "positions": position_lines,
        "sources": raw.get("sources") or [],
    }


def _maybe_prefill_kova_profile(
    connection: LinkedInConnection,
    snapshot: dict[str, Any],
) -> None:
    profile = connection.profile
    updates: list[str] = []

    if not (profile.headline or "").strip() and (snapshot.get("headline") or "").strip():
        profile.headline = str(snapshot["headline"])[:220]
        updates.append("headline")

    if not (profile.role_title or "").strip():
        role = _guess_role_title(snapshot)
        if role:
            profile.role_title = role[:120]
            updates.append("role_title")

    if updates:
        updates.append("updated_at")
        profile.save(update_fields=updates)


def _guess_role_title(snapshot: dict[str, Any]) -> str:
    positions = snapshot.get("positions") or []
    if positions and isinstance(positions[0], dict):
        title = positions[0].get("title") or ""
        if title:
            return str(title)[:120]
    headline = (snapshot.get("headline") or "").strip()
    if headline and "|" in headline:
        return headline.split("|")[0].strip()[:120]
    return headline[:120]


def _fetch_identity_me(access_token: str) -> dict[str, Any] | None:
    response = requests.get(
        "https://api.linkedin.com/rest/identityMe",
        headers=_api_headers(access_token),
        timeout=30,
    )
    if not response.ok:
        return None
    try:
        payload = response.json()
    except ValueError:
        return None
    return payload if isinstance(payload, dict) else None


def _fetch_v2_me(access_token: str) -> dict[str, Any] | None:
    response = requests.get(
        "https://api.linkedin.com/v2/me",
        params={
            "projection": (
                "(id,localizedFirstName,localizedLastName,localizedHeadline,vanityName)"
            ),
        },
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        timeout=30,
    )
    if not response.ok:
        return None
    try:
        payload = response.json()
    except ValueError:
        return None
    return payload if isinstance(payload, dict) else None


def _fetch_positions(access_token: str) -> list[dict[str, str]] | None:
    response = requests.get(
        "https://api.linkedin.com/v2/me",
        params={
            "projection": (
                "(positions*(title,companyName,description,timePeriod))"
            ),
        },
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        timeout=30,
    )
    if not response.ok:
        return None
    try:
        payload = response.json()
    except ValueError:
        return None
    elements = (payload.get("positions") or {}).get("elements") or []
    rows: list[dict[str, str]] = []
    for item in elements[:8]:
        if not isinstance(item, dict):
            continue
        rows.append(
            {
                "title": _localized(item.get("title")),
                "company": str(item.get("companyName") or ""),
                "description": _localized(item.get("description"))[:400],
            },
        )
    return rows or None


def _merge_identity_me(snapshot: dict[str, Any], identity: dict[str, Any]) -> None:
    basic = identity.get("basicInfo") or identity.get("basicProfile") or identity
    if isinstance(basic, dict):
        snapshot.setdefault("name", basic.get("name") or basic.get("fullName") or "")
        snapshot.setdefault("headline", basic.get("headline") or "")
        snapshot.setdefault("summary", basic.get("summary") or basic.get("about") or "")
        snapshot.setdefault("location", basic.get("location") or "")
        snapshot.setdefault("vanity_name", basic.get("vanityName") or "")


def _merge_v2_me(snapshot: dict[str, Any], me: dict[str, Any]) -> None:
    first = _localized(me.get("localizedFirstName"))
    last = _localized(me.get("localizedLastName"))
    name = f"{first} {last}".strip()
    if name:
        snapshot.setdefault("name", name)
    headline = _localized(me.get("localizedHeadline"))
    if headline:
        snapshot.setdefault("headline", headline)
    vanity = me.get("vanityName") or ""
    if vanity:
        snapshot.setdefault("vanity_name", vanity)


def _localized(field: Any) -> str:
    if isinstance(field, dict):
        localized = field.get("localized")
        if isinstance(localized, dict) and localized:
            return str(next(iter(localized.values())) or "")
        if field.get("preferredLocale"):
            return str(field.get("text") or "")
    return str(field or "")
