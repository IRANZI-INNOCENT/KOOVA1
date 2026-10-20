import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("businesses", "0001_initial"),
        ("commerce", "0010_order_fulfillment_and_stock"),
    ]

    operations = [
        migrations.CreateModel(
            name="BusinessExpense",
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
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("currency", models.CharField(default="KES", max_length=10)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("rider", "Rider"),
                            ("packaging", "Packaging"),
                            ("restock", "Restock"),
                            ("ads", "Ads"),
                            ("other", "Other"),
                        ],
                        default="other",
                        max_length=20,
                    ),
                ),
                ("note", models.CharField(blank=True, max_length=400)),
                ("spent_on", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="expenses",
                        to="businesses.business",
                    ),
                ),
            ],
            options={
                "ordering": ["-spent_on", "-created_at"],
            },
        ),
    ]
