/**
 * Social API helpers.
 *
 * These functions talk to /api/social/<business_id>/...
 */

import { authenticatedApiRequest } from "./api";
import { getPublicApiBaseUrl } from "./api-config";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface SocialAccount {
  id: number;
  business: number;
  platform: "facebook_page" | "instagram";
  platform_account_id: string;
  account_name: string;
  account_username: string;
  profile_picture_url: string;
  scopes: string[];
  connection_status: "connected" | "expired" | "revoked" | "error";
  connection_error: string;
  connected_at: string;
  last_verified_at: string | null;
  metadata: Record<string, unknown>;
  is_healthy: boolean;
  capabilities: SocialCapability[];
  created_at: string;
  updated_at: string;
}

export interface SocialCapability {
  scope: string;
  label: string;
  available: boolean;
}

export interface SocialOverview {
  channels: {
    connected: number;
    total: number;
    accounts: SocialAccount[];
  };
  content: {
    drafts: number;
    approved: number;
    published: number;
  };
  pending_actions: number;
  recent_actions: SocialActionRecord[];
  command: SocialCommand;
}

export interface SocialRecommendation {
  title: string;
  detail: string;
  href: string;
}

export interface SocialCommand {
  scheduled_posts: number;
  conversations_to_review: number;
  potential_leads: number;
  actions_verified_today: number;
  automation_paused: boolean;
  pause_reason: string;
  response_hours: number | null;
  recommendations: SocialRecommendation[];
  plan: string;
  lessons: { kind: string; summary: string }[];
}

