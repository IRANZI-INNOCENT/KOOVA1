import { authenticatedApiRequest } from "@/lib/api";
import { cachedResource, invalidateResourceCache } from "@/lib/resource-cache";

const TTL_MS = 45_000;

export interface WorkspaceQueue {
  counts: {
    draft_posts: number;
    ready_to_publish: number;
    messages_review: number;
    failed_posts: number;
    open_orders: number;
    pending_actions: number;
    total: number;
  };
  draft_posts: Array<{
    id: number;
    platform: string;
    caption: string;
    updated_at: string;
    created_by_ai: boolean;
  }>;
  ready_to_publish: Array<{
    id: number;
    platform: string;
    caption: string;
    updated_at: string;
  }>;
  messages_review: Array<{
    id: number;
    customer_name: string;
    body: string;
    draft_reply: string;
    needs_review: boolean;
    channel: string;
    intent: string;
    created_at: string;
  }>;
  failed_posts: Array<{
    id: number;
    content_id: number;
    caption: string;
    error: string;
    platform: string;
  }>;
  open_orders: Array<{
    id: number;
    customer_name: string;
    status: string;
    product_name: string;
    created_at: string;
  }>;
  pending_actions: Array<{
    id: number;
    action_type: string;
    intent: string;
    target_type: string;
    target_id: string;
    requires_approval: boolean;
    created_at: string;
  }>;
}

export function invalidateWorkspaceQueue(businessId: number): void {
  invalidateResourceCache(`workspace-queue:${businessId}`);
}

export function getWorkspaceQueue(
  businessId: number,
  token: string,
): Promise<WorkspaceQueue> {
  return cachedResource(
    `workspace-queue:${businessId}`,
    TTL_MS,
    () =>
      authenticatedApiRequest<WorkspaceQueue>(
        `/social/${businessId}/queue/`,
        token,
      ),
  );
}

export function decideSocialAction(
  businessId: number,
  actionId: number,
  token: string,
  decision: "approve" | "reject",
) {
  invalidateWorkspaceQueue(businessId);
  return authenticatedApiRequest(
    `/social/${businessId}/actions/${actionId}/decision/`,
    token,
    { method: "POST", body: JSON.stringify({ decision }) },
  );
}
