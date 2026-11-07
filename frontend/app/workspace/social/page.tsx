"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api";
import { PlatformAvatar } from "@/components/social/platform-avatar";
import { ActivityColumns } from "@/components/ui/activity-columns";
import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import {
  getSocialPosts,
  peekSocialPosts,
  retrySocialPost,
  type SocialPostRecord,
} from "@/lib/operations";
import { useWorkspace } from "@/lib/workspace-context";
import {
  getBusinessPolicy,
  getSocialOverview,
  OPERATING_MODES,
  peekSocialOverview,
  resumeScheduledPublishing,
  type OperatingMode,
  type SocialOverview,
} from "@/lib/social";

function modeCopy(current: string) {
  return (
    OPERATING_MODES.find((item) => item.value === current) ??
    OPERATING_MODES[0]
  );
}

function knownMode(value: string | null | undefined): value is OperatingMode {
  return OPERATING_MODES.some((item) => item.value === value);
}

const STATUS_LABEL: Record<SocialPostRecord["publishing_status"], string> = {
  failed: "Failed",
  scheduled: "Scheduled",
  published: "Published",
  pending: "Pending",
  publishing: "Sending",
};

const POST_GROUPS: {
  status: SocialPostRecord["publishing_status"];
  label: string;
}[] = [
  { status: "failed", label: "Failed" },
  { status: "scheduled", label: "Scheduled" },
  { status: "published", label: "Published" },
];

function postPreview(caption: string) {
  const flat = caption.replace(/\s+/g, " ").trim();
  if (!flat) return "Untitled post";
  if (flat.length <= 72) return flat;
  return `${flat.slice(0, 72).trimEnd()}…`;
}

