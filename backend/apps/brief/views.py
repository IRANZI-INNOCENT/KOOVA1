from django.shortcuts import get_object_or_404

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business
from apps.kova_ai.services.openrouter import OpenRouterError

from .models import MorningBrief, WeeklyReport
from .serializers import MorningBriefSerializer, WeeklyReportSerializer
from .services.gather import current_week_start
from .services.reason import generate_brief
from .services.weekly import generate_weekly_report


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
        force = bool(request.data.get("force", False))

        if force:
            from datetime import date

            MorningBrief.objects.filter(
                business=business,
                date=date.today(),
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


class LatestWeeklyReportView(BriefMixin, APIView):
    """
    GET  → Current week's report (or most recent).
    POST → Generate / regenerate this week's report.
    """

    def get(self, request, business_id):
        business = self.get_business()
        week_start = current_week_start()
        report = (
            WeeklyReport.objects.filter(business=business, week_start=week_start)
            .order_by("-created_at")
            .first()
        )
        if report is None:
            report = (
                WeeklyReport.objects.filter(business=business)
                .order_by("-week_start", "-created_at")
                .first()
            )
        if not report:
            return Response({"detail": "No weekly report generated yet."}, status=404)
        return Response(WeeklyReportSerializer(report).data)

    def post(self, request, business_id):
        business = self.get_business()
        force = bool(request.data.get("force", False))
        try:
            report = generate_weekly_report(business, force=force)
        except (OpenRouterError, Exception) as exc:
            return Response(
                {"detail": f"Kova could not generate the weekly report: {exc}"},
                status=502,
            )
        return Response(WeeklyReportSerializer(report).data)


class WeeklyReportHistoryView(BriefMixin, APIView):
    def get(self, request, business_id):
        business = self.get_business()
        reports = WeeklyReport.objects.filter(
            business=business,
            status=WeeklyReport.Status.READY,
        ).order_by("-week_start")[:8]
        return Response(WeeklyReportSerializer(reports, many=True).data)
