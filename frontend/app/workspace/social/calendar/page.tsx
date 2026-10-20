"use client";

import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { getBusiness, getContents, type Content } from "@/lib/commerce";
import {
  dispatchDuePosts,
  getSocialPosts,
  refreshPostMetrics,
  retrySocialPost,
  type SocialPostRecord,
} from "@/lib/operations";
import { authenticatedApiRequest } from "@/lib/api";

export default function CalendarPage() {
  const { accessToken, isAuthenticated } = useAuth();
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [posts, setPosts] = useState<SocialPostRecord[]>([]);
  const [drafts, setDrafts] = useState<Content[]>([]);
  const [contentId, setContentId] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState("");

  async function refresh(token: string, id: number) {
    await dispatchDuePosts(id, token).catch(() => null);
    const [queue, pieces] = await Promise.all([
      getSocialPosts(id, token),
      getContents(id, token),
    ]);
    setPosts(queue);
    setDrafts(pieces.filter((piece) => piece.status === "draft" || piece.status === "approved"));
  }

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    const token = accessToken;
    getBusiness(token)
      .then(async (business) => {
        setBusinessId(business.id);
        await refresh(token, business.id);
      })
      .catch(() => setError("Could not load the publishing queue."));
  }, [accessToken, isAuthenticated]);

  async function schedule(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || !businessId || !contentId || !when) return;
    setError("");
    try {
      await authenticatedApiRequest(
        `/content/${businessId}/${contentId}/publish/`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({ scheduled_at: new Date(when).toISOString() }),
        },
      );
      setWhen("");
      await refresh(accessToken, businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule that post.");
    }
  }

  async function retry(postId: number) {
    if (!accessToken || !businessId) return;
    setError("");
    try {
      await retrySocialPost(businessId, postId, accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The platform rejected the post again.");
    }
    await refresh(accessToken, businessId);
  }

  async function refreshMetrics(postId: number) {
    if (!accessToken || !businessId) return;
    setError("");
    try {
      await refreshPostMetrics(businessId, postId, accessToken);
      await refresh(accessToken, businessId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh results for that post.");
    }
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-kova-dark">Calendar</h1>
          <p className="mt-1.5 text-sm leading-6 text-gray-500">
            Schedule posts. Retry if a send fails.
          </p>
        </header>
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <form onSubmit={schedule} className="grid gap-3 rounded-lg border border-kova-border bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-500">Post</span>
            <select
              value={contentId}
              onChange={(event) => setContentId(event.target.value)}
              className="h-10 w-full rounded-md border border-kova-border px-3"
            >
              <option value="">Choose a draft</option>
              {drafts.map((piece) => (
                <option key={piece.id} value={piece.id}>
                  {piece.platform} · {piece.caption.slice(0, 48)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-500">Send at</span>
            <input
              type="datetime-local"
              value={when}
              onChange={(event) => setWhen(event.target.value)}
              className="h-10 w-full rounded-md border border-kova-border px-3"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md bg-kova-green px-4 text-sm font-bold text-white"
          >
            Schedule
          </button>
        </form>
        <div className="space-y-3">
          {posts.length === 0 && (
            <p className="border border-kova-border bg-white px-4 py-6 text-sm text-gray-500">
              Scheduled and published posts appear here.
            </p>
          )}
          {posts.map((post) => (
            <article key={post.id} className="border border-kova-border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    {post.platform} · {post.account_name || "Account"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-kova-dark">{post.caption}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-kova-dark">
                  {post.publishing_status}
                </span>
              </div>
              {post.publishing_error && (
                <p className="mt-2 text-xs text-red-600">{post.publishing_error}</p>
              )}
              {post.scheduled_at && (
                <p className="mt-2 text-xs text-gray-500">
                  Scheduled {new Date(post.scheduled_at).toLocaleString()}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                {post.publishing_status === "failed" && (
                  <button
                    type="button"
                    onClick={() => retry(post.id)}
                    className="inline-flex h-8 items-center rounded-md bg-kova-orange px-3 text-xs font-bold text-kova-dark"
                  >
                    Retry
                  </button>
                )}
                {post.publishing_status === "published" && (
                  <button
                    type="button"
                    onClick={() => refreshMetrics(post.id)}
                    className="inline-flex h-8 items-center rounded-md border border-kova-border px-3 text-xs font-bold text-kova-dark"
                  >
                    Refresh results
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
