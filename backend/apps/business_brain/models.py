from django.conf import settings
from django.db import models
from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator

class BusinessProfile(models.Model):
    """
    Store high-level business knowledge that Kova can use when
    understanding and reasoning about a business.

    The core Business model contains basic identity and contact
    information. BusinessProfile stores richer contextual information
    such as the business mission, value proposition, target market,
    and business model.

    Each business has one profile.
    """

    business = models.OneToOneField(
        "businesses.Business",
        on_delete=models.CASCADE,
        related_name="profile",
    )

    mission = models.TextField(
        blank=True,
        help_text="Why the business exists and the problem it aims to solve.",
    )

    value_proposition = models.TextField(
        blank=True,
        help_text="The main value the business provides to its customers.",
    )

    target_market = models.TextField(
        blank=True,
        help_text="The people, organizations, or market segments the business serves.",
    )

    business_model = models.CharField(
        max_length=100,
        blank=True,
        help_text="How the business creates and captures revenue.",
    )

    business_stage = models.CharField(
        max_length=100,
        blank=True,
        help_text="The current stage of the business.",
    )

    website = models.URLField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business.name} profile"


class BusinessAudience(models.Model):
    """
    Store detailed knowledge about the customers a business serves.

    BusinessProfile describes the business itself. BusinessAudience
    describes the people Kova should consider when creating content,
    engaging with customers, generating leads, and supporting sales.

    The audience is intentionally stored as natural-language context
    rather than rigid demographic fields. This gives business owners
    flexibility to describe their customers in their own words and
    gives Kova richer context for future AI reasoning.

    Each business has one audience profile in the current version.
    The model can later evolve to support multiple audience segments
    if Kova needs more granular customer targeting.
    """

    business = models.OneToOneField(
        "businesses.Business",
        on_delete=models.CASCADE,
        related_name="audience",
    )

    primary_audience = models.TextField(
        blank=True,
        help_text="The main people or organizations the business serves.",
    )

    customer_needs = models.TextField(
        blank=True,
        help_text="The main needs or outcomes customers are trying to achieve.",
    )

    pain_points = models.TextField(
        blank=True,
        help_text="Problems, frustrations, or challenges customers experience.",
    )

    buying_motivations = models.TextField(
        blank=True,
        help_text="Reasons and factors that influence customers to purchase.",
    )

    customer_behavior = models.TextField(
        blank=True,
        help_text="How customers discover, evaluate, interact with, and buy from the business.",
    )

    preferred_channels = models.TextField(
        blank=True,
        help_text="Channels where the business's customers are most likely to be reached or engaged.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business.name} audience"


class BusinessBrand(models.Model):
    """
    Store the communication identity of a business.

    BusinessProfile describes what the business is.
    BusinessAudience describes who the business serves.
    BusinessBrand describes how Kova should communicate
    when representing the business.

    The brand is intentionally stored as structured natural-language
    context so business owners can describe their communication style
    in their own words.

    Each business has one brand profile in the current version.
    """

    business = models.OneToOneField(
        "businesses.Business",
        on_delete=models.CASCADE,
        related_name="brand",
    )
    voice = models.TextField(
        blank=True,
        help_text=(
            "The consistent character or personality Kova "
            "should use when communicating for the business."
        ),
    )
    tone = models.TextField(
        blank=True,
        help_text=(
            "How the business should sound in different "
            "communication situations."
        ),
    )
    positioning = models.TextField(
        blank=True,
        help_text=(
            "How the business wants to be perceived and "
            "differentiated in its market."
        ),
    )
    brand_personality = models.TextField(
        blank=True,
        help_text=(
            "The human characteristics and personality traits "
            "Kova should reflect when representing the business."
        ),
    )
    content_style = models.TextField(
        blank=True,
        help_text=(
            "The preferred style and structure of the "
            "business's content."
        ),
    )
    communication_preferences = models.TextField(
        blank=True,
        help_text=(
            "Additional communication preferences Kova should "
            "follow when creating or sending content."
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business.name} brand"


class BusinessGoal(models.Model):
    """
    Stores the strategic goals Kova should understand for a business.

    Goals are kept separate from the general Business model so that
    Kova can use them as structured business context when deciding
    what actions to recommend or perform.
    """

    business = models.OneToOneField(
        "businesses.Business",
        on_delete=models.CASCADE,
        related_name="goals",
    )

    primary_goal = models.TextField(
        blank=True,
        help_text="The most important outcome the business wants to achieve.",
    )

    secondary_goals = models.TextField(
        blank=True,
        help_text="Other important outcomes the business wants to achieve.",
    )

    growth_priorities = models.TextField(
        blank=True,
        help_text="The areas, products, markets, or activities the business wants to grow.",
    )

    success_metrics = models.TextField(
        blank=True,
        help_text="How the business will measure whether its goals are being achieved.",
    )

    current_challenges = models.TextField(
        blank=True,
        help_text="The main problems or obstacles Kova should understand and help address.",
    )

    time_horizon = models.CharField(
        max_length=100,
        blank=True,
        help_text="The expected timeframe for achieving the business goals.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)



class BusinessPolicy(models.Model):
    """
    Stores the operating rules Kova must follow for a business.

    Policies describe what Kova may do automatically and which
    actions require owner approval.
    """

    business = models.OneToOneField(
        "businesses.Business",
        on_delete=models.CASCADE,
        related_name="policy",
    )

    allow_content_creation = models.BooleanField(
        default=True,
    )

    allow_auto_publish = models.BooleanField(
        default=False,
    )

    allow_comment_replies = models.BooleanField(
        default=False,
    )

    allow_dm_replies = models.BooleanField(
        default=False,
    )

    allow_lead_creation = models.BooleanField(
        default=True,
    )

    allow_product_management = models.BooleanField(
        default=False,
    )

    allow_order_management = models.BooleanField(
        default=False,
    )

    require_discount_approval = models.BooleanField(
        default=True,
    )

    max_auto_discount_percent = models.DecimalField(
    max_digits=5,
    decimal_places=2,
    default=20,
    validators=[
        MinValueValidator(0),
        MaxValueValidator(100),
    ],
)

    require_refund_approval = models.BooleanField(
        default=True,
    )

    require_payment_approval = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business.name} policy"