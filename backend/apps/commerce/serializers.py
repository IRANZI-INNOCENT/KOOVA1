from rest_framework import serializers

from .models import (
    COMMERCE_PAGE_BANNER_LIMIT,
    BusinessExpense,
    CommercePage,
    CommercePageBanner,
    Order,
    Product,
    ProductAIAnalysis,
    ProductImage,
)


class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serialize product images.

    The image URL is exposed separately so the frontend can
    display the actual uploaded asset.
    """

    url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = [
            "id",
            "image",
            "url",
            "alt_text",
            "display_order",
            "is_primary",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "url",
            "created_at",
        ]

    def get_url(self, obj):
        request = self.context.get("request")

        if not obj.image:
            return None

        url = obj.image.url

        if request:
            return request.build_absolute_uri(url)

        return url


class ProductAIAnalysisSerializer(serializers.ModelSerializer):
    """
    Historical Kova analysis for a product.
    """

    class Meta:
        model = ProductAIAnalysis
        fields = [
            "id",
            "model",
            "result",
            "confidence",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "model",
            "result",
            "confidence",
            "created_at",
        ]


class ProductSerializer(serializers.ModelSerializer):
    """
    Full product representation.

    Owner-provided facts and Kova-generated intelligence remain
    separate in the API representation.
    """

    images = ProductImageSerializer(
        many=True,
        read_only=True,
    )

    ai_analyses = ProductAIAnalysisSerializer(
        many=True,
        read_only=True,
    )

    store_path = serializers.SerializerMethodField()
    product_path = serializers.SerializerMethodField()

    class Meta:
        model = Product

        fields = [
            "id",
            "business",

            # Owner facts
            "name",
            "slug",
            "sku",
            "category",
            "price",
            "currency",
            "stock",
            "brand",
            "material",
            "size",
            "color",
            "condition",
            "offering_kind",

            # Kova intelligence
            "short_description",
            "description",
            "seo_title",
            "seo_description",
            "selling_points",
            "keywords",
            "visual_attributes",
            "uncertain_attributes",
            "ai_summary",
            "ai_confidence",
            "ai_generated",

            # Lifecycle
            "status",

            # Assets/history
            "images",
            "ai_analyses",

            "store_path",
            "product_path",

            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "business",
            "slug",
            "images",
            "ai_analyses",
            "store_path",
            "product_path",
            "created_at",
            "updated_at",

            # AI-generated fields are controlled by Kova.
            "short_description",
            "description",
            "seo_title",
            "seo_description",
            "selling_points",
            "keywords",
            "visual_attributes",
            "uncertain_attributes",
            "ai_summary",
            "ai_confidence",
            "ai_generated",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Product name cannot be empty."
            )

        return value

    def validate_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Product price cannot be negative."
            )

        return value

    def _published_slug(self, obj):
        cache = self.context.setdefault("_store_slugs", {})

        if obj.business_id not in cache:
            cache[obj.business_id] = (
                CommercePage.objects
                .filter(
                    business_id=obj.business_id,
                    is_published=True,
                )
                .values_list("slug", flat=True)
                .first()
            )

        return cache[obj.business_id]

    def get_store_path(self, obj):
        slug = self._published_slug(obj)

        if not slug:
            return None

        return f"/store/{slug}"

    def get_product_path(self, obj):
        slug = self._published_slug(obj)

        if not slug or obj.status != Product.Status.ACTIVE or not obj.slug:
            return None

        return f"/store/{slug}/{obj.slug}"


class ProductCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for owner-controlled product information.

    Kova-generated fields are deliberately excluded from this
    serializer so the client cannot overwrite AI intelligence.
    """

    VALID_STATUS_TRANSITIONS = {
        Product.Status.DRAFT: {Product.Status.ACTIVE, Product.Status.ARCHIVED},
        Product.Status.ACTIVE: {Product.Status.DRAFT, Product.Status.ARCHIVED},
        Product.Status.ARCHIVED: {Product.Status.DRAFT},
    }

    class Meta:
        model = Product

        fields = [
            "name",
            "sku",
            "category",
            "price",
            "currency",
            "stock",
            "brand",
            "material",
            "size",
            "color",
            "condition",
            "short_description",
            "description",
            "seo_title",
            "seo_description",
            "status",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Product name cannot be empty."
            )

        return value

    def validate_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Product price cannot be negative."
            )

        return value

    def validate_status(self, value):
        if not self.instance:
            return value

        current = self.instance.status
        if value != current and value not in self.VALID_STATUS_TRANSITIONS.get(current, set()):
            raise serializers.ValidationError(
                f"Cannot transition from {current} to {value}."
            )

        return value


def _banner_product_image_field(product):
    """Primary product photo (or first image) for hero slides."""
    if product is None:
        return None
    images = list(product.images.all())
    if not images:
        return None
    for image in images:
        if image.is_primary and image.image:
            return image.image
    first = images[0]
    return first.image if first.image else None


def _absolute_media_url(field, request):
    if not field:
        return None
    url = field.url
    if request:
        return request.build_absolute_uri(url)
    return url