export interface SocialActionRecord {
  id: number;
  business: number;
  social_account: number | null;
  action_type: string;
  action_status: string;
  intent: string;
  result: string;
  requires_approval: boolean;
  approved_at: string | null;
  executed_at: string | null;
  target_type: string;
  target_id: string;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* API calls                                                           */
/* ------------------------------------------------------------------ */

export async function getSocialOverview(
  businessId: number,
  token: string,
): Promise<SocialOverview> {
  return authenticatedApiRequest<SocialOverview>(
    `/social/${businessId}/overview/`,
    token,
  );
}

export async function getSocialAccounts(
  businessId: number,
  token: string,
): Promise<SocialAccount[]> {
  return authenticatedApiRequest<SocialAccount[]>(
    `/social/${businessId}/accounts/`,
    token,
  );
}

export async function disconnectSocialAccount(
  businessId: number,
  accountId: number,
  token: string,
): Promise<{ detail: string }> {
  return authenticatedApiRequest<{ detail: string }>(
    `/social/${businessId}/accounts/${accountId}/`,
    token,
    { method: "DELETE" },
  );
}

export async function verifySocialAccount(
  businessId: number,
  accountId: number,
  token: string,
): Promise<SocialAccount> {
  return authenticatedApiRequest<SocialAccount>(
    `/social/${businessId}/accounts/${accountId}/verify/`,
    token,
    { method: "POST" },
  );
}

export interface InstagramReadiness {
  facebook_connected: boolean;
  facebook_page_count?: number;
  facebook_pages?: { id: string; name: string }[];
  facebook_page_name: string;
  facebook_page_id?: string;
  instagram_linked_to_page: boolean;
  instagram_username: string;
  instagram_connected_in_kova: boolean;
}

export async function getInstagramReadiness(
  businessId: number,
  token: string,
): Promise<InstagramReadiness> {
  return authenticatedApiRequest<InstagramReadiness>(
    `/social/${businessId}/meta/instagram-readiness/`,
    token,
  );
}

export async function getMetaOAuthURL(
  businessId: number,
  token: string,
  platform: "facebook" | "instagram",
  reconnect = false,
): Promise<{ url: string; scopes?: string[] }> {
  const params = new URLSearchParams({ platform });
  if (reconnect) {
    params.set("reconnect", "1");
  }
  return authenticatedApiRequest<{ url: string; scopes?: string[] }>(
    `/social/${businessId}/meta/oauth-url/?${params.toString()}`,
    token,
  );
}

export function metaOAuthRedirectUri() {
  return `${getPublicApiBaseUrl()}/social/meta/callback/`;
}

export interface PendingMetaPage {
  id: number;
  page_id: string;
  page_name: string;
  instagram_username: string;
  has_instagram: boolean;
}

export interface MetaConnectResult {
  accounts: Array<{
    id: number;
    platform: string;
    account_name: string;
    connection_status: string;
  }>;
  pending_pages: PendingMetaPage[];
}

export async function submitMetaOAuthCode(
  businessId: number,
  code: string,
  redirectUri: string,
  token: string,
  platform: "facebook" | "instagram" | "both" = "both",
): Promise<MetaConnectResult> {
  return authenticatedApiRequest(
    `/social/${businessId}/meta/callback/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ code, redirect_uri: redirectUri, platform }),
    },
  );
}

export async function getPendingMetaPages(
  token: string,
): Promise<PendingMetaPage[]> {
  return authenticatedApiRequest<PendingMetaPage[]>(
    "/social/pending-pages/",
    token,
  );
}

export async function assignPendingMetaPage(
  pendingId: number,
  token: string,
  payload: {
    business_id?: number;
    new_business_name?: string;
    connect_instagram?: boolean;
  },
): Promise<{
  business_id: number;
  business_name: string;
  accounts: MetaConnectResult["accounts"];
}> {
  return authenticatedApiRequest(
    `/social/pending-pages/${pendingId}/assign/`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getSocialActions(
  businessId: number,
  token: string,
): Promise<SocialActionRecord[]> {
  return authenticatedApiRequest<SocialActionRecord[]>(
    `/social/${businessId}/actions/`,
    token,
  );
}

/* ------------------------------------------------------------------ */
/* Operating mode (backed by BusinessPolicy)                           */
/* ------------------------------------------------------------------ */

export type OperatingMode = "assist" | "approval" | "autopilot";

export interface BusinessPolicy {
  id: number;
  business: number;
  social_operating_mode: OperatingMode;
  allow_content_creation: boolean;
  allow_auto_publish: boolean;
  allow_comment_replies: boolean;
  allow_dm_replies: boolean;
  allow_lead_creation: boolean;
  allow_product_management: boolean;
  allow_order_management: boolean;
  require_discount_approval: boolean;
  max_auto_discount_percent: string;
  require_refund_approval: boolean;
  require_payment_approval: boolean;
  /** Meta has no hard rule; defaults match common Page guidance (~1–2/day). */
  facebook_max_posts_per_day: number;
  facebook_max_posts_per_week: number;
  /** Common IG feed guidance (~3–5/week). Stories/Reels are separate. */
  instagram_max_posts_per_day: number;
  instagram_max_posts_per_week: number;
  min_hours_between_posts: number;
  automation_paused: boolean;
  automation_pause_reason: string;
  created_at: string;
  updated_at: string;
}

export async function getBusinessPolicy(
  businessId: number,
  token: string,
): Promise<BusinessPolicy> {
  return authenticatedApiRequest<BusinessPolicy>(
    `/business-brain/${businessId}/policy/`,
    token,
  );
}

export interface AutopilotShiftRecord {
  id: number;
  status: "running" | "finished" | "failed";
  started_at: string;
  finished_at: string | null;
}

export type AutopilotWorkState =
  | "done"
  | "scheduled"
  | "sent"
  | "filed"
  | "clear"
  | "failed";

export interface AutopilotWorkItem {
  id: string;
  title: string;
  detail: string;
  when: string;
  state: AutopilotWorkState;
  href: string;
}

export interface AutopilotWork {
  summary: {
    posts: string;
    replies: string;
    listings: string;
    report: string;
  };
  posts: AutopilotWorkItem[];
  replies: AutopilotWorkItem[];
  listings: AutopilotWorkItem[];
  report: AutopilotWorkItem[];
  stopped: string;
}

export interface AutopilotMetricPost {
  id: number;
  product: string;
  platform: string;
  status: string;
  likes: number;
  impressions: number;
  reach: number;
  comments: number;
  shares: number;
  clicks: number;
  when: string;
  highlight: boolean;
  band: "high" | "low";
}

export interface AutopilotProductResult {
  name: string;
  likes: number;
  impressions: number;
  reach: number;
  comments: number;
  shares: number;
  clicks: number;
  posts: number;
  highlight: boolean;
  band: "high" | "low";
}

export interface AutopilotPicture {
  likes: number;
  impressions: number;
  reach: number;
  comments: number;
  shares: number;
  clicks: number;
  published: number;
  scheduled: number;
  leads: number;
  orders: number;
  posts: AutopilotMetricPost[];
  products: AutopilotProductResult[];
}

export interface AutopilotDesk {
  active: boolean;
  shift: AutopilotShiftRecord | null;
  work: AutopilotWork;
  picture: AutopilotPicture;
}

export function getAutopilot(businessId: number, token: string) {
  return authenticatedApiRequest<AutopilotDesk>(
    `/social/${businessId}/autopilot/`,
    token,
  );
}

export function startAutopilotShift(
  businessId: number,
  token: string,
  force = false,
) {
  return authenticatedApiRequest<AutopilotDesk>(
    `/social/${businessId}/autopilot/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ force }),
    },
  );
}

export async function resumeScheduledPublishing(
  businessId: number,
  token: string,
): Promise<BusinessPolicy> {
  return authenticatedApiRequest<BusinessPolicy>(
    `/business-brain/${businessId}/policy/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({
        automation_paused: false,
        automation_pause_reason: "",
      }),
    },
  );
}

export async function updateOperatingMode(
  businessId: number,
  mode: OperatingMode,
  token: string,
): Promise<BusinessPolicy> {
  return authenticatedApiRequest<BusinessPolicy>(
    `/business-brain/${businessId}/policy/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ social_operating_mode: mode }),
    },
  );
}
