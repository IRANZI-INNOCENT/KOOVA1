import logging
from decimal import Decimal, InvalidOperation

from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.parsers import (
    FormParser,
    JSONParser,
    MultiPartParser,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business

from .models import (
    CommercePage,
    Order,
    Product,
    ProductImage,
)
from .permissions import IsBusinessOwner
from .serializers import (
    CommercePageSerializer,
    OrderSerializer,
    ProductCreateSerializer,
    ProductImageSerializer,
    ProductSerializer,
)
from .services.product_vision import (
    ProductVisionError,
)

logger = logging.getLogger(__name__)


class BusinessOwnedAPIView(APIView):
    """
    Base class for business-scoped Commerce endpoints.

    The authenticated user must own the business identified
    by the URL.
    """

    permission_classes = [
        IsAuthenticated,
        IsBusinessOwner,
    ]

    def get_business(self):
        return get_object_or_404(
            Business,
            id=self.kwargs["business_id"],
            owner=self.request.user,
        )


class ProductListCreateView(BusinessOwnedAPIView):
    """
    List and create products.
    """

    def get(self, request, business_id):
        business = self.get_business()

        products = (
            Product.objects
            .filter(business=business)
            .prefetch_related(
                "images",
                "ai_analyses",
            )
        )

        serializer = ProductSerializer(
            products,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    def post(self, request, business_id):
        business = self.get_business()

        serializer = ProductCreateSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        product = serializer.save(
            business=business,
        )

        if product.status != Product.Status.ARCHIVED:
            from .services.storefront import publish_product_on_store

            publish_product_on_store(product)
            product.refresh_from_db()

        return Response(
            ProductSerializer(
                product,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class ProductDetailView(BusinessOwnedAPIView):
    """
    Retrieve, update, or delete a product.
    """

    def get_product(self):
        business = self.get_business()

        return get_object_or_404(
            Product,
            id=self.kwargs["product_id"],
            business=business,
        )

    def get(self, request, business_id, product_id):
        product = self.get_product()

        return Response(
            ProductSerializer(
                product,
                context={"request": request},
            ).data
        )

    def patch(self, request, business_id, product_id):
        product = self.get_product()

        serializer = ProductCreateSerializer(
            product,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        serializer.save()

        if product.status == Product.Status.ACTIVE:
            from .services.storefront import publish_product_on_store

            publish_product_on_store(product)
            product.refresh_from_db()

        return Response(
            ProductSerializer(
                product,
                context={"request": request},
            ).data
        )

    def delete(self, request, business_id, product_id):
        product = self.get_product()
        product.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class ProductPolishView(BusinessOwnedAPIView):
    """
    Look at the product photos and rewrite the public listing.
    """

    def post(self, request, business_id, product_id):
        business = self.get_business()
        product = get_object_or_404(
            Product,
            id=product_id,
            business=business,
        )

        from .services.product_polish import polish_product

        try:
            product = polish_product(product)
        except ProductVisionError as exc:
            return Response(
                {
                    "detail": str(exc) or "Kova could not polish this product.",
                    "error_code": "PRODUCT_POLISH_FAILED",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            ProductSerializer(
                product,
                context={"request": request},
            ).data
        )


class ProductImageListCreateView(BusinessOwnedAPIView):
    """
    List or upload product images.
    """

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_product(self):
        business = self.get_business()

        return get_object_or_404(
            Product,
            id=self.kwargs["product_id"],
            business=business,
        )

    def get(self, request, business_id, product_id):
        product = self.get_product()

        images = product.images.all()

        return Response(
            ProductImageSerializer(
                images,
                many=True,
                context={"request": request},
            ).data
        )

    def post(self, request, business_id, product_id):
        product = self.get_product()

        serializer = ProductImageSerializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        image = serializer.save(
            product=product,
        )

        return Response(
            ProductImageSerializer(
                image,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class ProductImageDetailView(BusinessOwnedAPIView):
    """
    Retrieve or delete a product image.
    """

    def get_product(self):
        business = self.get_business()

        return get_object_or_404(
            Product,
            id=self.kwargs["product_id"],
            business=business,
        )

    def get_image(self):
        product = self.get_product()

        return get_object_or_404(
            ProductImage,
            id=self.kwargs["image_id"],
            product=product,
        )

    def get(self, request, business_id, product_id, image_id):
        image = self.get_image()

        return Response(
            ProductImageSerializer(
                image,
                context={"request": request},
            ).data
        )

    def delete(
        self,
        request,
        business_id,
        product_id,
        image_id,
    ):
        image = self.get_image()
        image.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT,
        )


class CommercePageView(BusinessOwnedAPIView):
    """
    Retrieve or update the Commerce Page.
    """

    def get_or_create_page(self):
        business = self.get_business()

        page, _ = CommercePage.objects.get_or_create(
            business=business,
            defaults={
                "title": business.name,
                "description": business.description,
                "email": business.email,
                "phone": business.phone,
                "location": business.location,
            },
        )

        return page

    def get(self, request, business_id):
        page = self.get_or_create_page()

        return Response(
            CommercePageSerializer(page).data
        )

    def patch(self, request, business_id):
        page = self.get_or_create_page()

        serializer = CommercePageSerializer(
            page,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        serializer.save()

        return Response(
            CommercePageSerializer(page).data
        )


class CommercePagePublishView(BusinessOwnedAPIView):
    """
    Publish or unpublish the Commerce Page.
    """

    def post(self, request, business_id):
        page = get_object_or_404(
            CommercePage,
            business_id=business_id,
        )

        # BusinessOwnedAPIView already verifies ownership.
        self.get_business()

        published = request.data.get(
            "is_published",
            True,
        )

        page.is_published = bool(published)
        page.save(
            update_fields=[
                "is_published",
                "updated_at",
            ]
        )

        return Response(
            CommercePageSerializer(page).data
        )


class PublicStorefrontView(APIView):
    """
    Public storefront for a business.

    This endpoint is unauthenticated. Anyone with the slug can view
    a published Commerce Page and its active products.

    Unpublished pages return 404 so that draft storefronts are not
    exposed to the public.
    """

    permission_classes = []

    def get(self, request, slug):
        page = get_object_or_404(
            CommercePage,
            slug=slug,
            is_published=True,
        )

        products = (
            Product.objects
            .filter(
                business=page.business,
                status=Product.Status.ACTIVE,
            )
            .prefetch_related("images")
            .order_by("-updated_at")
        )

        return Response({
            "page": CommercePageSerializer(page).data,
            "products": ProductSerializer(
                products,
                many=True,
                context={"request": request},
            ).data,
        })


class PublicProductView(APIView):
    """
    Public page for one product on a published store.

    Draft and archived products stay private.
    """

    permission_classes = []

    def get(self, request, slug, product_slug):
        page = get_object_or_404(
            CommercePage,
            slug=slug,
            is_published=True,
        )

        product = get_object_or_404(
            Product.objects.prefetch_related("images"),
            business=page.business,
            slug=product_slug,
            status=Product.Status.ACTIVE,
        )

        related = (
            Product.objects
            .filter(
                business=page.business,
                status=Product.Status.ACTIVE,
            )
            .exclude(pk=product.pk)
            .prefetch_related("images")
            .order_by("-updated_at")[:4]
        )

        return Response({
            "page": CommercePageSerializer(page).data,
            "product": ProductSerializer(
                product,
                context={"request": request},
            ).data,
            "related_products": ProductSerializer(
                related,
                many=True,
                context={"request": request},
            ).data,
        })


class SnapToSellView(BusinessOwnedAPIView):
    """
    Convert product photographs into a structured Kova
    product draft.

    Owner facts (price, name, category, brand, material, size, color,
    condition) are authoritative.  Kova intelligence (descriptions,
    SEO, selling points, keywords, visual attributes) is supplementary.

    The view validates the HTTP request and delegates the business
    logic to ``SnapToSellService``.
    """

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def post(self, request, business_id):
        business = self.get_business()

        # Collect uploaded images (accept both "images" and "image").
        uploaded_images = request.FILES.getlist("images")

        if not uploaded_images:
            single_image = request.FILES.get("image")
            if single_image:
                uploaded_images = [single_image]

        if not uploaded_images:
            return Response(
                {"detail": "At least one product image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------------
        # Validate price (owner-provided, required).
        # ----------------------------------------------------------

        raw_price = request.data.get("price")

        if raw_price in (None, ""):
            return Response(
                {"detail": "Selling price is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            price = Decimal(str(raw_price))
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {"detail": "Selling price must be a valid number."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if price < 0:
            return Response(
                {"detail": "Selling price cannot be negative."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        currency = (
            request.data.get("currency") or "KES"
        ).strip().upper()

        owner_facts = {
            "price": str(price),
            "currency": currency,
            "name": (request.data.get("name") or "").strip(),
            "category": (request.data.get("category") or "").strip(),
            "brand": (request.data.get("brand") or "").strip(),
            "material": (request.data.get("material") or "").strip(),
            "size": (request.data.get("size") or "").strip(),
            "color": (request.data.get("color") or "").strip(),
            "condition": (request.data.get("condition") or "").strip(),
        }

        # ----------------------------------------------------------
        # Delegate to the service.
        # ----------------------------------------------------------

        from .services.product_service import SnapToSellService

        try:
            logger.info(
                "Starting Snap-to-Sell: business_id=%s user_id=%s "
                "image_count=%s",
                business.pk,
                request.user.pk,
                len(uploaded_images),
            )

            product = SnapToSellService().create(
                business=business,
                uploads=uploaded_images,
                owner_facts=owner_facts,
            )

        except ProductVisionError as exc:
            logger.exception(
                "Snap-to-Sell failed: business_id=%s user_id=%s",
                business.pk,
                request.user.pk,
            )

            return Response(
                {
                    "detail": str(exc)
                    if str(exc)
                    else "Kova could not analyze the product images.",
                    "error_code": "PRODUCT_VISION_FAILED",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception:
            logger.exception(
                "Unexpected Snap-to-Sell failure: "
                "business_id=%s user_id=%s",
                business.pk,
                request.user.pk,
            )

            return Response(
                {
                    "detail": (
                        "Kova encountered an unexpected error "
                        "while analyzing the product images."
                    ),
                    "error_code": "SNAP_TO_SELL_INTERNAL_ERROR",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            ProductSerializer(
                product,
                context={"request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )


class OrderListView(BusinessOwnedAPIView):
    """List orders and record one the owner took outside the store."""

    def get(self, request, business_id):
        business = self.get_business()
        orders = Order.objects.filter(business=business).select_related("product")
        return Response(OrderSerializer(orders, many=True).data)

    def post(self, request, business_id):
        business = self.get_business()
        product = None
        product_id = request.data.get("product")
        if product_id:
            product = get_object_or_404(Product, pk=product_id, business=business)
        order = Order.objects.create(
            business=business,
            product=product,
            customer_name=request.data.get("customer_name") or "",
            phone=request.data.get("phone") or "",
            note=request.data.get("note") or "",
            quantity=int(request.data.get("quantity") or 1),
            source=Order.Source.MANUAL,
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(BusinessOwnedAPIView):
    """Update an order status after the owner confirms it."""

    def patch(self, request, business_id, order_id):
        business = self.get_business()
        order = get_object_or_404(Order, pk=order_id, business=business)
        status_value = request.data.get("status")
        if status_value in Order.Status.values:
            order.status = status_value
        if "note" in request.data:
            order.note = request.data.get("note") or ""
        order.save()
        return Response(OrderSerializer(order).data)


class PublicOrderView(APIView):
    """Record an order when a customer taps Order on the public store."""

    permission_classes = []
    authentication_classes = []

    def post(self, request, slug):
        page = get_object_or_404(CommercePage, slug=slug, is_published=True)
        product = get_object_or_404(
            Product,
            business=page.business,
            slug=request.data.get("product_slug") or "",
            status=Product.Status.ACTIVE,
        )
        order = Order.objects.create(
            business=page.business,
            product=product,
            customer_name=(request.data.get("customer_name") or "")[:200],
            phone=(request.data.get("phone") or "")[:30],
            note=(request.data.get("note") or "")[:1000],
            source=Order.Source.STORE,
        )
        return Response(
            {"id": order.id, "status": order.status},
            status=status.HTTP_201_CREATED,
        )