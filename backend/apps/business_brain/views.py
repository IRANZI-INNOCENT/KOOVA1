from django.shortcuts import get_object_or_404

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.businesses.models import Business

from .models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessProfile,
)

from .models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessPolicy,
    BusinessProfile,
)

from .serializers import (
    BusinessAudienceSerializer,
    BusinessBrandSerializer,
    BusinessGoalSerializer,
    BusinessPolicySerializer,
    BusinessProfileSerializer,
)

from .serializers import (
    BusinessAudienceSerializer,
    BusinessBrandSerializer,
    BusinessGoalSerializer,
    BusinessPolicySerializer,
    BusinessProfileSerializer,
)

from .models import BusinessAudience, BusinessProfile

from .models import (
    BusinessAudience,
    BusinessBrand,
    BusinessProfile,
)

from .serializers import (
    BusinessAudienceSerializer,
    BusinessBrandSerializer,
    BusinessProfileSerializer,
)

class BusinessProfileView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or partially update the Business Brain profile
    belonging to a business owned by the authenticated user.

    The endpoint supports:

        GET   /profile/
        PATCH /profile/

    The business is determined from the URL and ownership is enforced
    on the server.
    """

    serializer_class = BusinessProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_business(self):
        """
        Return the requested business if it belongs to the user.

        get_object_or_404() intentionally returns 404 when the business
        does not belong to the authenticated user. This prevents the
        API from revealing whether another user's business exists.
        """

        return get_object_or_404(
            Business,
            id=self.kwargs["business_id"],
            owner=self.request.user,
        )

    def get_object(self):
        """
        Return the profile belonging to the authenticated user's business.

        If the profile does not exist yet, create it automatically.

        This supports Kova's progressive Business Brain model: a newly
        created business does not need to complete its entire profile
        before the AI can begin learning about it.
        """

        business = self.get_business()

        profile, _ = BusinessProfile.objects.get_or_create(
            business=business,
        )

        return profile

class BusinessAudienceView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or partially update the BusinessAudience profile
    belonging to a business owned by the authenticated user.

    The endpoint supports:

        GET   /audience/
        PATCH /audience/

    The business is determined from the URL and ownership is enforced
    on the server.

    If an audience profile does not exist yet, an empty one is created
    automatically. This allows Kova's Business Brain to grow
    progressively as the business owner provides more information.
    """

    serializer_class = BusinessAudienceSerializer
    permission_classes = [IsAuthenticated]

    def get_business(self):
        """
        Return the requested business if it belongs to the user.

        A 404 is returned when the business does not belong to the
        authenticated user. This prevents the API from revealing
        whether another user's business exists.
        """

        return get_object_or_404(
            Business,
            id=self.kwargs["business_id"],
            owner=self.request.user,
        )

    def get_object(self):
        """
        Return the audience profile belonging to the authenticated
        user's business.

        Create an empty profile automatically if one does not exist.
        """

        business = self.get_business()

        audience, _ = BusinessAudience.objects.get_or_create(
            business=business,
        )

        return audience


class BusinessBrandView(generics.RetrieveUpdateAPIView):
    """
    Retrieve or update the brand configuration for a business.

    Access is restricted to the authenticated owner of the
    requested business.
    """

    serializer_class = BusinessBrandSerializer
    permission_classes = [IsAuthenticated]

    def get_business(self):
        return get_object_or_404(
            Business,
            id=self.kwargs["business_id"],
            owner=self.request.user,
        )

    def get_object(self):
        business = self.get_business()

        brand, _ = BusinessBrand.objects.get_or_create(
            business=business,
        )

        return brand


class BusinessGoalView(generics.RetrieveUpdateAPIView):
    serializer_class = BusinessGoalSerializer
    permission_classes = [IsAuthenticated]

    def get_business(self):
        return get_object_or_404(
            Business,
            id=self.kwargs["business_id"],
            owner=self.request.user,
        )

    def get_object(self):
        business = self.get_business()

        goal, _ = BusinessGoal.objects.get_or_create(
            business=business,
        )

        return goal



class BusinessPolicyView(generics.RetrieveUpdateAPIView):
    serializer_class = BusinessPolicySerializer
    permission_classes = [IsAuthenticated]

    def get_business(self):
        return get_object_or_404(
            Business,
            id=self.kwargs["business_id"],
            owner=self.request.user,
        )

    def get_object(self):
        business = self.get_business()

        policy, _ = BusinessPolicy.objects.get_or_create(
            business=business,
        )

        return policy