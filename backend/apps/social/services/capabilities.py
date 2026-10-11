"""What a connected account can actually do with the scopes Meta granted."""

from __future__ import annotations

FACEBOOK_FEATURES = (
    ("pages_show_list", "See this Facebook Page"),
    ("pages_manage_posts", "Publish to the Facebook Page"),
    ("pages_read_engagement", "Read Facebook comments and reactions"),
    ("pages_manage_engagement", "Reply to Facebook comments"),
    ("pages_messaging", "Read and reply to Facebook messages"),
)

INSTAGRAM_FEATURES = (
    ("instagram_basic", "See the Instagram account"),
    ("instagram_content_publish", "Publish to Instagram"),
    ("instagram_manage_comments", "Read and reply to Instagram comments"),
    ("instagram_manage_messages", "Read and reply to Instagram messages"),
    ("pages_show_list", "See the linked Facebook Page"),
)

FACEBOOK_REQUESTED_SCOPES = (
    "pages_show_list",
    "pages_manage_posts",
    "pages_read_engagement",
    "pages_manage_engagement",
    "pages_messaging",
)

INSTAGRAM_REQUESTED_SCOPES = (
    *FACEBOOK_REQUESTED_SCOPES,
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_messages",
)

# Full list when documenting or checking reconnect after scope changes.
REQUESTED_SCOPES = INSTAGRAM_REQUESTED_SCOPES


def oauth_scopes_for_platform(platform: str) -> tuple[str, ...]:
    """
    Scopes for the Facebook Login dialog.

    Kova discovers a linked Instagram Professional account from the Page
    token after login (see MetaAdapter.exchange_code). Requesting
    instagram_* scopes here makes Meta show \"Invalid Scopes\" until those
    permissions are added to the app (and often until App Review passes).
    The chosen platform (facebook vs instagram) is carried in OAuth state
    and only changes which SocialAccount records connect_meta creates.
    """

    _ = platform
    return FACEBOOK_REQUESTED_SCOPES


def account_capabilities(account) -> list[dict]:
    granted = {str(scope) for scope in (account.scopes or [])}
    features = (
        INSTAGRAM_FEATURES
        if account.platform == account.Platform.INSTAGRAM
        else FACEBOOK_FEATURES
    )
    return [
        {
            "scope": scope,
            "label": label,
            "available": scope in granted,
        }
        for scope, label in features
    ]
