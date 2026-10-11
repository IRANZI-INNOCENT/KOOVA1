"""
Social account views.

These views handle listing, connecting, disconnecting, and verifying
social accounts for a business.
"""

import os
from urllib.parse import quote

from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business
from apps.social.adapters.meta import MetaAdapterError

from .models import SocialAccount, SocialAction, SocialMessage, SocialPost
from .serializers import (
    SocialAccountSerializer,
    SocialActionSerializer,
    SocialMessageSerializer,
    SocialPostSerializer,
)
from .services.connection import (
    connect_meta,
    disconnect_account,
    instagram_link_status,
    verify_account,
)


# ------------------------------------------------------------------ #
# Social accounts
# ------------------------------------------------------------------ #

class SocialAccountListView(APIView):
    """List connected social accounts for a business."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        accounts = SocialAccount.objects.filter(business=business)
        return Response(SocialAccountSerializer(accounts, many=True).data)


class SocialAccountDetailView(APIView):
    """Retrieve or disconnect a social account."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        account = get_object_or_404(SocialAccount, pk=pk, business=business)
        return Response(SocialAccountSerializer(account).data)

    def delete(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        account = get_object_or_404(SocialAccount, pk=pk, business=business)
        disconnect_account(account)
        return Response(
            {"detail": f"{account.account_name} disconnected."},
            status=status.HTTP_200_OK,
        )


# ------------------------------------------------------------------ #
# Meta OAuth
# ------------------------------------------------------------------ #

class MetaOAuthURLView(APIView):
    """Return the Facebook login URL the frontend should redirect to."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        get_object_or_404(Business, id=business_id, owner=request.user)
        app_id = os.getenv("FACEBOOK_APP_ID", "")
        if not app_id:
            return Response(
                {"detail": "Meta connection is not configured yet."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        redirect_uri = request.build_absolute_uri("/api/social/meta/callback/")
        chosen = request.query_params.get("platform", "facebook")
        if chosen not in {"facebook", "instagram"}:
            chosen = "facebook"
        from .services.capabilities import oauth_scopes_for_platform

        scopes = ",".join(oauth_scopes_for_platform(chosen))
        reconnect = request.query_params.get("reconnect", "").lower() in {
            "1",
            "true",
            "yes",
        }
        url = (
            f"https://www.facebook.com/v21.0/dialog/oauth"
            f"?client_id={app_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scopes}"
            f"&state={business_id}:{chosen}"
            f"&response_type=code"
        )
        if reconnect:
            url += "&auth_type=rerequest"
        return Response({"url": url, "platform": chosen, "scopes": list(oauth_scopes_for_platform(chosen))})


class MetaOAuthCallbackView(APIView):
    """
    Receive the Facebook OAuth callback.

    The frontend redirects the user to Facebook.  Facebook redirects
    back to this endpoint with a code and the business_id in state.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        code = request.data.get("code", "")
        if not code:
            return Response(
                {"detail": "Missing authorization code."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        redirect_uri = request.data.get(
            "redirect_uri",
            request.build_absolute_uri("/api/social/meta/callback/"),
        )
        platform = (request.data.get("platform") or "both").strip().lower()
        try:
            result = connect_meta(business, code, redirect_uri, platform=platform)
        except MetaAdapterError as exc:
            payload = {
                "detail": str(exc),
                "error_code": exc.code,
                **exc.details,
            }
            return Response(
                payload,
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(result, status=status.HTTP_201_CREATED)


class MetaInstagramReadinessView(APIView):
    """
    Check whether Instagram Professional is linked to the business's
    connected Facebook Page before running another OAuth flow.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business,
            id=business_id,
            owner=request.user,
        )
        return Response(instagram_link_status(business))


class MetaOAuthReturnView(APIView):
    """
    Browser return from Facebook Login.

    Facebook sends the person here with a code. Kova sends them back
    to Channels, which finishes the connection while they are signed in.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        frontend = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        destination = f"{frontend}/workspace/social/channels"
        code = request.query_params.get("code", "")
        state = request.query_params.get("state", "")
        if request.query_params.get("error") or not code:
            return redirect(f"{destination}?meta_error=1")
        return redirect(
            f"{destination}?meta_code={quote(code, safe='')}&meta_state={quote(state, safe='')}"
        )


# ------------------------------------------------------------------ #
# Verify connection
# ------------------------------------------------------------------ #

class SocialAccountVerifyView(APIView):
    """Check whether a social account's token is still valid."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        account = get_object_or_404(SocialAccount, pk=pk, business=business)
        healthy = verify_account(account)
        account.refresh_from_db()
        return Response(SocialAccountSerializer(account).data)


# ------------------------------------------------------------------ #
# Social posts
# ------------------------------------------------------------------ #

class SocialPostListView(APIView):
    """List social posts for a business."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        posts = SocialPost.objects.filter(
            social_account__business=business,
        ).select_related("social_account", "content")
        return Response(SocialPostSerializer(posts, many=True).data)


# ------------------------------------------------------------------ #
# Action log
# ------------------------------------------------------------------ #

class SocialActionListView(APIView):
    """List recent social actions for a business."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        actions = SocialAction.objects.filter(business=business)[:50]
        return Response(SocialActionSerializer(actions, many=True).data)


# ------------------------------------------------------------------ #
# Social overview (aggregated health)
# ------------------------------------------------------------------ #

class SocialOverviewView(APIView):
    """Return a summary of the business's social health."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user,
        )
        accounts = SocialAccount.objects.filter(business=business)
        connected = accounts.filter(
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        ).count()
        total = accounts.count()

        from apps.content.models import Content

        drafts = Content.objects.filter(
            business=business, status=Content.Status.DRAFT,
        ).count()
        approved = Content.objects.filter(
            business=business, status=Content.Status.APPROVED,
        ).count()
        published = Content.objects.filter(
            business=business, status=Content.Status.PUBLISHED,
        ).count()

        pending_actions = SocialAction.objects.filter(
            business=business,
            action_status=SocialAction.ActionStatus.PENDING,
        ).count()

        recent_actions = SocialActionSerializer(
            SocialAction.objects.filter(business=business)[:10],
            many=True,
        ).data

        from .services.command import build_social_command

        return Response({
            "channels": {
                "connected": connected,
                "total": total,
                "accounts": SocialAccountSerializer(accounts, many=True).data,
            },
            "content": {
                "drafts": drafts,
                "approved": approved,
                "published": published,
            },
            "pending_actions": pending_actions,
            "recent_actions": recent_actions,
            "command": build_social_command(business),
        })


class AutopilotShiftView(APIView):
    """Show the current Autopilot shift, and start one when asked."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(Business, id=business_id, owner=request.user)
        return Response(_autopilot_payload(business))

    def post(self, request, business_id):
        business = get_object_or_404(Business, id=business_id, owner=request.user)
        from .services.autopilot import run_shift

        try:
            run_shift(business, force=bool(request.data.get("force")))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_autopilot_payload(business))


def _autopilot_payload(business):
    from apps.business_brain.models import BusinessPolicy
    from .services.autopilot import business_picture, latest_shift, shift_work
    from .services.publish import refresh_due_metrics

    policy = BusinessPolicy.objects.filter(business=business).first()
    active = bool(
        policy and policy.social_operating_mode == BusinessPolicy.OperatingMode.AUTOPILOT
    )
    shift = latest_shift(business)
    refresh_due_metrics(business.id)
    return {
        "active": active,
        "shift": None
        if shift is None
        else {
            "id": shift.id,
            "status": shift.status,
            "started_at": shift.started_at.isoformat(),
            "finished_at": shift.finished_at.isoformat() if shift.finished_at else None,
        },
        "work": shift_work(business, shift) if shift is not None else _empty_work(),
        "picture": business_picture(business),
    }


def _empty_work():
    return {
        "summary": {"posts": "—", "replies": "—", "listings": "—", "report": "—"},
        "posts": [],
        "replies": [],
        "listings": [],
        "report": [],
        "stopped": "",
    }


class SocialDispatchView(APIView):
    """Send posts whose scheduled time has arrived."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id):
        from .services.publish import dispatch_due

        get_object_or_404(Business, id=business_id, owner=request.user)
        attempted = dispatch_due(business_id)
        return Response({"attempted": attempted})


class SocialPostRetryView(APIView):
    """Try a failed post again."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, pk):
        from .services.publish import PublishError, dispatch_post

        business = get_object_or_404(Business, id=business_id, owner=request.user)
        post = get_object_or_404(
            SocialPost, pk=pk, social_account__business=business,
        )
        if post.publishing_status == SocialPost.PublishingStatus.PUBLISHED:
            return Response(SocialPostSerializer(post).data)
        post.publishing_attempts = 0
        post.save(update_fields=["publishing_attempts", "updated_at"])
        try:
            dispatch_post(post)
        except PublishError as exc:
            post.refresh_from_db()
            return Response(
                {"detail": str(exc), "post": SocialPostSerializer(post).data},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post.refresh_from_db()
        return Response(SocialPostSerializer(post).data)


class SocialPostMetricsView(APIView):
    """Refresh reach and engagement for one published post."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, pk):
        from .services.publish import refresh_metrics

        business = get_object_or_404(Business, id=business_id, owner=request.user)
        post = get_object_or_404(
            SocialPost, pk=pk, social_account__business=business,
        )
        refresh_metrics(post)
        post.refresh_from_db()
        return Response(SocialPostSerializer(post).data)


class SocialPerformanceView(APIView):
    """Counts for analytics and social performance."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        from .services.performance import performance_snapshot

        business = get_object_or_404(Business, id=business_id, owner=request.user)
        return Response(performance_snapshot(business))


class SocialMessageListView(APIView):
    """List messages, or log one the owner received outside the webhook."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(Business, id=business_id, owner=request.user)
        from .services.inbox import pull_recent_comments

        pull_recent_comments(business)
        messages = SocialMessage.objects.filter(business=business).order_by("-created_at")[:200]
        return Response(SocialMessageSerializer(messages, many=True).data)

    def post(self, request, business_id):
        from .services.inbox import record_inbound

        business = get_object_or_404(Business, id=business_id, owner=request.user)
        body = (request.data.get("body") or "").strip()
        if not body:
            return Response({"detail": "Write the customer's message."}, status=400)
        channel = request.data.get("channel") or SocialMessage.Channel.WHATSAPP
        kind = request.data.get("kind") or SocialMessage.Kind.MESSAGE
        message = record_inbound(
            business=business,
            body=body,
            channel=channel,
            customer_name=request.data.get("customer_name") or "",
            kind=kind,
        )
        return Response(SocialMessageSerializer(message).data, status=201)


class SocialMessageReplyView(APIView):
    """Save a reply to a customer message."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, pk):
        from .services.inbox import send_reply

        business = get_object_or_404(Business, id=business_id, owner=request.user)
        message = get_object_or_404(SocialMessage, pk=pk, business=business)
        body = (request.data.get("body") or "").strip()
        if not body:
            return Response({"detail": "Write a reply."}, status=400)
        reply = send_reply(message, body)
        return Response(SocialMessageSerializer(reply).data, status=201)


class SocialMessageDraftView(APIView):
    """Ask Kova to draft a reply for one comment or message."""

    permission_classes = [IsAuthenticated]

    def post(self, request, business_id, pk):
        from apps.kova_ai.services.openrouter import OpenRouterError

        from .services.inbox import draft_reply

        business = get_object_or_404(Business, id=business_id, owner=request.user)
        message = get_object_or_404(
            SocialMessage,
            pk=pk,
            business=business,
            direction=SocialMessage.Direction.INBOUND,
        )
        try:
            message = draft_reply(message)
        except OpenRouterError as exc:
            return Response({"detail": str(exc)}, status=502)
        return Response(SocialMessageSerializer(message).data)


class MetaWebhookView(APIView):
    """
    Receive comments and messages from Meta.

    GET answers the hub challenge. POST stores text Meta sends and
    creates a lead when the text shows buying intent.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        token = os.getenv("FACEBOOK_WEBHOOK_VERIFY_TOKEN", "kova")
        if request.query_params.get("hub.verify_token") == token:
            return HttpResponse(request.query_params.get("hub.challenge") or "")
        return Response({"detail": "Verification failed."}, status=403)

    def post(self, request):
        from .services.inbox import record_inbound

        for entry in request.data.get("entry") or []:
            page_id = str(entry.get("id") or "")
            account = SocialAccount.objects.filter(platform_account_id=page_id).first()
            if account is None:
                continue
            channel = (
                SocialMessage.Channel.INSTAGRAM
                if account.platform == SocialAccount.Platform.INSTAGRAM
                else SocialMessage.Channel.FACEBOOK
            )
            for item in entry.get("messaging") or []:
                text = ((item.get("message") or {}).get("text") or "").strip()
                sender_id = str((item.get("sender") or {}).get("id") or "")
                if not text:
                    continue
                record_inbound(
                    business=account.business,
                    body=text,
                    channel=channel,
                    kind=SocialMessage.Kind.MESSAGE,
                    customer_name=sender_id,
                    external_id=str((item.get("message") or {}).get("mid") or ""),
                    reply_target_id=sender_id,
                    social_account=account,
                )
            for change in entry.get("changes") or []:
                value = change.get("value") or {}
                text = (value.get("text") or value.get("message") or "").strip()
                if not text:
                    continue
                comment_id = str(value.get("comment_id") or "")
                is_comment = bool(comment_id) or value.get("item") == "comment" or change.get("field") == "comments"
                record_inbound(
                    business=account.business,
                    body=text,
                    channel=channel,
                    kind=SocialMessage.Kind.COMMENT if is_comment else SocialMessage.Kind.MESSAGE,
                    customer_name=str((value.get("from") or {}).get("name") or ""),
                    external_id=comment_id or str(value.get("id") or ""),
                    reply_target_id=comment_id or str((value.get("from") or {}).get("id") or ""),
                    social_account=account,
                )
        return Response({"ok": True})
