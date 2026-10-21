import { apiRequest, authenticatedApiRequest } from "./api";

export interface SocialPostRecord {
  id: number;
  content: number;
  caption: string;
  platform: string;
  account_name: string;
  social_account: number;
  external_post_id: string;
  publishing_status: "pending" | "scheduled" | "publishing" | "published" | "failed";
  scheduled_at: string | null;
  published_at: string | null;
  publishing_error: string;
  publishing_attempts: number;
  reach: number;
  impressions: number;
  likes: number;
  comments_count: number;
  shares: number;
  clicks: number;
}

export interface SocialMessageRecord {
  id: number;
  channel: string;
  kind: "message" | "comment";
  direction: "in" | "out";
  customer_name: string;
  body: string;
  draft_reply: string;
  intent: "question" | "buying" | "complaint" | "compliment" | "spam" | "other";
  needs_review?: boolean;
  lead: number | null;
  reply_error: string;
  reply_target_id: string;
  delivery_status: "received" | "sent" | "saved" | "failed";
  in_reply_to: number | null;
  created_at: string;
}

export interface ActivitySnapshot {
  content: { drafts: number; approved: number; published: number };
  posts: {
    published: number;
    scheduled: number;
    failed: number;
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
  };
  leads: { total: number; new: number; by_source: Record<string, number> };
  orders: {
    total: number;
    new: number;
    packing?: number;
    out_for_delivery?: number;
    delivered?: number;
    fulfilled: number;
  };
  messages: { inbound: number; buying: number; complaints?: number; needs_review?: number };
  converted_leads?: number;
  evidence?: string[];
  observations?: string[];
  plan?: string;
}

export type OrderStatus =
  | "new"
  | "confirmed"
  | "packing"
  | "out_for_delivery"
  | "delivered"
  | "fulfilled"
  | "cancelled";

export interface OrderRecord {
  id: number;
  product: number | null;
  product_name: string;
  customer_name: string;
  phone: string;
  note: string;
  customer_address?: string;
  delivery_note?: string;
  rider_name?: string;
  review_ask_draft?: string;
  quantity: number;
  status: OrderStatus;
  source: string;
  stock_adjusted?: boolean;
  created_at: string;
}

export function getSocialPosts(businessId: number, token: string) {
  return authenticatedApiRequest<SocialPostRecord[]>(
    `/social/${businessId}/posts/`,
    token,
  );
}

export function dispatchDuePosts(businessId: number, token: string) {
  return authenticatedApiRequest<{ attempted: number }>(
    `/social/${businessId}/posts/dispatch/`,
    token,
    { method: "POST" },
  );
}

export function retrySocialPost(businessId: number, postId: number, token: string) {
  return authenticatedApiRequest<SocialPostRecord>(
    `/social/${businessId}/posts/${postId}/retry/`,
    token,
    { method: "POST" },
  );
}

export function refreshPostMetrics(businessId: number, postId: number, token: string) {
  return authenticatedApiRequest<SocialPostRecord>(
    `/social/${businessId}/posts/${postId}/metrics/`,
    token,
    { method: "POST" },
  );
}

export function getActivity(businessId: number, token: string) {
  return authenticatedApiRequest<ActivitySnapshot>(
    `/social/${businessId}/performance/`,
    token,
  );
}

export function getMessages(businessId: number, token: string) {
  return authenticatedApiRequest<SocialMessageRecord[]>(
    `/social/${businessId}/messages/`,
    token,
  );
}

export function logMessage(
  businessId: number,
  token: string,
  body: { body: string; channel: string; customer_name?: string; kind?: "message" | "comment" },
) {
  return authenticatedApiRequest<SocialMessageRecord>(
    `/social/${businessId}/messages/`,
    token,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function draftReply(businessId: number, messageId: number, token: string) {
  return authenticatedApiRequest<SocialMessageRecord>(
    `/social/${businessId}/messages/${messageId}/draft/`,
    token,
    { method: "POST" },
  );
}

export function replyToMessage(
  businessId: number,
  messageId: number,
  token: string,
  body: string,
) {
  return authenticatedApiRequest<SocialMessageRecord>(
    `/social/${businessId}/messages/${messageId}/reply/`,
    token,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}

export function getOrders(businessId: number, token: string) {
  return authenticatedApiRequest<OrderRecord[]>(
    `/commerce/${businessId}/orders/`,
    token,
  );
}

export function updateOrder(
  businessId: number,
  orderId: number,
  token: string,
  body: {
    status?: OrderStatus;
    note?: string;
    delivery_note?: string;
    rider_name?: string;
    customer_address?: string;
  },
) {
  return authenticatedApiRequest<OrderRecord>(
    `/commerce/${businessId}/orders/${orderId}/`,
    token,
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

export function placeStoreOrder(
  slug: string,
  productSlug: string,
  customerName = "",
) {
  return apiRequest<{ id: number; status: string }>(
    `/commerce/public/${slug}/orders/`,
    {
      method: "POST",
      body: JSON.stringify({
        product_slug: productSlug,
        customer_name: customerName,
      }),
    },
  );
}
