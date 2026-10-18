import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0008_commercepagebanner_product"),
    ]

    operations = [
        migrations.AlterField(
            model_name="commercepagebanner",
            name="image",
            field=models.ImageField(
                blank=True,
                help_text=(
                    "Optional custom creative. If empty, the linked "
                    "product image is used."
                ),
                upload_to="commerce/banners/%Y/%m/",
            ),
        ),
        migrations.AlterField(
            model_name="commercepagebanner",
            name="product",
            field=models.ForeignKey(
                blank=True,
                help_text=(
                    "Product this slide promotes. Can be used alone "
                    "(no custom banner)."
                ),
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="promo_banners",
                to="commerce.product",
            ),
        ),
    ]
