from django.shortcuts import get_object_or_404

from rest_framework.permissions import BasePermission

from apps.businesses.models import Business


class IsBusinessOwner(BasePermission):
    """
    Allow access only to the authenticated owner of the business.

    Business ownership is a hard application security boundary.
    Kova AI decisions must never be allowed to override it.
    """

    message = "You do not have permission to access this business."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        business_id = view.kwargs.get("business_id")

        if business_id is None:
            return False

        return Business.objects.filter(
            id=business_id,
            owner=request.user,
        ).exists()


def get_owned_business(request, business_id):
    """
    Return a business only when it belongs to the authenticated user.

    Keeping this lookup centralized prevents accidental IDOR-style
    access in Commerce views.
    """

    return get_object_or_404(
        Business,
        id=business_id,
        owner=request.user,
    )