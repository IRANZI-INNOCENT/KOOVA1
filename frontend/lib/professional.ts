import { authenticatedApiRequest } from "./api";

export type OperatingMode = "assist" | "approval";
export type OnboardingPath = "linkedin" | "business" | "both";

export interface ContentPillar {
  id: number;
  name: string;
  description: string;
  weight: number;
  sort_order: number;
}

export interface LinkedInProfileKnowledge {
  available: boolean;
  synced_at?: string;
  name?: string;
  headline?: string;
  summary?: string;
  location?: string;
  profile_url?: string;
  photo_url?: string;
  positions?: string[];
  sources?: string[];
}

export interface LinkedInConnectionInfo {
  connection_status: string;
  display_name: string;
  linkedin_member_id: string;
  token_expires_at: string | null;
  profile_synced_at: string | null;
  profile_knowledge: LinkedInProfileKnowledge;
  configured: boolean;
}

export interface ProfessionalProfile {
  id: number;
  headline: string;
  role_title: string;
  industry: string;
  tone_notes: string;
  operating_mode: OperatingMode;
  onboarding_path: OnboardingPath | "";
  linkedin_setup_complete: boolean;
  profile_setup_complete: boolean;
  profile_ready: boolean;
  topic_autopilot_enabled: boolean;
  topic_autopilot_standing_topic: string;
  topic_autopilot_last_run_at: string | null;
  pillars: ContentPillar[];
  linkedin: LinkedInConnectionInfo;
}

export interface EventImageRef {
  id: number;
  url: string;
  sort_order: number;
}

export interface ProfessionalProgram {
  id: number;
  program_type: "topic_week" | "event_moment";
  status: string;
  title: string;
  input_data: Record<string, unknown>;
  plan: Record<string, unknown>;
  event_image: string | null;
  event_image_url?: string | null;
  event_images?: EventImageRef[];
}

