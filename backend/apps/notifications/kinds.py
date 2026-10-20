"""Stable email kind IDs and preference category mapping."""

from __future__ import annotations


class EmailKind:
    WELCOME = "welcome"
    PASSWORD_RESET = "password_reset"
    PUBLISH_FAILED = "publish_failed"
    AUTOMATION_PAUSED = "automation_paused"
    APPROVAL_NEEDED = "approval_needed"
    NEW_LEAD = "new_lead"
    NEW_ORDER = "new_order"
    DAILY_BRIEF = "daily_brief"
    WEEKLY_REPORT = "weekly_report"


# Preference flags on EmailPreference
CATEGORY_ACCOUNT = "account"
CATEGORY_ALERTS = "alerts"
CATEGORY_COMMERCE = "commerce"
CATEGORY_REPORTS = "reports"

KIND_CATEGORY = {
    EmailKind.WELCOME: CATEGORY_ACCOUNT,
    EmailKind.PASSWORD_RESET: CATEGORY_ACCOUNT,
    EmailKind.PUBLISH_FAILED: CATEGORY_ALERTS,
    EmailKind.AUTOMATION_PAUSED: CATEGORY_ALERTS,
    EmailKind.APPROVAL_NEEDED: CATEGORY_ALERTS,
    EmailKind.NEW_LEAD: CATEGORY_COMMERCE,
    EmailKind.NEW_ORDER: CATEGORY_COMMERCE,
    EmailKind.DAILY_BRIEF: CATEGORY_REPORTS,
    EmailKind.WEEKLY_REPORT: CATEGORY_REPORTS,
}

CATEGORY_LABEL = {
    CATEGORY_ACCOUNT: "Account",
    CATEGORY_ALERTS: "Alert",
    CATEGORY_COMMERCE: "Commerce",
    CATEGORY_REPORTS: "Report",
}
