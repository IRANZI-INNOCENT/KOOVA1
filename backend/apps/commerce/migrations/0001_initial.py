from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("businesses", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="CommercePage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=160, unique=True)),
                ("title", models.CharField(blank=True, max_length=200)),
                ("tagline", models.CharField(blank=True, max_length=300)),
                ("description", models.TextField(blank=True)),
                ("whatsapp", models.CharField(blank=True, max_length=30)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("location", models.CharField(blank=True, max_length=200)),
                ("is_published", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("business", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="commerce_page", to="businesses.business")),
            ],
            options={"ordering": ["-updated_at"]},
        ),
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("slug", models.SlugField(max_length=220)),
                ("sku", models.CharField(blank=True, max_length=100)),
                ("category", models.CharField(blank=True, max_length=160)),
                ("price", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("currency", models.CharField(default="KES", max_length=10)),
                ("stock", models.PositiveIntegerField(blank=True, null=True)),
                ("brand", models.CharField(blank=True, max_length=160)),
                ("material", models.CharField(blank=True, max_length=160)),
                ("size", models.CharField(blank=True, max_length=160)),
                ("color", models.CharField(blank=True, max_length=160)),
                ("condition", models.CharField(blank=True, max_length=100)),
                ("short_description", models.TextField(blank=True)),
                ("description", models.TextField(blank=True)),
                ("seo_title", models.CharField(blank=True, max_length=220)),
                ("seo_description", models.TextField(blank=True)),
                ("selling_points", models.JSONField(blank=True, default=list)),
                ("keywords", models.JSONField(blank=True, default=list)),
                ("visual_attributes", models.JSONField(blank=True, default=dict)),
                ("uncertain_attributes", models.JSONField(blank=True, default=list)),
                ("ai_summary", models.TextField(blank=True)),
                ("ai_confidence", models.DecimalField(blank=True, decimal_places=4, max_digits=5, null=True)),
                ("ai_generated", models.BooleanField(default=False)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("active", "Active"), ("archived", "Archived")], default="draft", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("business", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="products", to="businesses.business")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ProductImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.FileField(upload_to="commerce/products/%Y/%m/")),
                ("alt_text", models.CharField(blank=True, max_length=300)),
                ("display_order", models.PositiveIntegerField(default=0)),
                ("is_primary", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="images", to="commerce.product")),
            ],
            options={"ordering": ["display_order", "created_at"]},
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.UniqueConstraint(fields=("business", "slug"), name="unique_product_slug_per_business"),
        ),
    ]
