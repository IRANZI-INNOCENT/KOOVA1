from pathlib import Path
import os

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

DEBUG = False

ALLOWED_HOSTS = []


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "apps.accounts",
    "apps.businesses",
    "rest_framework_simplejwt",
    "corsheaders",
    "apps.business_brain",
    "apps.commerce",
    "apps.content",
    "apps.leads",
    "apps.social",
    "apps.brief",
]

AUTH_USER_MODEL = "accounts.User"

OPENROUTER_API_KEY = os.getenv(
    "OPENROUTER_API_KEY",
    "",
)

OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "google/gemini-3.8-flash",
)

OPENROUTER_VISION_MODEL = os.getenv(
    "OPENROUTER_VISION_MODEL",
    "",
) or os.getenv(
    "OPENROUTER_MODEL",
    "google/gemini-3.8-flash",
)

OPENROUTER_SITE_URL = os.getenv(
    "OPENROUTER_SITE_URL",
    "",
)

OPENROUTER_APP_NAME = os.getenv(
    "OPENROUTER_APP_NAME",
    "Kova",
)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "kova_agent": "30/minute",
    },
}

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",

    # Allow the Next.js frontend to make browser requests to Django
    # during local development.
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", "kova"),
        "USER": os.getenv("POSTGRES_USER", "kova"),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", "kova"),
        "HOST": os.getenv("POSTGRES_HOST", "localhost"),
        "PORT": os.getenv("POSTGRES_PORT", "5432"),
    }
}

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

# Allow the frontend to send cookies with API requests.
#
# This is required because Kova uses an HttpOnly refresh-token
# cookie for authentication.
CORS_ALLOW_CREDENTIALS = True

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


LANGUAGE_CODE = "en-us"

TIME_ZONE = "Africa/Nairobi"

USE_I18N = True

USE_TZ = True


STATIC_URL = "static/"

STATIC_ROOT = BASE_DIR / "staticfiles"


MEDIA_URL = "media/"

MEDIA_ROOT = BASE_DIR / "media"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Redis
REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://localhost:6379/0",
)


# Celery
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

CELERY_TIMEZONE = TIME_ZONE