export interface ProfessionalPost {
  id: number;
  program: number | null;
  arc_index: number;
  post_role: string;
  format: string;
  title: string;
  body: string;
  carousel_slides: string[];
  media_urls: string[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  publish_error: string;
  copy_text: string;
}

export interface WeeklyBrief {
  id: number;
  week_start: string;
  status: string;
  greeting: string;
  sections: Record<string, unknown>;
  error_message: string;
}

export interface OnboardingStatus {
  has_business: boolean;
  has_professional_profile: boolean;
  onboarding_path: string;
  linkedin_setup_complete: boolean;
}

export async function getOnboardingStatus(
  token: string,
): Promise<OnboardingStatus> {
  return authenticatedApiRequest<OnboardingStatus>(
    "/professional/onboarding/status/",
    token,
  );
}

export async function setOnboardingChoice(
  token: string,
  path: OnboardingPath,
): Promise<ProfessionalProfile> {
  return authenticatedApiRequest<ProfessionalProfile>(
    "/professional/onboarding/choice/",
    token,
    {
      method: "POST",
      body: JSON.stringify({ path }),
    },
  );
}

export interface LinkedInBrainSnapshot {
  identity: {
    headline: string;
    role_title: string;
    industry: string;
    owner_name: string;
  };
  voice: { summary: string; tone_notes: string };
  pillars: { name: string; description: string; weight: number }[];
  topic: string;
  matched_pillar: string | null;
  operating_mode: string;
  topic_autopilot_enabled: boolean;
  standing_topic: string;
  linkedin_account?: LinkedInProfileKnowledge;
}

export async function getLinkedInBrain(
  token: string,
  topic?: string,
): Promise<LinkedInBrainSnapshot> {
  const path = topic
    ? `/professional/brain/?topic=${encodeURIComponent(topic)}`
    : "/professional/brain/";
  return authenticatedApiRequest<LinkedInBrainSnapshot>(path, token);
}

export async function getProfessionalProfile(
  token: string,
): Promise<ProfessionalProfile> {
  return authenticatedApiRequest<ProfessionalProfile>(
    "/professional/profile/",
    token,
  );
}

export async function completeLinkedInProfileSetup(
  token: string,
): Promise<ProfessionalProfile> {
  return authenticatedApiRequest<ProfessionalProfile>(
    "/professional/profile/complete-setup/",
    token,
    { method: "POST" },
  );
}

export async function updateProfessionalProfile(
  token: string,
  payload: Partial<ProfessionalProfile>,
): Promise<ProfessionalProfile> {
  return authenticatedApiRequest<ProfessionalProfile>(
    "/professional/profile/",
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function createPillar(
  token: string,
  payload: { name: string; description?: string; weight?: number },
): Promise<ContentPillar> {
  return authenticatedApiRequest<ContentPillar>(
    "/professional/pillars/",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function deletePillar(
  token: string,
  pillarId: number,
): Promise<void> {
  await authenticatedApiRequest<void>(
    `/professional/pillars/${pillarId}/`,
    token,
    { method: "DELETE" },
  );
}

export interface TopicWeekStartResponse {
  program: ProfessionalProgram;
  created: boolean;
  posts?: ProfessionalPost[];
}

export async function getCurrentTopicWeek(
  token: string,
): Promise<{ program: ProfessionalProgram | null; posts: ProfessionalPost[] }> {
  return authenticatedApiRequest<{
    program: ProfessionalProgram | null;
    posts: ProfessionalPost[];
  }>("/professional/programs/topic-week/current/", token);
}

export async function startTopicWeek(
  token: string,
  payload: {
    topic: string;
    audience?: string;
    stance?: string;
    run_full?: boolean;
  },
): Promise<TopicWeekStartResponse> {
  return authenticatedApiRequest<TopicWeekStartResponse>(
    "/professional/programs/topic-week/",
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function runTopicAutopilot(
  token: string,
  force = false,
): Promise<{
  ran: boolean;
  reason?: string;
  program: ProfessionalProgram | null;
  posts: ProfessionalPost[];
  topic?: string;
}> {
  return authenticatedApiRequest(
    "/professional/topic-autopilot/run/",
    token,
    {
      method: "POST",
      body: JSON.stringify({ force }),
    },
  );
}

export async function generateProgramDrafts(
  token: string,
  programId: number,
  schedule = false,
): Promise<ProfessionalPost[]> {
  return authenticatedApiRequest<ProfessionalPost[]>(
    `/professional/programs/${programId}/generate-drafts/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ schedule }),
    },
  );
}

export async function startEventMoment(
  token: string,
  form: FormData,
): Promise<ProfessionalProgram & { question: string }> {
  return authenticatedApiRequest<ProfessionalProgram & { question: string }>(
    "/professional/programs/event-moment/",
    token,
    {
      method: "POST",
      body: form,
    },
  );
}

export async function answerEventMoment(
  token: string,
  programId: number,
  payload: { answer: string; arc_length?: number },
): Promise<{ program: ProfessionalProgram; posts: ProfessionalPost[] }> {
  return authenticatedApiRequest<{
    program: ProfessionalProgram;
    posts: ProfessionalPost[];
  }>(
    `/professional/programs/${programId}/event-answer/`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function listProfessionalPosts(
  token: string,
): Promise<ProfessionalPost[]> {
  return authenticatedApiRequest<ProfessionalPost[]>(
    "/professional/posts/",
    token,
  );
}

export async function updateProfessionalPost(
  token: string,
  postId: number,
  payload: Partial<ProfessionalPost>,
): Promise<ProfessionalPost> {
  return authenticatedApiRequest<ProfessionalPost>(
    `/professional/posts/${postId}/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function approvePost(
  token: string,
  postId: number,
): Promise<ProfessionalPost> {
  return authenticatedApiRequest<ProfessionalPost>(
    `/professional/posts/${postId}/approve/`,
    token,
    { method: "POST" },
  );
}

export async function schedulePost(
  token: string,
  postId: number,
  scheduledAt: string,
): Promise<ProfessionalPost> {
  return authenticatedApiRequest<ProfessionalPost>(
    `/professional/posts/${postId}/schedule/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ scheduled_at: scheduledAt }),
    },
  );
}

export async function publishPost(
  token: string,
  postId: number,
): Promise<{ published: boolean; post: ProfessionalPost; detail?: string }> {
  return authenticatedApiRequest<{
    published: boolean;
    post: ProfessionalPost;
    detail?: string;
  }>(`/professional/posts/${postId}/publish/`, token, { method: "POST" });
}

export async function markPostCopied(
  token: string,
  postId: number,
): Promise<ProfessionalPost> {
  return authenticatedApiRequest<ProfessionalPost>(
    `/professional/posts/${postId}/copied/`,
    token,
    { method: "POST" },
  );
}

export async function getLatestWeeklyBrief(
  token: string,
): Promise<WeeklyBrief | null> {
  try {
    return await authenticatedApiRequest<WeeklyBrief>(
      "/professional/weekly-brief/latest/",
      token,
    );
  } catch {
    return null;
  }
}

export async function generateWeeklyBrief(
  token: string,
): Promise<WeeklyBrief> {
  return authenticatedApiRequest<WeeklyBrief>(
    "/professional/weekly-brief/generate/",
    token,
    { method: "POST" },
  );
}

export interface LinkedInConnectConfig {
  configured: boolean;
  redirect_uri: string;
  redirect_source: string;
  frontend_url: string;
  callback_path: string;
  api_public_url: string;
}

export async function getLinkedInConnectConfig(
  token: string,
): Promise<LinkedInConnectConfig> {
  return authenticatedApiRequest<LinkedInConnectConfig>(
    "/professional/linkedin/config/",
    token,
  );
}

export async function getLinkedInOAuthUrl(
  token: string,
): Promise<{ url: string; redirect_uri?: string }> {
  return authenticatedApiRequest<{ url: string; redirect_uri?: string }>(
    "/professional/linkedin/oauth-url/",
    token,
  );
}

export async function refreshLinkedInProfile(token: string): Promise<{
  linkedin_account: LinkedInProfileKnowledge;
}> {
  return authenticatedApiRequest(
    "/professional/linkedin/refresh-profile/",
    token,
    { method: "POST" },
  );
}

export async function disconnectLinkedIn(token: string): Promise<void> {
  await authenticatedApiRequest<void>(
    "/professional/linkedin/disconnect/",
    token,
    { method: "POST" },
  );
}
