/**
 * Social API helpers.
 *
 * These functions talk to /api/social/<business_id>/...
 */

import { authenticatedApiRequest } from "./api";

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
  created_at: string;
  updated_at: string;
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

export async function getMetaOAuthURL(
  businessId: number,
  token: string,
  platform: "facebook" | "instagram",
): Promise<{ url: string }> {
  return authenticatedApiRequest<{ url: string }>(
    `/social/${businessId}/meta/oauth-url/?platform=${platform}`,
    token,
  );
}

export function metaOAuthRedirectUri() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  return `${apiUrl.replace(/\/$/, "")}/social/meta/callback/`;
}

export async function submitMetaOAuthCode(
  businessId: number,
  code: string,
  redirectUri: string,
  token: string,
  platform: "facebook" | "instagram" | "both" = "both",
): Promise<{ accounts: Array<{ id: number; platform: string; account_name: string; connection_status: string }> }> {
  return authenticatedApiRequest(
    `/social/${businessId}/meta/callback/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ code, redirect_uri: redirectUri, platform }),
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

export async function updateOperatingMode(
  businessId: number,
  mode: OperatingMode,
  token: string,
): Promise<BusinessPolicy> {
  const body: Record<string, unknown> = { social_operating_mode: mode };
  if (mode === "autopilot") {
    body.allow_auto_publish = true;
    body.allow_comment_replies = true;
  }
  return authenticatedApiRequest<BusinessPolicy>(
    `/business-brain/${businessId}/policy/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    },
  );
}
