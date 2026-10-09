import os
from urllib.parse import unquote, urlparse

from .base import *


DEBUG = False

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")
    if host.strip()
]

for key in ("RAILWAY_PUBLIC_DOMAIN", "RAILWAY_PRIVATE_DOMAIN"):
    domain = os.getenv(key, "").strip()
    if domain and domain not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(domain)

for suffix in (".up.railway.app", ".railway.app"):
    if suffix not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(suffix)

# Railway terminates HTTPS and forwards the original host and scheme.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
cors_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
if frontend_url and frontend_url not in cors_origins:
    cors_origins.append(frontend_url)

CORS_ALLOWED_ORIGINS = cors_origins
CSRF_TRUSTED_ORIGINS = list(cors_origins)
public_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN", "").strip()
if public_domain:
    CSRF_TRUSTED_ORIGINS.append(f"https://{public_domain}")

# The site and the API are separate Railway services, so the refresh
# cookie has to travel on a cross-site request.
REFRESH_COOKIE_SECURE = True
REFRESH_COOKIE_SAMESITE = "None"

database_url = os.getenv("DATABASE_URL", "").strip()
if database_url:
    parsed = urlparse(database_url)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or 5432),
            "CONN_MAX_AGE": 60,
        }
    }

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")

media_root = os.getenv("MEDIA_ROOT", "").strip()
if media_root:
    MEDIA_ROOT = media_root
