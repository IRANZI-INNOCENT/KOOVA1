from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """
    Kova's custom user model.

    Email is used as the primary authentication identifier instead
    of Django's default username field.
    """

    # Kova authenticates users using their email address.
    username = None

    # Every Kova account must have a unique email address.
    email = models.EmailField(
        unique=True,
        db_index=True,
    )

    # Basic profile information.
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    # Account lifecycle timestamps.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Tell Django to authenticate using email instead of username.
    USERNAME_FIELD = "email"

    # No additional fields are required by createsuperuser.
    REQUIRED_FIELDS = []

    # Use Kova's email-based manager.
    objects = UserManager()

    def __str__(self):
        """Return the user's email as their readable identifier."""
        return self.email