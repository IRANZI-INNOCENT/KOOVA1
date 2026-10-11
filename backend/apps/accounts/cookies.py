"""HttpOnly refresh-token cookie helpers for Kova authentication."""

from django.conf import settings
from django.http import HttpResponse


REFRESH_COOKIE_NAME = "kova_refresh_token"


def set_refresh_cookie(
    response: HttpResponse,
    refresh_token: str,
) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        max_age=settings.REFRESH_COOKIE_MAX_AGE,
        path=settings.REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: HttpResponse) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )

    if settings.REFRESH_COOKIE_SECURE:
        response.delete_cookie(
            key=REFRESH_COOKIE_NAME,
            path=settings.REFRESH_COOKIE_PATH,
            samesite=settings.REFRESH_COOKIE_SAMESITE,
            secure=True,
        )
