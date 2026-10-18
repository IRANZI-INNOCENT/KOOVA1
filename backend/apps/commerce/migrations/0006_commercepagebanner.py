from django.db import migrations, models
import django.db.models.deletion


def copy_cover_to_banner(apps, schema_editor):
    CommercePage = apps.get_model("commerce", "CommercePage")
    CommercePageBanner = apps.get_model("commerce", "CommercePageBanner")
    for page in CommercePage.objects.all().iterator():
        cover = getattr(page, "cover", None)
        if not cover:
            continue
        if CommercePageBanner.objects.filter(page_id=page.pk).exists():
            continue
        CommercePageBanner.objects.create(
            page_id=page.pk,
            image=cover,
            alt_text="",
            display_order=0,
        )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0005_commercepage_branding"),
    ]

    operations = [
        migrations.CreateModel(
            name="CommercePageBanner",
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
                    "image",
                    models.ImageField(upload_to="commerce/banners/%Y/%m/"),
                ),
                (
                    "alt_text",
                    models.CharField(
                        blank=True,
                        help_text="Short label for the slide, e.g. Weekend flash sale.",
                        max_length=200,
                    ),
                ),
                ("display_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "page",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="banners",
                        to="commerce.commercepage",
                    ),
                ),
            ],
            options={
                "ordering": ["display_order", "created_at"],
            },
        ),
        migrations.RunPython(copy_cover_to_banner, noop_reverse),
    ]
