"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProfessionalPost } from "@/lib/professional";

function stripDeckLabel(text: string): string {
  return text.replace(/^slide\s+\d+\s*[:.\-–—]\s*/i, "").trim();
}

interface PostCardProps {
  post: ProfessionalPost;
  operatingMode: "assist" | "approval";
  onSave: (body: string) => Promise<void>;
  onApprove: () => Promise<void>;
  onSchedule: (iso: string) => Promise<void>;
  onPublish: (body: string) => Promise<void>;
  onCopied: () => Promise<void>;
}

export function PostCard({
  post,
  operatingMode,
  onSave,
  onApprove,
  onSchedule,
  onPublish,
  onCopied,
}: PostCardProps) {
  const isCarouselOutline = post.format === "carousel_outline";
  const initialBody =
    isCarouselOutline && post.copy_text
      ? post.copy_text
      : post.body;
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"ok" | "error">("ok");
  const published = post.status === "published";
  const scheduled = post.status === "scheduled";

  async function copyText() {
    const text = post.copy_text || body;
    await navigator.clipboard.writeText(text);
    setMessageTone("ok");
    setMessage("Copied.");
    await onCopied();
  }

  async function run(action: string, fn: () => Promise<void>) {
    setBusy(action);
    setMessage("");
    try {
      await fn();
      if (action === "publish") {
        setMessageTone("ok");
        setMessage("Published on LinkedIn.");
      } else if (action === "save") {
        setMessageTone("ok");
        setMessage("Saved.");
      } else if (action === "schedule") {
        setMessageTone("ok");
        setMessage("Scheduled.");
      }
    } catch (err) {
      setMessageTone("error");
      setMessage(
        err instanceof Error && err.message
          ? err.message
          : "That did not go through. Try again.",
      );
    } finally {
      setBusy("");
    }
  }

  const defaultSchedule = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  };

  return (
    <article className="rounded-xl border border-kova-border bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-kova-muted">
        <span className="rounded-full bg-kova-cream px-2 py-0.5 font-medium text-kova-ink">
          {post.post_role}
        </span>
        <span>{post.format}</span>
        <span className="capitalize">{published ? "Published" : post.status}</span>
        {published && post.published_at && (
          <span>Published {new Date(post.published_at).toLocaleString()}</span>
        )}
        {!published && post.scheduled_at && (
          <span>Scheduled {new Date(post.scheduled_at).toLocaleString()}</span>
        )}
      </div>
      {post.title && (
        <h3 className="mt-2 font-semibold text-kova-ink">{post.title}</h3>
      )}
      {post.media_urls?.length > 0 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {post.media_urls.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className="h-20 w-20 shrink-0 rounded-md border border-kova-border object-cover"
            />
          ))}
        </div>
      )}
      <textarea
        className="mt-3 min-h-[140px] w-full rounded-lg border border-kova-border p-3 text-sm"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {!isCarouselOutline && post.carousel_slides?.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-kova-border pt-3">
          {post.carousel_slides.map((slide, index) => (
            <p
              key={index}
              className="border-l-2 border-kova-green/40 pl-3 text-sm text-kova-muted"
            >
              {stripDeckLabel(slide)}
            </p>
          ))}
        </div>
      )}
      {message && (
        <p
          className={`mt-2 text-sm ${
            messageTone === "error" ? "text-red-600" : "text-kova-green"
          }`}
        >
          {message}
        </p>
      )}
      {post.publish_error && (
        <p className="mt-2 text-sm text-red-600">{post.publish_error}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!!busy}
          onClick={() => run("save", () => onSave(body))}
        >
          Save
        </Button>
        {operatingMode === "approval" && post.status === "draft" && (
          <Button
            type="button"
            disabled={!!busy}
            onClick={() => run("approve", onApprove)}
          >
            Approve
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={!!busy || published}
          onClick={() => run("schedule", () => onSchedule(defaultSchedule()))}
        >
          {scheduled && !published
            ? "Scheduled"
            : busy === "schedule"
              ? "Scheduling…"
              : "Schedule"}
        </Button>
        <Button
          type="button"
          disabled={!!busy || published}
          onClick={() => run("publish", () => onPublish(body))}
        >
          {published
            ? "Published"
            : busy === "publish"
              ? "Publishing…"
              : "Publish"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!!busy}
          onClick={() => run("copy", copyText)}
        >
          Copy
        </Button>
      </div>
    </article>
  );
}
