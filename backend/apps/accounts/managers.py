from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """
    Manager for Kova's custom User model.

    Kova uses email as the authentication identifier, so this manager
    provides user-creation methods that do not require a username.
    """

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a regular Kova user.

        Args:
            email: The user's unique email address.
            password: The user's raw password.
            **extra_fields: Additional User model fields.

        Returns:
            The newly created User instance.
        """
        if not email:
            raise ValueError("Users must have an email address.")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields,
        )

        # set_password() hashes the password before it is stored.
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a Kova superuser.

        Superusers have full access to Django's administrative system.
        """

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(
            email=email,
            password=password,
            **extra_fields,
        )