from django.urls import path

from .views import (
    EmailPreferenceByTokenView,
    EmailPreferenceView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
)

app_name = "notifications"

urlpatterns = [
    path("preferences/", EmailPreferenceView.as_view(), name="email-preferences"),
    path(
        "preferences/public/",
        EmailPreferenceByTokenView.as_view(),
        name="email-preferences-public",
    ),
    path(
        "password-reset/",
        PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
]
