from apps.accounts.models import User
from apps.businesses.models import Business
from apps.commerce.models import Order, Product
from apps.kova_ai.models import KovaExchange
from apps.leads.models import Lead
from apps.social.models import SocialMessage, SocialPost


def kova_stats():
    """Counts the admin home uses to show what needs attention."""

    businesses = Business.objects.count()
    return [
        {
            "label": "Businesses",
            "value": businesses,
            "href": "/admin/businesses/business/",
        },
        {
            "label": "Accounts",
            "value": User.objects.count(),
            "href": "/admin/accounts/user/",
        },
        {
            "label": "Products",
            "value": Product.objects.count(),
            "href": "/admin/commerce/product/",
        },
        {
            "label": "New orders",
            "value": Order.objects.filter(status=Order.Status.NEW).count(),
            "href": "/admin/commerce/order/?status__exact=new",
        },
        {
            "label": "New leads",
            "value": Lead.objects.filter(status=Lead.Status.NEW).count(),
            "href": "/admin/leads/lead/?status__exact=new",
        },
        {
            "label": "Waiting replies",
            "value": SocialMessage.objects.filter(
                direction=SocialMessage.Direction.INBOUND,
                delivery_status=SocialMessage.Delivery.RECEIVED,
            ).count(),
            "href": (
                "/admin/social/socialmessage/"
                "?direction__exact=in&delivery_status__exact=received"
            ),
        },
        {
            "label": "Scheduled posts",
            "value": SocialPost.objects.filter(
                publishing_status=SocialPost.PublishingStatus.SCHEDULED,
            ).count(),
            "href": "/admin/social/socialpost/?publishing_status__exact=scheduled",
        },
        {
            "label": "Failed posts",
            "value": SocialPost.objects.filter(
                publishing_status=SocialPost.PublishingStatus.FAILED,
            ).count(),
            "href": "/admin/social/socialpost/?publishing_status__exact=failed",
        },
        {
            "label": "Ask Kova",
            "value": KovaExchange.objects.count(),
            "href": "/admin/kova_ai/kovaexchange/",
        },
        {
            "label": "Failed asks",
            "value": KovaExchange.objects.filter(
                status=KovaExchange.Status.FAILED,
            ).count(),
            "href": "/admin/kova_ai/kovaexchange/?status__exact=failed",
        },
    ]
