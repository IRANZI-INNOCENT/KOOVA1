"""
Abstract channel adapter.

Every social platform Kova connects to implements this interface.
The adapter translates common Kova actions into each platform's API
calls, so the rest of the codebase never talks to platform APIs
directly.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from apps.social.models import SocialAccount


@dataclass
class PublishResult:
    """Outcome of publishing a post to a platform."""

    success: bool
    external_post_id: str = ""
    error: str = ""
    raw_response: dict[str, Any] | None = None


@dataclass
class AccountInfo:
    """Profile info retrieved from the platform."""

    platform_account_id: str
    name: str
    username: str = ""
    profile_picture_url: str = ""
    followers: int = 0
    metadata: dict[str, Any] | None = None


@dataclass
class MetaPageGrant:
    """One Facebook Page (and optional linked Instagram) from Meta OAuth."""

    page_id: str
    page_name: str
    page_access_token: str
    instagram_account_id: str = ""
    instagram_username: str = ""


@dataclass
class TokenExchange:
    """Result of exchanging an auth code for tokens."""

    access_token: str
    expires_in: int | None = None
    scopes: list[str] | None = None
    page_id: str = ""
    page_name: str = ""
    page_access_token: str = ""
    instagram_account_id: str = ""
    instagram_username: str = ""
    pages: list[MetaPageGrant] | None = None


class ChannelAdapter(ABC):
    """
    Base interface for all social platform adapters.

    Subclasses implement the concrete API calls.  The social engine
    calls these methods without knowing which platform it is talking to.
    """

    @abstractmethod
    def exchange_code(self, code: str, redirect_uri: str) -> TokenExchange:
        """Exchange an OAuth authorization code for access tokens."""

    @abstractmethod
    def get_account_info(self, account: SocialAccount) -> AccountInfo:
        """Fetch current profile info from the platform."""

    @abstractmethod
    def verify_connection(self, account: SocialAccount) -> bool:
        """Return True if the stored token is still valid."""

    @abstractmethod
    def publish_post(
        self,
        account: SocialAccount,
        caption: str,
        *,
        image_url: str = "",
        link: str = "",
    ) -> PublishResult:
        """Publish a post through the platform API."""

    @abstractmethod
    def refresh_token(self, account: SocialAccount) -> str:
        """Refresh the access token and return the new one."""

    @abstractmethod
    def get_post_metrics(
        self,
        account: SocialAccount,
        external_post_id: str,
    ) -> dict[str, int]:
        """Fetch reach, impressions, likes, comments, shares, clicks."""
