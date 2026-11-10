import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("leads", "0001_initial"),
        ("commerce", "0014_order_payment_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="lead",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="orders",
                to="leads.lead",
            ),
        ),
        migrations.CreateModel(
            name="ProductStockAdjustment",
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
                    "previous_stock",
                    models.PositiveIntegerField(blank=True, null=True),
                ),
                ("new_stock", models.PositiveIntegerField(blank=True, null=True)),
                ("delta", models.IntegerField(default=0)),
                (
                    "reason",
                    models.CharField(
                        choices=[
                            ("manual", "Manual"),
                            ("restock", "Restock"),
                            ("sale", "Sale"),
                            ("cancel", "Order cancelled"),
                        ],
                        default="manual",
                        max_length=20,
                    ),
                ),
                ("note", models.CharField(blank=True, max_length=400)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="stock_adjustments",
                        to="businesses.business",
                    ),
                ),
                (
                    "order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="stock_adjustments",
                        to="commerce.order",
                    ),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="stock_adjustments",
                        to="commerce.product",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
