from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("commerce", "0004_order"),
    ]

    operations = [
        migrations.AddField(
            model_name="commercepage",
            name="accent_color",
            field=models.CharField(
                blank=True,
                default="#F4B183",
                help_text="CTA / highlight color as #RRGGBB.",
                max_length=7,
            ),
        ),
        migrations.AddField(
            model_name="commercepage",
            name="cover",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="commerce/storefront/%Y/%m/",
            ),
        ),
        migrations.AddField(
            model_name="commercepage",
            name="font_preset",
            field=models.CharField(
                choices=[
                    ("classic", "Classic"),
                    ("modern", "Modern"),
                    ("soft", "Soft"),
                ],
                default="classic",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="commercepage",
            name="layout_preset",
            field=models.CharField(
                choices=[
                    ("compact", "Compact catalog"),
                    ("editorial", "Editorial"),
                    ("whatsapp_first", "WhatsApp-first"),
                    ("gallery", "Gallery"),
                ],
                default="compact",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="commercepage",
            name="logo",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="commerce/storefront/%Y/%m/",
            ),
        ),
        migrations.AddField(
            model_name="commercepage",
            name="primary_color",
            field=models.CharField(
                blank=True,
                default="#176B4D",
                help_text="Header/footer brand color as #RRGGBB.",
                max_length=7,
            ),
        ),
        migrations.AddField(
            model_name="commercepage",
            name="show_about",
            field=models.BooleanField(
                default=True,
                help_text="Show about copy in the footer / about section.",
            ),
        ),
        migrations.AddField(
            model_name="commercepage",
            name="show_featured",
            field=models.BooleanField(
                default=False,
                help_text="Highlight a few products above the full grid.",
            ),
        ),
        migrations.AddField(
            model_name="commercepage",
            name="show_hero",
            field=models.BooleanField(
                default=True,
                help_text="Show cover/hero block on the store home.",
            ),
        ),
    ]
