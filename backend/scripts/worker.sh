#!/bin/sh
# Scheduled posts and incoming comments. Run this as a second Railway
# service with the same root directory and the same variables as the API.
export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"
while true; do
  python manage.py dispatch_social_posts
  python manage.py pull_comments
  sleep 60
done
