"""Meta (Facebook/Instagram) webhook verification helpers."""

import hashlib
import hmac
import secrets


def verify_signature(
    raw_body: bytes,
    signature_header: str | None,
    app_secret: str,
) -> bool:
    """
    Validate X-Hub-Signature-256 from Meta.

    See Meta Webhooks documentation: HMAC-SHA256 of the raw POST body.
    """
    if not app_secret or not signature_header:
        return False

    header = signature_header.strip()
    if not header.startswith("sha256="):
        return False

    expected_hex = header[7:]
    digest = hmac.new(
        app_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    return secrets.compare_digest(digest, expected_hex)
