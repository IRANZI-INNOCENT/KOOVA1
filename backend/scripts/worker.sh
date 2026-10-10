#!/bin/sh
# Scheduled posts, comments, and Autopilot shifts. Started from scripts/web.sh
# on the API service so it shares the same MEDIA volume as uploads.
cd "$(dirname "$0")/.." || exit 1
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
while true; do
  python manage.py dispatch_social_posts
  python manage.py pull_comments
  python manage.py run_autopilot
  sleep 60
done