class CommercePageBannerSerializer(serializers.ModelSerializer):
    """Hero / promo slide on a commerce page."""

    url = serializers.SerializerMethodField()
    has_custom_image = serializers.SerializerMethodField()
    product_id = serializers.IntegerField(read_only=True, allow_null=True)
    product_slug = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    href = serializers.SerializerMethodField()

    class Meta:
        model = CommercePageBanner
        fields = [
            "id",
            "image",
            "url",
            "has_custom_image",
            "alt_text",
            "product_id",
            "product_slug",
            "product_name",
            "href",
            "display_order",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "url",
            "has_custom_image",
            "product_id",
            "product_slug",
            "product_name",
            "href",
            "display_order",
            "created_at",
        ]
        extra_kwargs = {
            "image": {"write_only": True, "required": False},
            "alt_text": {"required": False},
        }

    def get_url(self, obj):
        """
        Linked product photo when a product is set; otherwise custom banner.
        """
        request = self.context.get("request")
        if obj.product_id:
            product_image = _banner_product_image_field(obj.product)
            if product_image:
                return _absolute_media_url(product_image, request)
        if obj.image:
            return _absolute_media_url(obj.image, request)
        return None

    def get_has_custom_image(self, obj):
        return bool(obj.image)

    def get_product_slug(self, obj):
        return obj.product.slug if obj.product_id else None

    def get_product_name(self, obj):
        return obj.product.name if obj.product_id else None

    def get_href(self, obj):
        """Relative storefront path when a product is linked."""
        if not obj.product_id or not obj.product or not obj.product.slug:
            return None
        page = obj.page
        if not page or not page.slug:
            return None
        return f"/store/{page.slug}/{obj.product.slug}"


class CommercePageSerializer(serializers.ModelSerializer):
    """
    Public commerce page representation.

    CommercePage uses title rather than the old `name` field.
    """

    business_name = serializers.CharField(
        source="business.name",
        read_only=True,
    )
    logo_url = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()
    banners = CommercePageBannerSerializer(many=True, read_only=True)
    banner_limit = serializers.SerializerMethodField()

    class Meta:
        model = CommercePage

        fields = [
            "id",
            "business",
            "business_name",
            "slug",
            "title",
            "tagline",
            "description",
            "whatsapp",
            "email",
            "phone",
            "location",
            "primary_color",
            "secondary_color",
            "accent_color",
            "logo",
            "logo_url",
            "cover",
            "cover_url",
            "banners",
            "banner_limit",
            "layout_preset",
            "font_preset",
            "show_hero",
            "show_about",
            "show_featured",
            "is_published",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "business",
            "business_name",
            "logo_url",
            "cover_url",
            "banners",
            "banner_limit",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "logo": {"write_only": True, "required": False},
            "cover": {"write_only": True, "required": False},
        }

    def get_logo_url(self, obj):
        return self._absolute_image(obj.logo)

    def get_cover_url(self, obj):
        """First carousel slide (or legacy cover) for OG / link previews."""
        banners = getattr(obj, "_prefetched_objects_cache", {}).get("banners")
        if banners is not None:
            first = banners[0] if banners else None
        else:
            first = obj.banners.first()
        if first:
            slide_url = CommercePageBannerSerializer(
                first,
                context=self.context,
            ).data.get("url")
            if slide_url:
                return slide_url
        return self._absolute_image(obj.cover)

    def get_banner_limit(self, obj):
        return COMMERCE_PAGE_BANNER_LIMIT

    def _absolute_image(self, field):
        if not field:
            return None
        request = self.context.get("request")
        url = field.url
        if request:
            return request.build_absolute_uri(url)
        return url

    def validate_primary_color(self, value):
        from apps.commerce.services.store_theme import normalize_hex_color

        try:
            return normalize_hex_color(value, default="#176B4D")
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_secondary_color(self, value):
        from apps.commerce.services.store_theme import normalize_hex_color

        try:
            return normalize_hex_color(value, default="#17211D")
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_accent_color(self, value):
        from apps.commerce.services.store_theme import normalize_hex_color

        try:
            return normalize_hex_color(value, default="#F4B183")
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

    def validate_slug(self, value):
        from apps.commerce.services.store_theme import normalize_store_slug

        try:
            cleaned = normalize_store_slug(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc

        qs = CommercePage.objects.filter(slug=cleaned)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "That store link is already taken. Choose another.",
            )
        return cleaned


class BusinessExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessExpense
        fields = [
            "id",
            "business",
            "amount",
            "currency",
            "category",
            "note",
            "spent_on",
            "created_at",
        ]
        read_only_fields = ["id", "business", "created_at"]


class OrderSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()

    def get_product_name(self, obj):
        return obj.product.name if obj.product_id else ""

    class Meta:
        model = Order
        fields = [
            "id",
            "business",
            "product",
            "product_name",
            "customer_name",
            "phone",
            "note",
            "customer_address",
            "delivery_note",
            "rider_name",
            "review_ask_draft",
            "quantity",
            "status",
            "source",
            "stock_adjusted",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "source",
            "stock_adjusted",
            "review_ask_draft",
            "created_at",
            "updated_at",
        ]