function postWhen(post: SocialPostRecord) {
  const raw = post.published_at || post.scheduled_at;
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SocialOverviewPage() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [overview, setOverview] = useState<SocialOverview | null>(null);
  const [posts, setPosts] = useState<SocialPostRecord[]>([]);
  const [mode, setMode] = useState<OperatingMode>("assist");
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [selected, setSelected] = useState<SocialPostRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (workspaceLoading) {
      return;
    }

    if (!businessId || !accessToken) {
      return;
    }

    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;
    const cachedOverview = peekSocialOverview(bizId);
    const cachedPosts = peekSocialPosts(bizId);
    if (cachedOverview) setOverview(cachedOverview);
    if (cachedPosts) setPosts(cachedPosts);

    void getSocialOverview(bizId, token)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err) => {
        if (cancelled || cachedOverview) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load social overview.",
        );
      });
    void getSocialPosts(bizId, token)
      .then((postList) => {
        if (!cancelled) setPosts(postList);
      })
      .catch(() => undefined);
    void getBusinessPolicy(bizId, token)
      .then((policy) => {
        if (!cancelled && knownMode(policy?.social_operating_mode)) {
          setMode(policy.social_operating_mode);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [workspaceLoading, businessId, accessToken]);

  async function retryPost(postId: number) {
    if (!businessId || !accessToken) return;
    setRetryingId(postId);
    setError("");
    try {
      const updated = await retrySocialPost(businessId, postId, accessToken);
      setPosts((current) =>
        current.map((item) => (item.id === postId ? updated : item)),
      );
      setSelected((current) => (current?.id === postId ? updated : current));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not send that post again.",
      );
    } finally {
      setRetryingId(null);
    }
  }

  const visibleOverview =
    overview ?? (businessId ? peekSocialOverview(businessId) ?? null : null);
  const visiblePosts =
    posts.length > 0
      ? posts
      : businessId
        ? peekSocialPosts(businessId) ?? []
        : [];

  const accounts = Array.isArray(visibleOverview?.channels?.accounts)
    ? visibleOverview.channels.accounts
    : [];
  const recentActions = Array.isArray(visibleOverview?.recent_actions)
    ? visibleOverview.recent_actions
    : [];
  const drafts = visibleOverview?.content?.drafts ?? 0;
  const hasChannels = (visibleOverview?.channels?.total ?? accounts.length) > 0;
  const recommendations = (visibleOverview?.command?.recommendations ?? []).filter(
    (item) => {
      if (
        !item ||
        typeof item.href !== "string" ||
        !item.href ||
        typeof item.title !== "string" ||
        !item.title
      ) {
        return false;
      }
      const title = item.title.toLowerCase();
      if (title.includes("reconnect")) return false;
      if (title.includes("did not go out") || title.includes("failed")) {
        return false;
      }
      return true;
    },
  );
  const currentMode = modeCopy(mode);

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="space-y-6">
        <p className="text-sm leading-6 text-gray-500">
          {currentMode.label}: {currentMode.detail}{" "}
          <Link href="/workspace/settings" className="font-semibold text-kova-green hover:underline">
            Change in Settings
          </Link>
        </p>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          {POST_GROUPS.map((group) => {
            const matching = visiblePosts.filter(
              (post) => post.publishing_status === group.status,
            );
            if (!matching.length) return null;
            return (
              <div key={group.status}>
                <h2 className="text-sm font-semibold text-kova-dark">
                  {group.label}{" "}
                  <span className="font-medium text-gray-400">{matching.length}</span>
                </h2>
                <ul className="mt-2 max-h-80 divide-y divide-kova-border overflow-y-auto rounded-lg border border-kova-border bg-white">
                  {matching.map((post) => {
                    const when = postWhen(post);
                    return (
                      <li key={post.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(post)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-kova-background"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-kova-dark">
                              {postPreview(post.caption || "")}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-gray-500">
                              {post.account_name || post.platform}
                              {when ? ` · ${when}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-gray-400">
                            View
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        {visibleOverview?.command?.automation_paused ? (
          <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <p>{visibleOverview.command.pause_reason || "Scheduled publishing is paused."}</p>
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-kova-green px-4 text-xs font-bold text-white sm:h-9 sm:w-auto"
              onClick={() => {
                if (!businessId || !accessToken) return;
                resumeScheduledPublishing(businessId, accessToken)
                  .then(() => getSocialOverview(businessId, accessToken))
                  .then(setOverview)
                  .catch((err) => {
                    setError(
                      err instanceof ApiError
                        ? err.message
                        : "Could not resume scheduled publishing.",
                    );
                  });
              }}
            >
              Resume
            </button>
          </div>
        ) : null}

        {recommendations.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-kova-dark">Next</h2>
            <ul className="mt-2 space-y-1.5">
              {recommendations.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="block rounded-md border border-kova-border/80 bg-white px-3 py-2 transition hover:border-kova-green/50"
                  >
                    <p className="text-sm font-semibold text-kova-dark">
                      {item.title}
                    </p>
                    {typeof item.detail === "string" && item.detail ? (
                      <p className="mt-0.5 text-xs leading-5 text-gray-500">
                        {item.detail}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {(visibleOverview?.pending_actions ?? 0) > 0 ? (
          <Link
            href="/workspace/social/studio"
            className="flex items-center justify-between gap-3 border border-kova-border bg-white px-4 py-3 text-sm"
          >
            <span className="font-semibold text-kova-dark">
              Waiting for your approval
            </span>
            <span className="font-semibold text-kova-dark">
              {visibleOverview?.pending_actions}
            </span>
          </Link>
        ) : null}

        {accounts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {accounts.map((acc) => (
              <span
                key={acc.id}
                className={`inline-flex max-w-[16rem] items-center gap-2 truncate border px-2 py-1 text-xs ${
                  acc.is_healthy
                    ? "border-kova-border bg-white text-kova-dark"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <PlatformAvatar
                  platform={acc.platform}
                  imageUrl={acc.profile_picture_url}
                  name={acc.account_name || acc.account_username}
                  size="sm"
                />
                <span className="truncate">
                  {acc.account_name || acc.account_username}
                </span>
                {acc.is_healthy ? null : (
                  <Link
                    href="/workspace/social/channels"
                    className="shrink-0 font-semibold underline"
                  >
                    Reconnect
                  </Link>
                )}
              </span>
            ))}
          </div>
        ) : null}

        <ActivityColumns items={recentActions} columns={3} />

        {selected ? (
          <PostDetailDialog
            post={selected}
            retrying={retryingId === selected.id}
            onClose={() => setSelected(null)}
            onRetry={() => void retryPost(selected.id)}
          />
        ) : null}

        {!hasChannels && drafts === 0 && recentActions.length === 0 ? (
          <section className="border border-kova-border bg-white px-5 py-6">
            <p className="font-semibold text-kova-dark">
              Connect Facebook or Instagram
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Then create and schedule posts from Create.
            </p>
            <Link
              href="/workspace/social/channels"
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark hover:bg-[#f0a46e] sm:h-10 sm:w-auto"
            >
              Connect
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function PostDetailDialog({
  post,
  retrying,
  onClose,
  onRetry,
}: {
  post: SocialPostRecord;
  retrying: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const when = postWhen(post);
  const failed = post.publishing_status === "failed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-kova-dark/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-detail-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg bg-white shadow-sm sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-kova-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {STATUS_LABEL[post.publishing_status] ?? "Post"}
            </p>
            <h2 id="post-detail-title" className="mt-1 truncate text-base font-semibold text-kova-dark">
              {post.account_name || post.platform}
            </h2>
            {when ? (
              <p className="mt-0.5 text-xs text-gray-500">{when}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-sm font-semibold text-gray-400"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-kova-dark">
            {post.caption?.trim() || "Untitled post"}
          </p>
          {post.publishing_error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              {post.publishing_error}
            </p>
          ) : null}
        </div>

        {failed ? (
          <div className="border-t border-kova-border px-5 py-4">
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-kova-green px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {retrying ? "Sending…" : "Send again"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
