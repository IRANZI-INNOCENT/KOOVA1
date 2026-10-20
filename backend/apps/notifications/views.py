from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import EmailPreference
from apps.notifications.serializers import EmailPreferenceSerializer
from apps.notifications.services.events import send_password_reset
from apps.notifications.services.notify import get_or_create_prefs
from apps.notifications.services.render import site_base_url

User = get_user_model()
token_generator = PasswordResetTokenGenerator()


class EmailPreferenceView(APIView):
    """GET/PATCH authenticated user's email preferences."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs = get_or_create_prefs(request.user)
        return Response(EmailPreferenceSerializer(prefs).data)

    def patch(self, request):
        prefs = get_or_create_prefs(request.user)
        serializer = EmailPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EmailPreferenceByTokenView(APIView):
    """Allow managing prefs from the email footer without login."""

    permission_classes = [AllowAny]

    def get(self, request):
        token = (request.query_params.get("token") or "").strip()
        prefs = EmailPreference.objects.filter(token=token).select_related("user").first()
        if prefs is None:
            return Response({"detail": "Invalid preferences link."}, status=404)
        data = EmailPreferenceSerializer(prefs).data
        data["email"] = prefs.user.email
        return Response(data)

    def patch(self, request):
        token = (request.data.get("token") or request.query_params.get("token") or "").strip()
        prefs = EmailPreference.objects.filter(token=token).first()
        if prefs is None:
            return Response({"detail": "Invalid preferences link."}, status=404)
        serializer = EmailPreferenceSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        # Always return 200 to avoid account enumeration.
        if email:
            user = User.objects.filter(email=email).first()
            if user is not None:
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = token_generator.make_token(user)
                reset_url = f"{site_base_url()}/reset-password?uid={uid}&token={token}"
                send_password_reset(user, reset_url=reset_url)
        return Response(
            {"detail": "If that email is on KCOVA, a reset link is on the way."}
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = (request.data.get("uid") or "").strip()
        token = (request.data.get("token") or "").strip()
        password = request.data.get("password") or ""
        if not uid or not token or not password:
            return Response({"detail": "Missing reset details."}, status=400)
        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."},
                status=400,
            )
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Invalid reset link."}, status=400)
        if not token_generator.check_token(user, token):
            return Response({"detail": "This reset link is invalid or expired."}, status=400)
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        try:
            validate_password(password, user)
        except ValidationError as exc:
            return Response({"detail": " ".join(exc.messages)}, status=400)
        user.set_password(password)
        user.save(update_fields=["password"])
        return Response({"detail": "Password updated. You can sign in."})
