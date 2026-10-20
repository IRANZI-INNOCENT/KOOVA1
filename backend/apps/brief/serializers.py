from rest_framework import serializers

from .models import MorningBrief, WeeklyReport


class MorningBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = MorningBrief
        fields = [
            "id",
            "business",
            "date",
            "status",
            "greeting",
            "sections",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class WeeklyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyReport
        fields = [
            "id",
            "business",
            "week_start",
            "status",
            "greeting",
            "sections",
            "error_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
