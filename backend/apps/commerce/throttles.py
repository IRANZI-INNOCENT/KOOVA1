from rest_framework.throttling import AnonRateThrottle


class PublicStoreOrderThrottle(AnonRateThrottle):
    """Limit anonymous storefront order spam."""

    scope = "public_store_order"
