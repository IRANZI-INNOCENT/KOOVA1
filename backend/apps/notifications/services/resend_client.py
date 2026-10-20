"""Thin Resend HTTP client."""

from __future__ import annotations

import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    text: str,
) -> dict[str, Any]:
    """
    Send one email via Resend.

    When RESEND_API_KEY is empty, logs and returns a dry-run payload
    so local/dev never crashes domain events.
    """
    api_key = (getattr(settings, "RESEND_API_KEY", None) or "").strip()
    from_addr = (
        getattr(settings, "EMAIL_FROM", None)
        or "KCOVA <noreply@kcova.com>"
    ).strip()

    if not api_key:
        logger.info(
            "Resend dry-run to=%s subject=%s",
            to,
            subject,
        )
        return {"id": "dry-run", "dry_run": True}

    response = requests.post(
        RESEND_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_addr,
            "to": [to],
            "subject": subject,
            "html": html,
            "text": text,
        },
        timeout=20,
    )
    if response.status_code >= 400:
        detail = response.text[:500]
        raise RuntimeError(f"Resend error {response.status_code}: {detail}")
    data = response.json()
    if not isinstance(data, dict):
        return {"id": "", "raw": data}
    return data
