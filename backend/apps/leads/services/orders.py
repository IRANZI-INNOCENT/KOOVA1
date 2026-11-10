"""Create commerce orders from leads."""

from __future__ import annotations

from apps.commerce.models import Order
from apps.leads.models import Lead


class LeadConversionError(Exception):
    """Raised when a lead cannot become an order."""


def _order_source_for_lead(lead: Lead) -> str:
    if lead.source == Lead.Source.WHATSAPP:
        return Order.Source.WHATSAPP
    if lead.source == Lead.Source.WEB:
        return Order.Source.STORE
    return Order.Source.MANUAL


def _phone_from_lead(lead: Lead) -> str:
    for candidate in (lead.customer_id, lead.notes):
        text = (candidate or "").strip()
        if sum(ch.isdigit() for ch in text) >= 7:
            return text[:30]
    return ""


def convert_lead_to_order(lead: Lead) -> Order:
    """
    Start an order record from a lead.

    This does not mark payment or delivery — only records the enquiry.
    """

    if lead.status == Lead.Status.LOST:
        raise LeadConversionError("This lead was marked lost.")

    order = Order.objects.create(
        business=lead.business,
        product=lead.product,
        lead=lead,
        customer_name=(lead.customer_name or "")[:200],
        phone=_phone_from_lead(lead),
        note=(lead.interest or lead.notes or "")[:2000],
        source=_order_source_for_lead(lead),
        status=Order.Status.NEW,
    )

    if lead.status in {
        Lead.Status.NEW,
        Lead.Status.CONTACTED,
        Lead.Status.QUALIFIED,
    }:
        lead.status = Lead.Status.QUALIFIED
        lead.save(update_fields=["status", "updated_at"])

    return order
