#!/bin/sh
# API plus the comment and schedule loop, on one disk.
# Railway volumes attach to a single service, and scheduled photo
# posts read the uploaded file from MEDIA_ROOT.
cd "$(dirname "$0")/.." || exit 1
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
sh scripts/worker.sh &
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}" --workers 2 --timeout 120
