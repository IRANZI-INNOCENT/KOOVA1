import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0007_commercepage_secondary_color"),
    ]

    operations = [
        migrations.AddField(
            model_name="commercepagebanner",
            name="product",
            field=models.ForeignKey(
                blank=True,
                help_text="Optional product this slide promotes (opens the product page).",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="promo_banners",
                to="commerce.product",
            ),
        ),
    ]
