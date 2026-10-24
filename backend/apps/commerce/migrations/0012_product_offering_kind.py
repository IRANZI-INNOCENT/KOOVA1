from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("commerce", "0011_businessexpense"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="offering_kind",
            field=models.CharField(
                choices=[("product", "Product"), ("service", "Service")],
                default="product",
                max_length=16,
            ),
        ),
    ]
