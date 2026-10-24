import json
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
    COMMERCE_PAGE_BANNER_LIMIT,
    BusinessExpense,
    CommercePage,
    CommercePageBanner,
    Order,
    Product,
    ProductImage,
)
from .permissions import IsBusinessOwner
from .serializers import (
    BusinessExpenseSerializer,
    CommercePageBannerSerializer,
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


def _collect_snap_to_sell_images(request):
    uploaded_images = request.FILES.getlist("images")

    if not uploaded_images:
        single_image = request.FILES.get("image")
        if single_image:
            uploaded_images = [single_image]

    return uploaded_images


def _offering_kind(request) -> str:
    raw = (request.data.get("offering_kind") or "product").strip().lower()
    if raw == "service":
        return "service"
    return "product"


def _parse_snap_to_sell_owner_facts(request):
    raw_price = request.data.get("price")

    if raw_price in (None, ""):
        return None, Response(
            {"detail": "Selling price is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        price = Decimal(str(raw_price))
    except (InvalidOperation, TypeError, ValueError):
        return None, Response(
            {"detail": "Selling price must be a valid number."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if price < 0:
        return None, Response(
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
        "offering_kind": _offering_kind(request),
    }

    return owner_facts, None


def _parse_decimal_price(raw_price, *, field_label: str = "Selling price"):
    if raw_price in (None, ""):
        return None, f"{field_label} is required."

    try:
        price = Decimal(str(raw_price))
    except (InvalidOperation, TypeError, ValueError):
        return None, f"{field_label} must be a valid number."

    if price < 0:
        return None, f"{field_label} cannot be negative."

    return price, None


def _parse_snap_to_sell_batch_pricing(request, *, image_count: int):
    """
    Batch Snap-to-Sell accepts either one shared price or one price per image.

    Per-image prices are sent as JSON in the ``prices`` field, in the same
    order as the uploaded ``images``.
    """

    currency = (
        request.data.get("currency") or "KES"
    ).strip().upper()

    owner_fields = {
        "name": (request.data.get("name") or "").strip(),
        "category": (request.data.get("category") or "").strip(),
        "brand": (request.data.get("brand") or "").strip(),
        "material": (request.data.get("material") or "").strip(),
        "size": (request.data.get("size") or "").strip(),
        "color": (request.data.get("color") or "").strip(),
        "condition": (request.data.get("condition") or "").strip(),
        "offering_kind": _offering_kind(request),
    }

    raw_prices = request.data.get("prices")

    if raw_prices not in (None, ""):
        if isinstance(raw_prices, str):
            try:
                parsed_prices = json.loads(raw_prices)
            except json.JSONDecodeError:
                return None, None, Response(
                    {"detail": "Prices must be a valid JSON array."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif isinstance(raw_prices, list):
            parsed_prices = raw_prices
        else:
            return None, None, Response(
                {"detail": "Prices must be a valid JSON array."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(parsed_prices) != image_count:
            return None, None, Response(
                {
                    "detail": (
                        "Provide exactly one price for each photo "
                        f"({image_count} required)."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_prices: list[str] = []

        for index, raw_item in enumerate(parsed_prices):
            price, detail = _parse_decimal_price(
                raw_item,
                field_label=f"Price for photo {index + 1}",
            )
            if detail is not None:
                return None, None, Response(
                    {"detail": detail},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            normalized_prices.append(str(price))

        owner_facts = {
            "currency": currency,
            **owner_fields,
        }

        return owner_facts, normalized_prices, None

    price, detail = _parse_decimal_price(request.data.get("price"))
    if detail is not None:
        return None, None, Response(
            {"detail": detail},
            status=status.HTTP_400_BAD_REQUEST,
        )

    owner_facts = {
        "price": str(price),
        "currency": currency,
        **owner_fields,
    }

    return owner_facts, None, None


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


def _commerce_page_response(page, request):
    page = (
        CommercePage.objects
        .prefetch_related("banners__product__images")
        .get(pk=page.pk)
    )
    return CommercePageSerializer(page, context={"request": request}).data


def _sync_page_cover_from_banners(page):
    """Keep legacy cover in sync when the first slide has a custom image."""
    first = page.banners.order_by("display_order", "created_at").first()
    if first and first.image:
        page.cover = first.image
        page.save(update_fields=["cover", "updated_at"])
    elif not first:
        page.cover = None
        page.save(update_fields=["cover", "updated_at"])


def _resolve_banner_product(business, raw):
    """Parse product id from request data; None clears / means absent."""
    if raw in (None, "", "null", "none"):
        return None
    try:
        product_id = int(raw)
    except (TypeError, ValueError) as exc:
        raise ValueError("Choose a valid product.") from exc
    if product_id <= 0:
        return None
    return get_object_or_404(Product, id=product_id, business=business)


class CommercePageView(BusinessOwnedAPIView):
    """
    Retrieve or update the Commerce Page (including branding uploads).
    """

    parser_classes = [JSONParser, FormParser, MultiPartParser]

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
        return Response(_commerce_page_response(page, request))

    def patch(self, request, business_id):
        page = self.get_or_create_page()
        old_slug = page.slug

        data = request.data

        def _flag(key: str) -> bool:
            value = data.get(key, False)
            if isinstance(value, bool):
                return value
            return str(value).lower() in ("1", "true", "yes")

        clear_logo = _flag("clear_logo")
        clear_cover = _flag("clear_cover")
        image_updates: list[str] = []
        if clear_logo:
            page.logo = None
            image_updates.append("logo")
        if clear_cover:
            page.cover = None
            image_updates.append("cover")
            page.banners.all().delete()
        if image_updates:
            page.save(update_fields=[*image_updates, "updated_at"])

        serializer = CommercePageSerializer(
            page,
            data=data,
            partial=True,
            context={"request": request},
        )

        serializer.is_valid(
            raise_exception=True,
        )

        serializer.save()
        page.refresh_from_db()

        # Legacy single cover upload → first available banner slot
        cover_file = request.FILES.get("cover")
        if cover_file and page.banners.count() < COMMERCE_PAGE_BANNER_LIMIT:
            next_order = page.banners.count()
            CommercePageBanner.objects.create(
                page=page,
                image=cover_file,
                alt_text="",
                display_order=next_order,
            )

        if page.is_published:
            try:
                from apps.commerce.services.indexnow import notify_store_page, notify_urls, store_url

                if old_slug != page.slug:
                    notify_urls([store_url(old_slug), store_url(page.slug)])
                notify_store_page(page)
            except Exception:
                pass

        return Response(_commerce_page_response(page, request))


class CommercePageBannerListCreateView(BusinessOwnedAPIView):
    """List or add storefront hero banners (max 5)."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_page(self):
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
        page = self.get_page()
        banners = page.banners.all()
        return Response(
            CommercePageBannerSerializer(
                banners,
                many=True,
                context={"request": request},
            ).data
        )

    def post(self, request, business_id):
        page = self.get_page()
        if page.banners.count() >= COMMERCE_PAGE_BANNER_LIMIT:
            return Response(
                {
                    "detail": (
                        f"You can add up to {COMMERCE_PAGE_BANNER_LIMIT} "
                        "banner slides. Remove one to add another."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        image = (
            request.FILES.get("image")
            or request.FILES.get("banner")
            or request.FILES.get("file")
        )
        product = None
        if "product" in request.data or "product_id" in request.data:
            raw = request.data.get("product", request.data.get("product_id"))
            try:
                product = _resolve_banner_product(page.business, raw)
            except ValueError as exc:
                return Response(
                    {"detail": str(exc)},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if not image and not product:
            return Response(
                {
                    "detail": (
                        "Upload a banner image or choose a product to feature."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if product and not image:
            has_photo = product.images.exists()
            if not has_photo:
                return Response(
                    {
                        "detail": (
                            "That product has no photos yet. "
                            "Add a product image first."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        alt_text = str(request.data.get("alt_text") or "")[:200]
        if not alt_text and product:
            alt_text = str(product.name or "")[:200]

        banner = CommercePageBanner(
            page=page,
            alt_text=alt_text,
            product=product,
            display_order=page.banners.count(),
        )
        if image:
            banner.image = image
        banner.save()

        if banner.display_order == 0:
            _sync_page_cover_from_banners(page)

        return Response(
            _commerce_page_response(page, request),
            status=status.HTTP_201_CREATED,
        )


class CommercePageBannerDetailView(BusinessOwnedAPIView):
    """Update alt text or delete a banner slide."""

    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_banner(self):
        business = self.get_business()
        return get_object_or_404(
            CommercePageBanner,
            id=self.kwargs["banner_id"],
            page__business=business,
        )

    def patch(self, request, business_id, banner_id):
        banner = self.get_banner()
        updates: list[str] = []

        if "alt_text" in request.data:
            banner.alt_text = str(request.data.get("alt_text") or "")[:200]
            updates.append("alt_text")

        if "product" in request.data or "product_id" in request.data:
            raw = request.data.get("product", request.data.get("product_id"))
            if raw in (None, "", "null", "none", 0, "0"):
                if not banner.image:
                    return Response(
                        {
                            "detail": (
                                "This slide uses a product photo. "
                                "Link another product or remove the slide."
                            ),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                banner.product = None
                updates.append("product")
            else:
                try:
                    product = _resolve_banner_product(
                        banner.page.business,
                        raw,
                    )
                except ValueError as exc:
                    return Response(
                        {"detail": str(exc)},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if product is None:
                    return Response(
                        {"detail": "Choose a valid product."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if not product.images.exists() and not banner.image:
                    return Response(
                        {
                            "detail": (
                                "That product has no photos yet. "
                                "Add a product image first."
                            ),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                banner.product = product
                updates.append("product")

        if updates:
            banner.save(update_fields=updates)

        return Response(_commerce_page_response(banner.page, request))

    def delete(self, request, business_id, banner_id):
        banner = self.get_banner()
        page = banner.page
        banner.delete()
        # Re-pack display_order
        for index, item in enumerate(page.banners.order_by("display_order", "created_at")):
            if item.display_order != index:
                item.display_order = index
                item.save(update_fields=["display_order"])
        _sync_page_cover_from_banners(page)
        return Response(_commerce_page_response(page, request))


class CommercePageBannerReorderView(BusinessOwnedAPIView):
    """Reorder banner slides: { "banner_ids": [3, 1, 2] }."""

    def post(self, request, business_id):
        business = self.get_business()
        page = get_object_or_404(CommercePage, business=business)
        ids = request.data.get("banner_ids") or []
        if not isinstance(ids, list) or not ids:
            return Response(
                {"detail": "Send banner_ids as an ordered list."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        banners = {
            b.id: b
            for b in page.banners.filter(id__in=ids)
        }
        if len(banners) != len(ids) or len(ids) != page.banners.count():
            return Response(
                {"detail": "banner_ids must include every slide exactly once."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for index, banner_id in enumerate(ids):
            banner = banners[int(banner_id)]
            if banner.display_order != index:
                banner.display_order = index
                banner.save(update_fields=["display_order"])

        _sync_page_cover_from_banners(page)

        return Response(_commerce_page_response(page, request))


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

        if page.is_published:
            try:
                from apps.commerce.services.indexnow import notify_store_page

                notify_store_page(page)
            except Exception:
                pass

        return Response(_commerce_page_response(page, request))


class PublicSitemapCatalogView(APIView):
    """
    Lightweight catalog of published stores and active products for
    the Next.js sitemap generator. Unauthenticated.
    """

    permission_classes = []

    def get(self, request):
        pages = (
            CommercePage.objects
            .filter(is_published=True)
            .select_related("business")
            .order_by("slug")
        )
        stores = []
        for page in pages:
            products = (
                Product.objects
                .filter(
                    business=page.business,
                    status=Product.Status.ACTIVE,
                )
                .only("slug", "updated_at")
                .order_by("slug")
            )
            stores.append({
                "slug": page.slug,
                "updated_at": page.updated_at.isoformat(),
                "products": [
                    {
                        "slug": product.slug,
                        "updated_at": product.updated_at.isoformat(),
                    }
                    for product in products
                ],
            })
        return Response({"stores": stores})


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
            CommercePage.objects.prefetch_related(
                "banners__product__images",
            ),
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
            "page": CommercePageSerializer(
                page,
                context={"request": request},
            ).data,
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
            CommercePage.objects.prefetch_related(
                "banners__product__images",
            ),
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
            "page": CommercePageSerializer(
                page,
                context={"request": request},
            ).data,
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

        uploaded_images = _collect_snap_to_sell_images(request)

        if not uploaded_images:
            return Response(
                {"detail": "At least one product image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        owner_facts, error_response = _parse_snap_to_sell_owner_facts(
            request,
        )
        if error_response is not None:
            return error_response

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


class SnapToSellBatchView(BusinessOwnedAPIView):
    """
    Analyze up to 10 product photos in parallel and create one draft
    product per image.

    Pricing: send ``price`` for a shared amount, or ``prices`` (JSON array)
    with one value per image in upload order.
    """

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def post(self, request, business_id):
        business = self.get_business()

        uploaded_images = _collect_snap_to_sell_images(request)

        if not uploaded_images:
            return Response(
                {"detail": "At least one product image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        owner_facts, per_image_prices, error_response = (
            _parse_snap_to_sell_batch_pricing(
                request,
                image_count=len(uploaded_images),
            )
        )
        if error_response is not None:
            return error_response

        from .services.product_service import SnapToSellService

        try:
            logger.info(
                "Starting Snap-to-Sell batch: business_id=%s user_id=%s "
                "image_count=%s per_image_prices=%s",
                business.pk,
                request.user.pk,
                len(uploaded_images),
                per_image_prices is not None,
            )

            batch_result = SnapToSellService().create_batch(
                business=business,
                uploads=uploaded_images,
                owner_facts=owner_facts,
                per_image_prices=per_image_prices,
            )

        except ProductVisionError as exc:
            logger.exception(
                "Snap-to-Sell batch failed: business_id=%s user_id=%s",
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
                "Unexpected Snap-to-Sell batch failure: "
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

        serializer_context = {"request": request}

        return Response(
            {
                "products": ProductSerializer(
                    batch_result.products,
                    many=True,
                    context=serializer_context,
                ).data,
                "created_count": len(batch_result.products),
                "errors": batch_result.errors,
            },
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
        try:
            from apps.notifications.services.events import send_new_order

            send_new_order(business, order)
        except Exception:
            pass
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(BusinessOwnedAPIView):
    """Update an order status after the owner confirms it."""

    def patch(self, request, business_id, order_id):
        from apps.commerce.services.orders import OrderUpdateError, apply_order_update

        business = self.get_business()
        order = get_object_or_404(Order, pk=order_id, business=business)
        try:
            order = apply_order_update(order, data=request.data)
        except OrderUpdateError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
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
        try:
            from apps.notifications.services.events import send_new_order

            send_new_order(page.business, order)
        except Exception:
            pass
        return Response(
            {"id": order.id, "status": order.status},
            status=status.HTTP_201_CREATED,
        )


class ExpenseListCreateView(BusinessOwnedAPIView):
    """List and log business cash-out expenses."""

    def get(self, request, business_id):
        business = self.get_business()
        expenses = BusinessExpense.objects.filter(business=business)
        spent_on = request.query_params.get("spent_on")
        if spent_on:
            expenses = expenses.filter(spent_on=spent_on)
        return Response(BusinessExpenseSerializer(expenses[:100], many=True).data)

    def post(self, request, business_id):
        from datetime import date
        from decimal import Decimal, InvalidOperation

        business = self.get_business()
        try:
            amount = Decimal(str(request.data.get("amount") or "0"))
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {"detail": "Enter a valid amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if amount <= 0:
            return Response(
                {"detail": "Amount must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        category = request.data.get("category") or BusinessExpense.Category.OTHER
        if category not in BusinessExpense.Category.values:
            category = BusinessExpense.Category.OTHER
        spent_on_raw = request.data.get("spent_on") or ""
        try:
            spent_on = date.fromisoformat(str(spent_on_raw)[:10]) if spent_on_raw else date.today()
        except ValueError:
            spent_on = date.today()
        expense = BusinessExpense.objects.create(
            business=business,
            amount=amount,
            currency=(request.data.get("currency") or "KES")[:10],
            category=category,
            note=(request.data.get("note") or "")[:400],
            spent_on=spent_on,
        )
        return Response(
            BusinessExpenseSerializer(expense).data,
            status=status.HTTP_201_CREATED,
        )


class ExpenseDetailView(BusinessOwnedAPIView):
    def delete(self, request, business_id, expense_id):
        business = self.get_business()
        expense = get_object_or_404(BusinessExpense, pk=expense_id, business=business)
        expense.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BroadcastPackView(BusinessOwnedAPIView):
    """Build WhatsApp Status / group drafts from recent products."""

    def post(self, request, business_id):
        from apps.commerce.services.broadcast import build_broadcast_pack

        business = self.get_business()
        polish = str(request.data.get("polish") or "").lower() in {
            "1",
            "true",
            "yes",
        }
        return Response(build_broadcast_pack(business, polish=polish))