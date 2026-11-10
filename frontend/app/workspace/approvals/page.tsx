"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { AppShell } from "@/components/workspace/app-shell";
import { ApiError } from "@/lib/api";
import { approveContent, publishContentToChannels } from "@/lib/commerce";
import {
  dispatchDuePosts,
  replyToMessage,
  retrySocialPost,
  updateOrder,
} from "@/lib/operations";
import {
  decideSocialAction,
  getWorkspaceQueue,
  invalidateWorkspaceQueue,
  type WorkspaceQueue,
} from "@/lib/workspace-queue";
import { useWorkspace } from "@/lib/workspace-context";

function preview(text: string, max = 120) {
  const flat = (text || "").replace(/\s+/g, " ").trim();
  if (!flat) return "—";
  return flat.length <= max ? flat : `${flat.slice(0, max).trimEnd()}…`;
}

export default function ApprovalsPage() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [queue, setQueue] = useState<WorkspaceQueue | null>(null);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId || !accessToken) return;
    try {
      setError("");
      setQueue(await getWorkspaceQueue(businessId, accessToken));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your queue.");
    }
  }, [accessToken, businessId]);

  useEffect(() => {
    if (workspaceLoading) return;
    void load();
  }, [load, workspaceLoading]);

  async function act(key: string, fn: () => Promise<unknown>) {
    if (!businessId) return;
    setBusyKey(key);
    setError("");
    try {
      await fn();
      invalidateWorkspaceQueue(businessId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action did not complete.");
    } finally {
      setBusyKey(null);
    }
  }

  const total = queue?.counts.total ?? 0;

  return (
    <AppShell>
      <div className={WORKSPACE_PAGE}>
        <PageHeader
          title="For you"
          description="Approve posts, answer customers, and move orders forward — one place, real data."
          actions={
            total > 0 ? (
              <Badge tone="warning">{total} waiting</Badge>
            ) : (
              <Badge tone="success">Clear</Badge>
            )
          }
        />

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {!queue && !error ? (
          <p className="mt-8 text-sm text-kova-muted" aria-busy="true">
            Loading…
          </p>
        ) : null}

        {queue && total === 0 ? (
          <div className="mt-8 rounded-lg border border-kova-border bg-kova-white px-5 py-8 text-center">
            <p className="font-semibold text-kova-dark">You are caught up</p>
            <p className="mt-2 text-sm text-kova-muted">
              New store enquiries, drafts, and inbox messages will show up here.
            </p>
            <Link
              href="/workspace"
              className="mt-4 inline-flex text-sm font-semibold text-kova-green hover:underline"
            >
              Back to Overview
            </Link>
          </div>
        ) : null}

        {queue ? (
          <div className="mt-8 space-y-8">
            <QueueSection
              title="Inbox"
              count={queue.counts.messages_review}
              empty="No messages need a reply."
            >
              {queue.messages_review.map((message) => (
                <QueueRow
                  key={message.id}
                  title={message.customer_name || "Customer"}
                  body={preview(message.body)}
                  meta={message.needs_review ? "Needs review" : message.intent}
                  actions={
                    <>
                      {message.draft_reply ? (
                        <button
                          type="button"
                          disabled={busyKey !== null || !accessToken}
                          onClick={() =>
                            void act(`reply-${message.id}`, () =>
                              replyToMessage(
                                businessId!,
                                message.id,
                                accessToken!,
                                message.draft_reply,
                              ),
                            )
                          }
                          className="rounded-md bg-kova-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {busyKey === `reply-${message.id}` ? "Sending…" : "Send draft"}
                        </button>
                      ) : null}
                      <Link
                        href="/workspace/inbox"
                        className="rounded-md border border-kova-border px-3 py-1.5 text-xs font-semibold text-kova-dark"
                      >
                        Open inbox
                      </Link>
                    </>
                  }
                  extra={
                    message.draft_reply ? (
                      <p className="text-xs text-kova-muted">
                        Draft: {preview(message.draft_reply, 200)}
                      </p>
                    ) : null
                  }
                />
              ))}
            </QueueSection>

            <QueueSection
              title="Posts to approve"
              count={queue.counts.draft_posts}
              empty="No draft posts."
            >
              {queue.draft_posts.map((post) => (
                <QueueRow
                  key={post.id}
                  title={post.platform}
                  body={preview(post.caption)}
                  meta={post.created_by_ai ? "KCOVA draft" : "Draft"}
                  actions={
                    <button
                      type="button"
                      disabled={busyKey !== null || !accessToken}
                      onClick={() =>
                        void act(`approve-${post.id}`, () =>
                          approveContent(businessId!, post.id, accessToken!),
                        )
                      }
                      className="rounded-md bg-kova-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {busyKey === `approve-${post.id}` ? "Saving…" : "Approve"}
                    </button>
                  }
                />
              ))}
            </QueueSection>

            <QueueSection
              title="Ready to publish"
              count={queue.counts.ready_to_publish}
              empty="No approved posts waiting."
            >
              {queue.ready_to_publish.map((post) => (
                <QueueRow
                  key={post.id}
                  title={post.platform}
                  body={preview(post.caption)}
                  actions={
                    <>
                      <button
                        type="button"
                        disabled={busyKey !== null || !accessToken}
                        onClick={() =>
                          void act(`publish-${post.id}`, async () => {
                            await publishContentToChannels(
                              businessId!,
                              post.id,
                              accessToken!,
                            );
                            await dispatchDuePosts(businessId!, accessToken!);
                          })
                        }
                        className="rounded-md bg-kova-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busyKey === `publish-${post.id}` ? "Publishing…" : "Publish now"}
                      </button>
                      <Link
                        href="/workspace/social/studio"
                        className="rounded-md border border-kova-border px-3 py-1.5 text-xs font-semibold text-kova-dark"
                      >
                        Studio
                      </Link>
                    </>
                  }
                />
              ))}
            </QueueSection>

            <QueueSection
              title="Open orders"
              count={queue.counts.open_orders}
              empty="No open orders."
            >
              {queue.open_orders.map((order) => (
                <QueueRow
                  key={order.id}
                  title={order.customer_name || `Order #${order.id}`}
                  body={order.product_name || "Store enquiry"}
                  meta={order.status.replace(/_/g, " ")}
                  actions={
                    order.status === "new" ? (
                      <button
                        type="button"
                        disabled={busyKey !== null || !accessToken}
                        onClick={() =>
                          void act(`order-${order.id}`, () =>
                            updateOrder(businessId!, order.id, accessToken!, {
                              status: "confirmed",
                            }),
                          )
                        }
                        className="rounded-md bg-kova-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    ) : (
                      <Link
                        href="/workspace/commerce/orders"
                        className="rounded-md border border-kova-border px-3 py-1.5 text-xs font-semibold text-kova-dark"
                      >
                        Manage
                      </Link>
                    )
                  }
                />
              ))}
            </QueueSection>

            <QueueSection
              title="Failed posts"
              count={queue.counts.failed_posts}
              empty="No failed posts."
            >
              {queue.failed_posts.map((post) => (
                <QueueRow
                  key={post.id}
                  title={post.platform || "Post"}
                  body={preview(post.caption)}
                  meta={preview(post.error, 80)}
                  actions={
                    <button
                      type="button"
                      disabled={busyKey !== null || !accessToken}
                      onClick={() =>
                        void act(`retry-${post.id}`, () =>
                          retrySocialPost(businessId!, post.id, accessToken!),
                        )
                      }
                      className="rounded-md bg-kova-orange px-3 py-1.5 text-xs font-semibold text-kova-dark disabled:opacity-50"
                    >
                      Retry
                    </button>
                  }
                />
              ))}
            </QueueSection>

            <QueueSection
              title="KCOVA actions"
              count={queue.counts.pending_actions}
              empty="No pending automations."
            >
              {queue.pending_actions.map((action) => (
                <QueueRow
                  key={action.id}
                  title={action.action_type.replace(/_/g, " ")}
                  body={preview(action.intent)}
                  actions={
                    <>
                      <button
                        type="button"
                        disabled={busyKey !== null || !accessToken}
                        onClick={() =>
                          void act(`go-${action.id}`, () =>
                            decideSocialAction(
                              businessId!,
                              action.id,
                              accessToken!,
                              "approve",
                            ),
                          )
                        }
                        className="rounded-md bg-kova-green px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyKey !== null || !accessToken}
                        onClick={() =>
                          void act(`no-${action.id}`, () =>
                            decideSocialAction(
                              businessId!,
                              action.id,
                              accessToken!,
                              "reject",
                            ),
                          )
                        }
                        className="rounded-md border border-kova-border px-3 py-1.5 text-xs font-semibold text-kova-dark disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  }
                />
              ))}
            </QueueSection>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function QueueSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-kova-dark">{title}</h2>
        <Badge tone="warning">{count}</Badge>
      </div>
      <div className="mt-3 divide-y divide-kova-border rounded-lg border border-kova-border bg-kova-white">
        {count === 0 ? (
          <p className="px-4 py-3 text-sm text-kova-muted">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function QueueRow({
  title,
  body,
  meta,
  actions,
  extra,
}: {
  title: string;
  body: string;
  meta?: string;
  actions: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-kova-dark">{title}</p>
          <p className="mt-0.5 text-sm text-kova-muted">{body}</p>
          {meta ? (
            <p className="mt-1 text-xs capitalize text-kova-muted">{meta}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>
      </div>
      {extra ? <div className="mt-3 border-t border-kova-border/60 pt-3">{extra}</div> : null}
    </div>
  );
}
