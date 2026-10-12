from __future__ import annotations

from django.core import signing
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.businesses.models import Business

from .models import (
    ContentPillar,
    LinkedInConnection,
    ProfessionalPost,
    ProfessionalProfile,
    ProfessionalProgram,
    ProfessionalWeeklyBrief,
)
from .serializers import (
    ContentPillarSerializer,
    ProfessionalPostSerializer,
    ProfessionalProfileSerializer,
    ProfessionalProgramSerializer,
    ProfessionalWeeklyBriefSerializer,
)
from .services import linkedin as linkedin_service
from .services.programs import (
    create_topic_week_program,
    current_topic_week_program,
    generate_drafts_for_program,
    plan_event_arc,
    run_topic_week_pipeline,
    schedule_topic_week_posts,
    suggest_event_question,
)
from .services.professional_brain import attach_brain_to_program_input, gather_brain_snapshot
from .services.profile_readiness import is_profile_ready, mark_profile_setup_if_ready
from .services.topic_autopilot import run_topic_autopilot_for_profile
from .services.weekly_brief import generate_weekly_brief


def get_profile(user) -> ProfessionalProfile:
    profile, _ = ProfessionalProfile.objects.get_or_create(user=user)
    LinkedInConnection.objects.get_or_create(profile=profile)
    return profile


class OnboardingStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        has_business = Business.objects.filter(owner=request.user).exists()
        has_profile = ProfessionalProfile.objects.filter(user=request.user).exists()
        profile = (
            ProfessionalProfile.objects.filter(user=request.user).first()
            if has_profile
            else None
        )
        return Response(
            {
                "has_business": has_business,
                "has_professional_profile": has_profile,
                "onboarding_path": profile.onboarding_path if profile else "",
                "linkedin_setup_complete": bool(
                    profile and profile.linkedin_setup_complete,
                ),
            },
        )


class OnboardingChoiceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        path = request.data.get("path", "")
        valid = {
            ProfessionalProfile.OnboardingPath.LINKEDIN,
            ProfessionalProfile.OnboardingPath.BUSINESS,
            ProfessionalProfile.OnboardingPath.BOTH,
        }
        if path not in valid:
            return Response(
                {"detail": "path must be linkedin, business, or both."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = get_profile(request.user)
        profile.onboarding_path = path
        if path in {
            ProfessionalProfile.OnboardingPath.LINKEDIN,
            ProfessionalProfile.OnboardingPath.BOTH,
        }:
            profile.linkedin_setup_complete = False
        profile.save(update_fields=["onboarding_path", "linkedin_setup_complete", "updated_at"])
        return Response(ProfessionalProfileSerializer(profile).data)


class LinkedInBrainView(APIView):
    """Snapshot of what Kova uses as the LinkedIn content brain."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_profile(request.user)
        topic = (request.query_params.get("topic") or "").strip()
        return Response(gather_brain_snapshot(profile, topic=topic))


class ProfessionalProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_profile(request.user)
        return Response(ProfessionalProfileSerializer(profile).data)

    def patch(self, request):
        profile = get_profile(request.user)
        serializer = ProfessionalProfileSerializer(
            profile,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        profile.refresh_from_db()
        mark_profile_setup_if_ready(profile)
        return Response(ProfessionalProfileSerializer(profile).data)


class ContentPillarListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_profile(request.user)
        pillars = profile.pillars.all()
        return Response(ContentPillarSerializer(pillars, many=True).data)

    def post(self, request):
        profile = get_profile(request.user)
        if profile.pillars.count() >= 5:
            return Response(
                {"detail": "You can have at most five content pillars."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ContentPillarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pillar = serializer.save(profile=profile)
        mark_profile_setup_if_ready(profile)
        return Response(
            ContentPillarSerializer(pillar).data,
            status=status.HTTP_201_CREATED,
        )


class ContentPillarDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        profile = get_profile(request.user)
        pillar = ContentPillar.objects.get(pk=pk, profile=profile)
        serializer = ContentPillarSerializer(pillar, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk):
        profile = get_profile(request.user)
        pillar = ContentPillar.objects.get(pk=pk, profile=profile)
        pillar.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileSetupCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = (
            ProfessionalProfile.objects.prefetch_related("pillars")
            .filter(user=request.user)
            .first()
        )
        if profile is None:
            profile = get_profile(request.user)
        if not is_profile_ready(profile):
            return Response(
                ProfessionalProfileSerializer(profile).data,
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile.profile_setup_complete = True
        profile.save(update_fields=["profile_setup_complete", "updated_at"])
        profile.refresh_from_db()
        return Response(ProfessionalProfileSerializer(profile).data)


class TopicWeekProgramView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = get_profile(request.user)
        topic = (request.data.get("topic") or "").strip()
        if not topic:
            return Response(
                {"detail": "topic is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        audience = (request.data.get("audience") or "").strip()
        stance = (request.data.get("stance") or "").strip()
        run_full = bool(request.data.get("run_full"))
        try:
            program, _created = create_topic_week_program(
                profile,
                topic=topic,
                audience=audience,
                stance=stance,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        payload: dict = {
            "program": ProfessionalProgramSerializer(program).data,
            "created": _created,
        }
        if run_full:
            try:
                posts = run_topic_week_pipeline(profile, program)
                payload["posts"] = ProfessionalPostSerializer(posts, many=True).data
            except ValueError as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(payload, status=status.HTTP_201_CREATED)


class TopicWeekCurrentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_profile(request.user)
        program = current_topic_week_program(profile)
        if not program:
            return Response({"program": None, "posts": []})
        posts = program.posts.all()
        return Response(
            {
                "program": ProfessionalProgramSerializer(program).data,
                "posts": ProfessionalPostSerializer(posts, many=True).data,
            },
        )


class TopicAutopilotRunView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = get_profile(request.user)
        force = bool(request.data.get("force"))
        result = run_topic_autopilot_for_profile(profile, force=force)
        program = None
        posts = []
        if result.get("program_id"):
            program = ProfessionalProgram.objects.filter(
                pk=result["program_id"],
                profile=profile,
            ).first()
            if program:
                posts = list(program.posts.all())
        return Response(
            {
                **result,
                "program": (
                    ProfessionalProgramSerializer(program).data if program else None
                ),
                "posts": ProfessionalPostSerializer(posts, many=True).data,
            },
        )


class EventMomentStartView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = get_profile(request.user)
        event_type = (request.data.get("event_type") or "conference").strip()
        event_title = (request.data.get("event_title") or "").strip()
        image_hint = (request.data.get("image_hint") or "").strip()
        image = request.FILES.get("image")

        question_data = suggest_event_question(
            profile,
            event_type=event_type,
            event_title=event_title,
            image_hint=image_hint,
        )

        event_label = event_title or question_data.get("event_title_guess", "")
        program = ProfessionalProgram.objects.create(
            profile=profile,
            program_type=ProfessionalProgram.ProgramType.EVENT_MOMENT,
            status=ProfessionalProgram.Status.PLANNING,
            title=question_data.get("event_title_guess", event_title or "Event")[:240],
            input_data=attach_brain_to_program_input(
                profile,
                {
                    "event_type": event_type,
                    "event_title": event_label,
                    "suggested_question": question_data["question"],
                    "image_hint": image_hint,
                },
                topic=event_label or "professional event",
            ),
        )
        if image:
            program.event_image = image
            program.save(update_fields=["event_image", "updated_at"])

        payload = ProfessionalProgramSerializer(program).data
        payload["question"] = question_data["question"]
        return Response(payload, status=status.HTTP_201_CREATED)


class EventMomentAnswerView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, program_id):
        profile = get_profile(request.user)
        program = ProfessionalProgram.objects.get(
            pk=program_id,
            profile=profile,
            program_type=ProfessionalProgram.ProgramType.EVENT_MOMENT,
        )
        answer = (request.data.get("answer") or "").strip()
        if not answer:
            return Response(
                {"detail": "answer is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        arc_length = int(request.data.get("arc_length", 3))
        arc_length = max(1, min(3, arc_length))
        event_title = program.input_data.get("event_title") or program.title

        plan = plan_event_arc(
            profile,
            event_title=event_title,
            answer=answer,
            arc_length=arc_length,
        )
        program.input_data = attach_brain_to_program_input(
            profile,
            {
                **program.input_data,
                "answer": answer,
                "arc_length": arc_length,
            },
            topic=str(event_title),
        )
        program.plan = plan
        program.title = plan.get("title", program.title)[:240]
        program.status = ProfessionalProgram.Status.DRAFTING
        program.save()

        try:
            generate_drafts_for_program(program)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        program.refresh_from_db()
        posts = program.posts.all()
        return Response(
            {
                "program": ProfessionalProgramSerializer(program).data,
                "posts": ProfessionalPostSerializer(posts, many=True).data,
            },
        )


class ProgramListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_profile(request.user)
        programs = profile.programs.all()[:20]
        return Response(ProfessionalProgramSerializer(programs, many=True).data)


class ProgramDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, program_id):
        profile = get_profile(request.user)
        program = ProfessionalProgram.objects.get(pk=program_id, profile=profile)
        posts = program.posts.all()
        return Response(
            {
                "program": ProfessionalProgramSerializer(program).data,
                "posts": ProfessionalPostSerializer(posts, many=True).data,
            },
        )


class ProgramGenerateDraftsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, program_id):
        profile = get_profile(request.user)
        program = ProfessionalProgram.objects.get(pk=program_id, profile=profile)
        try:
            posts = generate_drafts_for_program(program)
            if request.data.get("schedule"):
                schedule_topic_week_posts(profile, program, posts)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response(
            ProfessionalPostSerializer(posts, many=True).data,
            status=status.HTTP_201_CREATED,
        )


class PostListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_profile(request.user)
        posts = profile.posts.all()
        return Response(ProfessionalPostSerializer(posts, many=True).data)


class PostDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, post_id):
        profile = get_profile(request.user)
        post = ProfessionalPost.objects.get(pk=post_id, profile=profile)
        serializer = ProfessionalPostSerializer(post, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PostApproveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        profile = get_profile(request.user)
        post = ProfessionalPost.objects.get(pk=post_id, profile=profile)
        if not post.body.strip() and not post.carousel_slides:
            return Response(
                {"detail": "Add post body before approving."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post.status = ProfessionalPost.Status.APPROVED
        post.save(update_fields=["status", "updated_at"])
        return Response(ProfessionalPostSerializer(post).data)


class PostScheduleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        profile = get_profile(request.user)
        post = ProfessionalPost.objects.get(pk=post_id, profile=profile)
        if (
            profile.operating_mode == ProfessionalProfile.OperatingMode.APPROVAL
            and not profile.topic_autopilot_enabled
        ):
            if post.status not in {
                ProfessionalPost.Status.APPROVED,
                ProfessionalPost.Status.SCHEDULED,
            }:
                return Response(
                    {"detail": "Approve this post before scheduling."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        scheduled_at = request.data.get("scheduled_at")
        if not scheduled_at:
            return Response(
                {"detail": "scheduled_at is required (ISO datetime)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        post.scheduled_at = scheduled_at
        post.status = ProfessionalPost.Status.SCHEDULED
        post.save(update_fields=["scheduled_at", "status", "updated_at"])
        return Response(ProfessionalPostSerializer(post).data)


class PostPublishView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        profile = get_profile(request.user)
        post = ProfessionalPost.objects.get(pk=post_id, profile=profile)
        connection = LinkedInConnection.objects.get(profile=profile)

        if (
            profile.operating_mode == ProfessionalProfile.OperatingMode.APPROVAL
            and not profile.topic_autopilot_enabled
        ):
            if post.status not in {
                ProfessionalPost.Status.APPROVED,
                ProfessionalPost.Status.SCHEDULED,
            }:
                return Response(
                    {"detail": "Approve this post before publishing."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if post.format == ProfessionalPost.Format.CAROUSEL_OUTLINE:
            return Response(
                {
                    "published": False,
                    "copy_only": True,
                    "detail": "Carousel outlines must be posted manually on LinkedIn.",
                    "post": ProfessionalPostSerializer(post).data,
                },
            )

        if not linkedin_service.linkedin_configured():
            return Response(
                {
                    "published": False,
                    "copy_only": True,
                    "detail": "LinkedIn OAuth is not configured. Copy the post instead.",
                    "post": ProfessionalPostSerializer(post).data,
                },
            )

        try:
            urn = linkedin_service.publish_text_post(connection, post)
            post.linkedin_post_urn = urn
            post.status = ProfessionalPost.Status.PUBLISHED
            post.published_at = timezone.now()
            post.publish_error = ""
            post.save()
            return Response(
                {
                    "published": True,
                    "post": ProfessionalPostSerializer(post).data,
                },
            )
        except linkedin_service.LinkedInError as exc:
            post.publish_error = str(exc)[:500]
            post.save(update_fields=["publish_error", "updated_at"])
            return Response(
                {
                    "published": False,
                    "detail": str(exc),
                    "post": ProfessionalPostSerializer(post).data,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )


class PostCopiedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        profile = get_profile(request.user)
        post = ProfessionalPost.objects.get(pk=post_id, profile=profile)
        post.status = ProfessionalPost.Status.COPIED
        post.save(update_fields=["status", "updated_at"])
        return Response(ProfessionalPostSerializer(post).data)


class WeeklyBriefLatestView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = get_profile(request.user)
        brief = profile.weekly_briefs.first()
        if not brief:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(ProfessionalWeeklyBriefSerializer(brief).data)


class WeeklyBriefGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = get_profile(request.user)
        brief = generate_weekly_brief(profile)
        return Response(ProfessionalWeeklyBriefSerializer(brief).data)


class LinkedInOAuthURLView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not linkedin_service.linkedin_configured():
            return Response(
                {"detail": "LinkedIn connection is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        profile = get_profile(request.user)
        state = signing.dumps({"profile_id": profile.id})
        redirect_uri = request.build_absolute_uri("/api/professional/linkedin/callback/")
        url = linkedin_service.oauth_authorize_url(state=state, redirect_uri=redirect_uri)
        return Response({"url": url})


class LinkedInOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        error = request.GET.get("error")
        front = linkedin_service.frontend_redirect_base()
        if error:
            return redirect(f"{front}/workspace/linkedin/connect?error={error}")

        code = request.GET.get("code", "")
        state = request.GET.get("state", "")
        if not code or not state:
            return redirect(f"{front}/workspace/linkedin/connect?error=state")

        redirect_uri = request.build_absolute_uri("/api/professional/linkedin/callback/")
        try:
            payload = signing.loads(state, max_age=900)
            profile_id = int(payload["profile_id"])
            profile = ProfessionalProfile.objects.get(pk=profile_id)
            bundle = linkedin_service.exchange_code(code=code, redirect_uri=redirect_uri)
            member = linkedin_service.fetch_member_profile(bundle["access_token"])
            connection = LinkedInConnection.objects.get(profile=profile)
            linkedin_service.apply_token_bundle(connection, bundle)
            connection.linkedin_member_id = member.get("sub", "")
            connection.display_name = member.get("name", "")
            connection.save()
            profile.linkedin_setup_complete = True
            profile.save(update_fields=["linkedin_setup_complete", "updated_at"])
        except Exception:
            return redirect(f"{front}/workspace/linkedin/connect?error=callback")

        return redirect(f"{front}/workspace/linkedin/connect?connected=1")


class LinkedInDisconnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = get_profile(request.user)
        connection = LinkedInConnection.objects.get(profile=profile)
        connection.access_token = ""
        connection.refresh_token = ""
        connection.linkedin_member_id = ""
        connection.display_name = ""
        connection.connection_status = LinkedInConnection.Status.DISCONNECTED
        connection.save()
        profile.linkedin_setup_complete = False
        profile.save(update_fields=["linkedin_setup_complete", "updated_at"])
        return Response({"detail": "LinkedIn disconnected."})
