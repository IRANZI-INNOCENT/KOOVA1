from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import Business
from .serializers import BusinessSerializer


class BusinessListCreateView(generics.ListCreateAPIView):
    """
    List and create businesses for the authenticated Kova user.

    GET:
        Returns only businesses owned by the authenticated user.

    POST:
        Creates a new business and automatically assigns the
        authenticated user as its owner.
    """

    serializer_class = BusinessSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return only businesses owned by the authenticated user.

        Filtering at the database-query level prevents users from
        receiving another user's businesses through the API.
        """
        return Business.objects.filter(
            owner=self.request.user,
        )

    def perform_create(self, serializer):
        """
        Assign the authenticated user as the business owner.

        The owner comes from request.user rather than the request body.
        """
        serializer.save(
            owner=self.request.user,
        )


class BusinessDetailView(generics.RetrieveAPIView):
    """
    Retrieve a single business owned by the authenticated user.

    The queryset is restricted to the current user's businesses.
    Therefore, requesting another user's business results in a
    404 response rather than exposing that the business exists.
    """

    serializer_class = BusinessSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Restrict business lookup to the authenticated owner.
        """
        return Business.objects.filter(
            owner=self.request.user,
        )