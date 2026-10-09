from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Business
from .serializers import BusinessSerializer


class BusinessListCreateView(APIView):
    """
    List businesses owned by the authenticated user or create one.
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):
        """Return the user's businesses."""

        businesses = Business.objects.filter(
            owner=request.user,
        )

        serializer = BusinessSerializer(
            businesses,
            many=True,
        )

        return Response(
            serializer.data,
        )

    def post(self, request):
        """Create a new business for the authenticated user."""

        serializer = BusinessSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        business = serializer.save(
            owner=request.user,
        )

        return Response(
            BusinessSerializer(business).data,
            status=status.HTTP_201_CREATED,
        )


class BusinessDetailView(APIView):
    """
    Retrieve, update, or delete one owned business.
    """

    permission_classes = [
        IsAuthenticated,
    ]

    def get_business(
        self,
        request,
        business_id,
    ):
        """Return only a business owned by the current user."""

        return get_object_or_404(
            Business,
            id=business_id,
            owner=request.user,
        )

    def get(
        self,
        request,
        business_id,
    ):
        business = self.get_business(
            request,
            business_id,
        )

        return Response(
            BusinessSerializer(business).data,
        )

    def patch(
        self,
        request,
        business_id,
    ):
        business = self.get_business(
            request,
            business_id,
        )

        serializer = BusinessSerializer(
            business,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        business = serializer.save()

        return Response(
            BusinessSerializer(business).data,
        )

    def delete(
        self,
        request,
        business_id,
    ):
        business = self.get_business(
            request,
            business_id,
        )

        business.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )