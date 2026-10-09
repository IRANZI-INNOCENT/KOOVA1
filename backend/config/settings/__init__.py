"""
Kova settings package.

Defaults to the development configuration so that ``manage.py``
works without setting ``DJANGO_SETTINGS_MODULE`` manually.

Production deployments must set the environment variable explicitly:

    DJANGO_SETTINGS_MODULE=config.settings.production
"""

import os

_env = os.environ.get("KOVA_ENV", "development")

if _env == "production":
    from .production import *  # noqa: F401,F403
elif _env == "test":
    from .test import *  # noqa: F401,F403
else:
    from .development import *  # noqa: F401,F403
