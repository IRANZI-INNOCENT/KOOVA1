from django.contrib import admin

from .models import SocialAccount, SocialAction, SocialPost

admin.site.register(SocialAccount)
admin.site.register(SocialPost)
admin.site.register(SocialAction)
