import json

from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.kova_ai.services.openrouter import OpenRouterError

from .services.draft import SECTIONS, draft_section, section_is_complete
from .services.research import research_market
from .services.search import MarketSearchError

from apps.businesses.models import Business

from .models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessPolicy,
    BusinessProfile,
)

from .serializers import (
    BusinessAudienceSerializer,
    BusinessBrandSerializer,
    BusinessGoalSerializer,
    BusinessMarketBriefSerializer,
    BusinessPolicySerializer,
    BusinessProfileSerializer,
)


class BusinessBrainMixin:
    """
    Common logic for Business Brain views.

    Every Business Brain view requires:
    - The user to be authenticated.
    - The requested business to belong to the user.
    - The Brain record to be created lazily if it doesn't exist.
    """

    permission_classes = [IsAuthenticated]

    def get_business(self):
        """
        Return the requested business if it belongs to the user.

        Returns 404 when the business does not belong to the
        authenticated user so the API does not reveal whether
        another user's business exists.
        """

        return get_object_or_404(
            Business,
            id=self.kwargs["business_id"],
            owner=self.request.user,
        )


class BusinessProfileView(BusinessBrainMixin, generics.RetrieveUpdateAPIView):
    """
    Retrieve or partially update the Business Brain profile.

    Supports GET and PATCH. The profile is created lazily so Kova's
    Business Brain can grow progressively.
    """

    serializer_class = BusinessProfileSerializer

    def get_object(self):
        business = self.get_business()
        profile, _ = BusinessProfile.objects.get_or_create(
            business=business,
        )
        return profile


class BusinessAudienceView(BusinessBrainMixin, generics.RetrieveUpdateAPIView):
    """
    Retrieve or partially update the Business Audience profile.

    The audience profile describes the customers Kova should consider
    when creating content, engaging, and selling.
    """

    serializer_class = BusinessAudienceSerializer

    def get_object(self):
        business = self.get_business()
        audience, _ = BusinessAudience.objects.get_or_create(
            business=business,
        )
        return audience


class BusinessBrandView(BusinessBrainMixin, generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the brand configuration.

    The brand defines voice, tone, personality, and content style
    Kova should use when representing the business.
    """

    serializer_class = BusinessBrandSerializer

    def get_object(self):
        business = self.get_business()
        brand, _ = BusinessBrand.objects.get_or_create(
            business=business,
        )
        return brand


class BusinessGoalView(BusinessBrainMixin, generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the business goals.

    Goals tell Kova what the business wants to achieve so it can
    optimize content, leads, and recommendations.
    """

    serializer_class = BusinessGoalSerializer

    def get_object(self):
        business = self.get_business()
        goal, _ = BusinessGoal.objects.get_or_create(
            business=business,
        )
        return goal


class BusinessPolicyView(BusinessBrainMixin, generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the business policies.

    Policies define what Kova may do automatically, what requires
    owner approval, and what is prohibited.
    """

    serializer_class = BusinessPolicySerializer

    def get_object(self):
        business = self.get_business()
        policy, _ = BusinessPolicy.objects.get_or_create(
            business=business,
        )
        return policy


class BusinessBrainProgressView(BusinessBrainMixin, APIView):
    """Tell the setup flow which Business Brain sections still need the owner."""

    def get(self, request, business_id):
        business = self.get_business()
        steps = [
            ("profile", "Business Profile", "/workspace/settings/business-profile"),
            ("audience", "Business Audience", "/workspace/settings/business-audience"),
            ("brand", "Business Brand", "/workspace/settings/business-brand"),
            ("goals", "Business Goals", "/workspace/settings/business-goals"),
            ("policy", "Business Policies", "/workspace/settings/business-policy"),
            ("market", "Market position", "/workspace/settings/business-market"),
        ]
        sections = []
        next_href = None
        for key, label, href in steps:
            complete = section_is_complete(business, key)
            setup_href = f"{href}?setup=1"
            sections.append(
                {
                    "key": key,
                    "label": label,
                    "complete": complete,
                    "href": setup_href,
                }
            )
            if not complete and next_href is None:
                next_href = setup_href
        return Response({"sections": sections, "next_href": next_href})


class BusinessBrainDraftView(BusinessBrainMixin, APIView):
    """Draft one Business Brain section from the business setup the owner already saved."""

    def post(self, request, business_id):
        business = self.get_business()
        section = request.data.get("section")
        if section not in SECTIONS:
            return Response(
                {"detail": "Choose a Business Brain section to draft."},
                status=400,
            )
        try:
            draft = draft_section(business, section)
        except (OpenRouterError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=502)
        return Response(draft)


class BusinessMarketBriefView(BusinessBrainMixin, generics.RetrieveUpdateAPIView):
    """Retrieve or edit the prose of the market brief."""

    serializer_class = BusinessMarketBriefSerializer

    def get_object(self):
        business = self.get_business()
        brief, _created = BusinessMarketBrief.objects.get_or_create(business=business)
        return brief


class BusinessMarketResearchView(BusinessBrainMixin, APIView):
    """Search the public web and replace the current brief. Keeping it is a separate choice."""

    def post(self, request, business_id):
        business = self.get_business()
        try:
            brief = research_market(business)
        except (MarketSearchError, OpenRouterError, json.JSONDecodeError) as exc:
            detail = (
                "Kova could not finish the market brief. You can try again."
                if isinstance(exc, json.JSONDecodeError)
                else str(exc)
            )
            return Response({"detail": detail}, status=502)
        return Response(BusinessMarketBriefSerializer(brief).data)


class BusinessMarketDecisionView(BusinessBrainMixin, APIView):
    """Keep the brief for Kova, or leave it stored without using it."""

    def post(self, request, business_id):
        business = self.get_business()
        kept = request.data.get("kept")
        if not isinstance(kept, bool):
            return Response(
                {"detail": "Choose whether to keep the market brief."},
                status=400,
            )
        brief, _created = BusinessMarketBrief.objects.get_or_create(business=business)
        if kept and brief.researched_at is None and not brief.summary.strip():
            return Response(
                {"detail": "Research the market before keeping the brief."},
                status=400,
            )
        brief.kept = kept
        brief.status = (
            BusinessMarketBrief.Status.READY
            if kept
            else BusinessMarketBrief.Status.SKIPPED
        )
        brief.save(update_fields=["kept", "status", "updated_at"])
        return Response(BusinessMarketBriefSerializer(brief).data)
