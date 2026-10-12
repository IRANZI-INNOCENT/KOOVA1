import hashlib
import os
from urllib.parse import unquote, urlparse

from django.core.exceptions import ImproperlyConfigured

from .base import *

if not SECRET_KEY:
    raise ImproperlyConfigured("Set DJANGO_SECRET_KEY on the API service before deploying.")


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
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

KOVA_ADMIN_GATE_COOKIE_SECURE = True

if not KOVA_ADMIN_GATE_SECRET:
    if SECRET_KEY:
        # Boot without a separate Railway var; override with KOVA_ADMIN_GATE_SECRET when you can.
        KOVA_ADMIN_GATE_SECRET = hashlib.sha256(
            f"{SECRET_KEY}:kova-admin-gate-v1".encode("utf-8"),
        ).hexdigest()
    else:
        raise ImproperlyConfigured(
            "Set DJANGO_SECRET_KEY on the API service, or set KOVA_ADMIN_GATE_SECRET "
            "explicitly. Open admin once with /admin/?kova_admin_gate=that-secret",
        )

MIDDLEWARE.insert(
    2,
    "config.middleware.admin_access.AdminAccessMiddleware",
)

database_url = os.getenv("DATABASE_URL", "").strip()
if database_url:
    parsed = urlparse(database_url)
    db_options: dict[str, str] = {}
    if parsed.hostname and "railway" in parsed.hostname:
        db_options["sslmode"] = "require"
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": unquote(parsed.username or ""),
            "PASSWORD": unquote(parsed.password or ""),
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or 5432),
            "CONN_MAX_AGE": 60,
            "OPTIONS": db_options,
        }
    }
else:
    raise ImproperlyConfigured(
        "Attach Postgres to the API service so Railway provides DATABASE_URL."
    )

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
elif os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_SERVICE_ID"):
    MEDIA_ROOT = "/data/media"
