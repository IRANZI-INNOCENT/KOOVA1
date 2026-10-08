from django.urls import path

from .views import (
    CurrentUserView,
    LoginView,
    RefreshTokenView,
    SignupView,
    LogoutView,
    CurrentUserView,
)


urlpatterns = [
    path(
        "signup/",
        SignupView.as_view(),
        name="signup",
    ),
    path(
        "login/",
        LoginView.as_view(),
        name="login",
    ),
    path(
        "refresh/",
        RefreshTokenView.as_view(),
        name="refresh-token",
    ),
    path(
    "me/",
    CurrentUserView.as_view(),
    name="current-user",
),

path(
    "logout/",
    LogoutView.as_view(),
    name="logout",
),
]