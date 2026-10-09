from django.shortcuts import get_object_or_404

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business
from apps.kova_ai.services.openrouter import OpenRouterError

from .models import MorningBrief
from .serializers import MorningBriefSerializer
from .services.reason import generate_brief


class BriefMixin:
    permission_classes = [IsAuthenticated]

    def get_business(self):
        return get_object_or_404(
            Business,
            id=self.kwargs["business_id"],
            owner=self.request.user,
        )


class LatestBriefView(BriefMixin, APIView):
    """
    GET  → Return today's brief if it exists (any status).
    POST → Generate (or regenerate) today's brief.
    """

    def get(self, request, business_id):
        business = self.get_business()
        brief = (
            MorningBrief.objects.filter(business=business)
            .order_by("-date", "-created_at")
            .first()
        )
        if not brief:
            return Response({"detail": "No brief generated yet."}, status=404)
        return Response(MorningBriefSerializer(brief).data)

    def post(self, request, business_id):
        business = self.get_business()
        force = request.data.get("force", False)

        if force:
            MorningBrief.objects.filter(
                business=business,
                date=__import__("datetime").date.today(),
            ).delete()

        try:
            brief = generate_brief(business)
        except (OpenRouterError, Exception) as exc:
            return Response(
                {"detail": f"Kova could not generate the brief: {exc}"},
                status=502,
            )
        return Response(MorningBriefSerializer(brief).data)


class BriefHistoryView(BriefMixin, APIView):
    """List previous briefs for a business."""

    def get(self, request, business_id):
        business = self.get_business()
        briefs = MorningBrief.objects.filter(
            business=business,
            status=MorningBrief.Status.READY,
        ).order_by("-date")[:14]
        return Response(MorningBriefSerializer(briefs, many=True).data)
