from django.db import migrations, models


def forwards_fulfilled_to_delivered(apps, schema_editor):
    Order = apps.get_model("commerce", "Order")
    Order.objects.filter(status="fulfilled").update(status="delivered")


def backwards_delivered_to_fulfilled(apps, schema_editor):
    Order = apps.get_model("commerce", "Order")
    Order.objects.filter(status="delivered").update(status="fulfilled")


class Migration(migrations.Migration):

    dependencies = [
        ("commerce", "0009_commercepagebanner_image_optional"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="customer_address",
            field=models.CharField(blank=True, max_length=400),
        ),
        migrations.AddField(
            model_name="order",
            name="delivery_note",
            field=models.CharField(blank=True, max_length=400),
        ),
        migrations.AddField(
            model_name="order",
            name="rider_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="order",
            name="review_ask_draft",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="order",
            name="stock_adjusted",
            field=models.BooleanField(
                default=False,
                help_text="True after stock was decremented for this order.",
            ),
        ),
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("new", "New"),
                    ("confirmed", "Confirmed"),
                    ("packing", "Packing"),
                    ("out_for_delivery", "Out for delivery"),
                    ("delivered", "Delivered"),
                    ("cancelled", "Cancelled"),
                ],
                default="new",
                max_length=20,
            ),
        ),
        migrations.RunPython(
            forwards_fulfilled_to_delivered,
            backwards_delivered_to_fulfilled,
        ),
    ]
