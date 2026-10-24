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
    profile_knowledge = serializers.SerializerMethodField()
    connection_status = serializers.SerializerMethodField()

    class Meta:
        model = LinkedInConnection
        fields = [
            "connection_status",
            "display_name",
            "linkedin_member_id",
            "token_expires_at",
            "profile_synced_at",
            "profile_knowledge",
            "configured",
        ]

    def get_connection_status(self, obj: LinkedInConnection) -> str:
        from .services.linkedin import effective_connection_status

        return effective_connection_status(obj)

    def get_configured(self, obj: LinkedInConnection) -> bool:
        from .services.linkedin import linkedin_configured

        return linkedin_configured()

    def get_profile_knowledge(self, obj: LinkedInConnection) -> dict:
        from .services.linkedin_profile_sync import profile_knowledge_for_brain

        return profile_knowledge_for_brain(obj)


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
    event_image_url = serializers.SerializerMethodField()
    event_images = serializers.SerializerMethodField()

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
            "event_image_url",
            "event_images",
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

    def _absolute(self, path: str) -> str:
        request = self.context.get("request")
        if request is not None:
            return request.build_absolute_uri(path)
        from apps.commerce.services.storefront import absolute_media_url

        return absolute_media_url(path)

    def get_event_image_url(self, obj: ProfessionalProgram) -> str | None:
        if obj.event_image:
            return self._absolute(obj.event_image.url)
        return None

    def get_event_images(self, obj: ProfessionalProgram) -> list[dict]:
        rows = []
        for row in obj.event_images.all():
            if row.image:
                rows.append(
                    {
                        "id": row.id,
                        "url": self._absolute(row.image.url),
                        "sort_order": row.sort_order,
                    },
                )
        if not rows and obj.event_image:
            rows.append(
                {
                    "id": 0,
                    "url": self._absolute(obj.event_image.url),
                    "sort_order": 0,
                },
            )
        return rows


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
            "media_urls",
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
        from apps.professional.services.carousel_copy import (
            linkedin_carousel_copy,
            normalize_carousel_slides,
        )

        if obj.format == ProfessionalPost.Format.CAROUSEL_OUTLINE:
            slides = normalize_carousel_slides(obj.carousel_slides)
            if slides:
                return linkedin_carousel_copy(obj.body, slides)
        return obj.body

    def to_representation(self, instance):
        from apps.professional.services.carousel_copy import normalize_carousel_slides

        data = super().to_representation(instance)
        if data.get("carousel_slides"):
            data["carousel_slides"] = normalize_carousel_slides(
                data["carousel_slides"],
            )
        return data


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
