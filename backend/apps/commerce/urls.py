from django.urls import path

from .views import (
    CommercePagePublishView,
    CommercePageView,
    OrderDetailView,
    OrderListView,
    ProductDetailView,
    ProductImageDetailView,
    ProductPolishView,
    ProductImageListCreateView,
    ProductListCreateView,
    PublicOrderView,
    PublicProductView,
    PublicStorefrontView,
    SnapToSellBatchView,
    SnapToSellView,
)


urlpatterns = [
    # --------------------------------------------------------------
    # Public storefront (unauthenticated)
    # --------------------------------------------------------------

    path(
        "public/<slug:slug>/products/<slug:product_slug>/",
        PublicProductView.as_view(),
        name="public-product",
    ),

    path(
        "public/<slug:slug>/orders/",
        PublicOrderView.as_view(),
        name="public-order",
    ),

    path(
        "public/<slug:slug>/",
        PublicStorefrontView.as_view(),
        name="public-storefront",
    ),

    # --------------------------------------------------------------
    # Commerce Page
    # --------------------------------------------------------------

    path(
        "<int:business_id>/page/",
        CommercePageView.as_view(),
        name="commerce-page",
    ),

    path(
        "<int:business_id>/page/publish/",
        CommercePagePublishView.as_view(),
        name="commerce-page-publish",
    ),

    # --------------------------------------------------------------
    # Snap to Sell
    # --------------------------------------------------------------

    path(
        "<int:business_id>/snap-to-sell/",
        SnapToSellView.as_view(),
        name="snap-to-sell",
    ),

    path(
        "<int:business_id>/snap-to-sell/batch/",
        SnapToSellBatchView.as_view(),
        name="snap-to-sell-batch",
    ),

    # --------------------------------------------------------------
    # Products
    # --------------------------------------------------------------

    path(
        "<int:business_id>/orders/",
        OrderListView.as_view(),
        name="order-list",
    ),

    path(
        "<int:business_id>/orders/<int:order_id>/",
        OrderDetailView.as_view(),
        name="order-detail",
    ),

    path(
        "<int:business_id>/products/",
        ProductListCreateView.as_view(),
        name="product-list-create",
    ),

    path(
        "<int:business_id>/products/<int:product_id>/polish/",
        ProductPolishView.as_view(),
        name="product-polish",
    ),

    path(
        "<int:business_id>/products/<int:product_id>/",
        ProductDetailView.as_view(),
        name="product-detail",
    ),

    # --------------------------------------------------------------
    # Product Images
    # --------------------------------------------------------------

    path(
        "<int:business_id>/products/<int:product_id>/images/",
        ProductImageListCreateView.as_view(),
        name="product-image-list-create",
    ),

    path(
        "<int:business_id>/products/<int:product_id>/images/<int:image_id>/",
        ProductImageDetailView.as_view(),
        name="product-image-detail",
    ),
]