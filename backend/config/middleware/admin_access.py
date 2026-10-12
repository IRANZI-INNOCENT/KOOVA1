"""Optional gate and IP allowlist for Django admin in production."""

import hashlib
import ipaddress
import secrets

from django.conf import settings
from django.http import HttpResponseForbidden
from django.shortcuts import redirect


GATE_COOKIE_NAME = "kova_admin_gate"
GATE_QUERY_PARAM = "kova_admin_gate"


def _admin_prefix() -> str:
    url = getattr(settings, "KOVA_ADMIN_URL", "admin/")
    if not url.startswith("/"):
        url = f"/{url}"
    return url


def _client_ip(request) -> str:
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    if forwarded:
        return forwarded
    return request.META.get("REMOTE_ADDR") or ""


def _ip_allowed(request) -> bool:
    allowlist = getattr(settings, "KOVA_ADMIN_IP_ALLOWLIST", [])
    if not allowlist:
        return True

    client = _client_ip(request)
    if not client:
        return False

    try:
        client_addr = ipaddress.ip_address(client)
    except ValueError:
        return False

    for entry in allowlist:
        try:
            if "/" in entry:
                if client_addr in ipaddress.ip_network(entry, strict=False):
                    return True
            elif client_addr == ipaddress.ip_address(entry):
                return True
        except ValueError:
            continue

    return False


def _gate_secret_configured() -> bool:
    return bool(getattr(settings, "KOVA_ADMIN_GATE_SECRET", ""))


def _expected_gate_cookie_value() -> str:
    secret = settings.KOVA_ADMIN_GATE_SECRET
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _has_valid_gate_cookie(request) -> bool:
    if not _gate_secret_configured():
        return True

    cookie = request.COOKIES.get(GATE_COOKIE_NAME, "")
    expected = _expected_gate_cookie_value()
    return secrets.compare_digest(cookie, expected)


class AdminAccessMiddleware:
    """
    When KOVA_ADMIN_GATE_SECRET is set, require a gate cookie before /admin/.
    When KOVA_ADMIN_IP_ALLOWLIST is set, block other client IPs.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        prefix = _admin_prefix()

        if not path.startswith(prefix):
            return self.get_response(request)

        if not _ip_allowed(request):
            return HttpResponseForbidden("Admin access is restricted.")

        if _gate_secret_configured():
            supplied = request.GET.get(GATE_QUERY_PARAM, "")
            if supplied and secrets.compare_digest(
                supplied,
                settings.KOVA_ADMIN_GATE_SECRET,
            ):
                clean = request.build_absolute_uri(request.path)
                response = redirect(clean)
                response.set_cookie(
                    GATE_COOKIE_NAME,
                    _expected_gate_cookie_value(),
                    httponly=True,
                    secure=getattr(settings, "KOVA_ADMIN_GATE_COOKIE_SECURE", False),
                    samesite="Lax",
                    max_age=7 * 24 * 60 * 60,
                    path=prefix,
                )
                return response

            if not _has_valid_gate_cookie(request):
                return HttpResponseForbidden(
                    "Admin access requires an authorized entry link.",
                )

        return self.get_response(request)
