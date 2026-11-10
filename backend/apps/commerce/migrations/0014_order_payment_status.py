from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("commerce", "0013_alter_commercepage_options_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="paid_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("unpaid", "Unpaid"),
                    ("paid", "Paid"),
                    ("partial", "Partially paid"),
                    ("refunded", "Refunded"),
                ],
                default="unpaid",
                max_length=20,
            ),
        ),
    ]
