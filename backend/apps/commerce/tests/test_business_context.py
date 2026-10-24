from django.db import models
from django.db.models.fields.files import FieldFile
from django.test import SimpleTestCase

from apps.commerce.services.business_context import CommerceBusinessContextService


class BusinessContextSerializationTests(SimpleTestCase):
    def test_image_fields_become_file_names(self):
        logo_field = models.ImageField(name="logo")
        title_field = models.CharField(name="title", max_length=40)

        class Stub:
            class _meta:
                concrete_fields = [title_field, logo_field]

            title = "KOVA FASHIONS"

        stub = Stub()
        stub.logo = FieldFile(stub, logo_field, "commerce/storefront/logo.jpg")

        data = CommerceBusinessContextService.serialize_instance(stub)

        self.assertEqual(data["title"], "KOVA FASHIONS")
        self.assertEqual(data["logo"], "commerce/storefront/logo.jpg")
