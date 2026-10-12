from rest_framework import serializers

from .models import (
    ContentPillar,
    LinkedInConnection,
    ProfessionalPost,
    ProfessionalProfile,
    ProfessionalProgram,
    ProfessionalWeeklyBrief,
)


class ContentPillarSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentPillar
        fields = [
            "id",
            "name",
            "description",
            "weight",
            "sort_order",
        ]


class LinkedInConnectionSerializer(serializers.ModelSerializer):
    configured = serializers.SerializerMethodField()

    class Meta:
        model = LinkedInConnection
        fields = [
            "connection_status",
            "display_name",
            "linkedin_member_id",
            "token_expires_at",
            "configured",
        ]

    def get_configured(self, obj: LinkedInConnection) -> bool:
        from .services.linkedin import linkedin_configured

        return linkedin_configured()


class ProfessionalProfileSerializer(serializers.ModelSerializer):
    pillars = ContentPillarSerializer(many=True, read_only=True)
    linkedin = serializers.SerializerMethodField()
    profile_ready = serializers.SerializerMethodField()

    class Meta:
        model = ProfessionalProfile
        fields = [
            "id",
            "headline",
            "role_title",
            "industry",
            "tone_notes",
            "operating_mode",
            "onboarding_path",
            "linkedin_setup_complete",
            "profile_setup_complete",
            "profile_ready",
            "topic_autopilot_enabled",
            "topic_autopilot_standing_topic",
            "topic_autopilot_last_run_at",
            "pillars",
            "linkedin",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "profile_ready",
            "topic_autopilot_last_run_at",
            "created_at",
            "updated_at",
        ]

    def get_profile_ready(self, obj: ProfessionalProfile) -> bool:
        from .services.profile_readiness import is_profile_ready

        return is_profile_ready(obj)

    def get_linkedin(self, obj: ProfessionalProfile) -> dict:
        connection, _ = LinkedInConnection.objects.get_or_create(profile=obj)
        return LinkedInConnectionSerializer(connection).data


class ProfessionalProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessionalProgram
        fields = [
            "id",
            "program_type",
            "status",
            "title",
            "input_data",
            "plan",
            "event_image",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "plan",
            "created_at",
            "updated_at",
        ]


class ProfessionalPostSerializer(serializers.ModelSerializer):
    copy_text = serializers.SerializerMethodField()

    class Meta:
        model = ProfessionalPost
        fields = [
            "id",
            "program",
            "arc_index",
            "post_role",
            "format",
            "title",
            "body",
            "carousel_slides",
            "status",
            "scheduled_at",
            "published_at",
            "publish_error",
            "linkedin_post_urn",
            "copy_text",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "published_at",
            "publish_error",
            "linkedin_post_urn",
            "created_at",
            "updated_at",
        ]

    def get_copy_text(self, obj: ProfessionalPost) -> str:
        if obj.format == ProfessionalPost.Format.CAROUSEL_OUTLINE and obj.carousel_slides:
            slides = "\n\n---\n\n".join(str(s) for s in obj.carousel_slides)
            return f"{obj.body.strip()}\n\n[Carousel slides]\n{slides}".strip()
        return obj.body


class ProfessionalWeeklyBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessionalWeeklyBrief
        fields = [
            "id",
            "week_start",
            "status",
            "greeting",
            "sections",
            "evidence",
            "error_message",
            "created_at",
            "updated_at",
        ]
