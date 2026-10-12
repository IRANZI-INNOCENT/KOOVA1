from django.urls import path

from . import views

app_name = "professional"

urlpatterns = [
    path("onboarding/status/", views.OnboardingStatusView.as_view(), name="onboarding-status"),
    path("onboarding/choice/", views.OnboardingChoiceView.as_view(), name="onboarding-choice"),
    path("brain/", views.LinkedInBrainView.as_view(), name="brain"),
    path("profile/", views.ProfessionalProfileView.as_view(), name="profile"),
    path(
        "profile/complete-setup/",
        views.ProfileSetupCompleteView.as_view(),
        name="profile-complete-setup",
    ),
    path("pillars/", views.ContentPillarListView.as_view(), name="pillar-list"),
    path("pillars/<int:pk>/", views.ContentPillarDetailView.as_view(), name="pillar-detail"),
    path("programs/topic-week/", views.TopicWeekProgramView.as_view(), name="topic-week"),
    path(
        "programs/topic-week/current/",
        views.TopicWeekCurrentView.as_view(),
        name="topic-week-current",
    ),
    path(
        "topic-autopilot/run/",
        views.TopicAutopilotRunView.as_view(),
        name="topic-autopilot-run",
    ),
    path("programs/event-moment/", views.EventMomentStartView.as_view(), name="event-start"),
    path(
        "programs/<int:program_id>/event-answer/",
        views.EventMomentAnswerView.as_view(),
        name="event-answer",
    ),
    path("programs/", views.ProgramListView.as_view(), name="program-list"),
    path("programs/<int:program_id>/", views.ProgramDetailView.as_view(), name="program-detail"),
    path(
        "programs/<int:program_id>/generate-drafts/",
        views.ProgramGenerateDraftsView.as_view(),
        name="program-drafts",
    ),
    path("posts/", views.PostListView.as_view(), name="post-list"),
    path("posts/<int:post_id>/", views.PostDetailView.as_view(), name="post-detail"),
    path("posts/<int:post_id>/approve/", views.PostApproveView.as_view(), name="post-approve"),
    path("posts/<int:post_id>/schedule/", views.PostScheduleView.as_view(), name="post-schedule"),
    path("posts/<int:post_id>/publish/", views.PostPublishView.as_view(), name="post-publish"),
    path("posts/<int:post_id>/copied/", views.PostCopiedView.as_view(), name="post-copied"),
    path("weekly-brief/latest/", views.WeeklyBriefLatestView.as_view(), name="weekly-brief-latest"),
    path(
        "weekly-brief/generate/",
        views.WeeklyBriefGenerateView.as_view(),
        name="weekly-brief-generate",
    ),
    path("linkedin/oauth-url/", views.LinkedInOAuthURLView.as_view(), name="linkedin-oauth-url"),
    path("linkedin/callback/", views.LinkedInOAuthCallbackView.as_view(), name="linkedin-callback"),
    path("linkedin/disconnect/", views.LinkedInDisconnectView.as_view(), name="linkedin-disconnect"),
]
