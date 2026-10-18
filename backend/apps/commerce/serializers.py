from rest_framework import serializers

from .models import (
    CommercePage,
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
            "accent_color",
            "logo",
            "logo_url",
            "cover",
            "cover_url",
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
        return self._absolute_image(obj.cover)

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
            "quantity",
            "status",
            "source",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "source",
            "created_at",
            "updated_at",
        ]