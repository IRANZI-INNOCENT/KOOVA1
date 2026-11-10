"""Owner approve / reject for pending SocialAction records."""

from __future__ import annotations

from django.utils import timezone

from apps.content.models import Content
from apps.social.models import SocialAction, SocialMessage


def decide_social_action(
    action: SocialAction,
    *,
    decision: str,
    user,
) -> SocialAction:
    now = timezone.now()

    if decision == "reject":
        action.action_status = SocialAction.ActionStatus.REJECTED
        action.result = "Rejected by owner."
        action.save(update_fields=["action_status", "result", "updated_at"])
        return action

    action.action_status = SocialAction.ActionStatus.APPROVED
    action.approved_by = user
    action.approved_at = now
    action.save(
        update_fields=[
            "action_status",
            "approved_by",
            "approved_at",
            "updated_at",
        ],
    )

    return _execute(action, now)


def _execute(action: SocialAction, now) -> SocialAction:
    action.action_status = SocialAction.ActionStatus.EXECUTING
    action.save(update_fields=["action_status", "updated_at"])

    try:
        if action.action_type == SocialAction.ActionType.REPLY:
            _run_reply(action)
        elif action.action_type in {
            SocialAction.ActionType.PUBLISH,
            SocialAction.ActionType.SCHEDULE,
        }:
            _run_publish(action)
        else:
            action.action_status = SocialAction.ActionStatus.COMPLETED
            action.result = "Approved — no automated runner for this action type yet."
    except Exception as exc:
        action.action_status = SocialAction.ActionStatus.FAILED
        action.result = str(exc)[:2000]
    else:
        if action.action_status == SocialAction.ActionStatus.EXECUTING:
            action.action_status = SocialAction.ActionStatus.COMPLETED
            if not action.result:
                action.result = "Completed."

    action.executed_at = now
    action.save(
        update_fields=[
            "action_status",
            "result",
            "executed_at",
            "updated_at",
        ],
    )
    return action


def _run_reply(action: SocialAction) -> None:
    if action.target_type not in {"message", "comment", ""}:
        raise ValueError("Unsupported reply target.")

    try:
        message_id = int(action.target_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Reply action is missing a message id.") from exc

    message = SocialMessage.objects.get(
        pk=message_id,
        business_id=action.business_id,
    )
    body = (message.draft_reply or "").strip()
    if not body:
        raise ValueError("No draft reply to send.")

    from apps.social.services.inbox import send_reply

    send_reply(message, body)
    action.result = "Reply sent to the customer."


def _run_publish(action: SocialAction) -> None:
    try:
        content_id = int(action.target_id)
    except (TypeError, ValueError) as exc:
        raise ValueError("Publish action is missing content id.") from exc

    content = Content.objects.get(pk=content_id, business_id=action.business_id)
    if content.status not in {Content.Status.APPROVED, Content.Status.DRAFT}:
        raise ValueError("Content is not in a publishable state.")

    from apps.social.services.publish import enqueue

    enqueue(content, when=None)
    action.result = "Content queued for publishing."
