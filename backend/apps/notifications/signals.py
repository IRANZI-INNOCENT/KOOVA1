from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender="social.SocialAction")
def email_on_approval_needed(sender, instance, created, **kwargs):
    if not created:
        return
    if not getattr(instance, "requires_approval", False):
        return
    status = getattr(instance, "action_status", "") or ""
    if status and status not in {"pending", ""}:
        return
    business = getattr(instance, "business", None)
    if business is None:
        return
    summary = (
        getattr(instance, "intent", None)
        or getattr(instance, "result", None)
        or "An action is waiting for your approval."
    )
    from apps.notifications.services.events import send_approval_needed

    send_approval_needed(business, action_summary=str(summary)[:400])
