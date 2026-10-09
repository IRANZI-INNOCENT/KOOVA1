from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business

from .models import Lead
from .serializers import LeadSerializer


class LeadListView(APIView):
    """List and create leads for a business."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        leads = Lead.objects.filter(business=business)

        lead_status = request.query_params.get("status")
        if lead_status:
            leads = leads.filter(status=lead_status)

        source = request.query_params.get("source")
        if source:
            leads = leads.filter(source=source)

        return Response(LeadSerializer(leads, many=True).data)

    def post(self, request, business_id):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        serializer = LeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(business=business, created_by_ai=False)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LeadDetailView(APIView):
    """Retrieve, update, or delete a lead."""

    permission_classes = [IsAuthenticated]

    def get(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        lead = get_object_or_404(Lead, pk=pk, business=business)
        return Response(LeadSerializer(lead).data)

    def patch(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        lead = get_object_or_404(Lead, pk=pk, business=business)
        serializer = LeadSerializer(lead, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, business_id, pk):
        business = get_object_or_404(
            Business, id=business_id, owner=request.user
        )
        lead = get_object_or_404(Lead, pk=pk, business=business)
        lead.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
