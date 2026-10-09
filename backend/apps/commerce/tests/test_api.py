from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from apps.businesses.models import Business

from ..models import CommercePage, Product, ProductImage


User = get_user_model()