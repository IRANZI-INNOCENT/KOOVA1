import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("commerce", "0015_order_lead_stock_adjustment"),
    ]

    operations = [
        migrations.CreateModel(
            name="StorefrontEvent",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("store_view", "Store viewed"),
                            ("product_view", "Product viewed"),
                            ("whatsapp_header", "WhatsApp (header)"),
                            ("whatsapp_product", "WhatsApp (product)"),
                            ("search", "Product search"),
                            ("filter", "Catalogue filter"),
                        ],
                        max_length=32,
                    ),
                ),
                ("path", models.CharField(blank=True, max_length=300)),
                ("meta", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="storefront_events",
                        to="businesses.business",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="storefront_events",
                        to="commerce.product",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["business", "kind", "created_at"],
                        name="commerce_st_busines_8b0f0d_idx",
                    )
                ],
            },
        ),
    ]
