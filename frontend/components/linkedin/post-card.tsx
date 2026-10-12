"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ProfessionalPost } from "@/lib/professional";

interface PostCardProps {
  post: ProfessionalPost;
  operatingMode: "assist" | "approval";
  onSave: (body: string) => Promise<void>;
  onApprove: () => Promise<void>;
  onSchedule: (iso: string) => Promise<void>;
  onPublish: () => Promise<void>;
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
  const [body, setBody] = useState(post.body);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");

  async function copyText() {
    const text = post.copy_text || body;
    await navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard.");
    await onCopied();
  }

  async function run(action: string, fn: () => Promise<void>) {
    setBusy(action);
    setMessage("");
    try {
      await fn();
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
        <span className="capitalize">{post.status}</span>
        {post.scheduled_at && (
          <span>Scheduled {new Date(post.scheduled_at).toLocaleString()}</span>
        )}
      </div>
      {post.title && (
        <h3 className="mt-2 font-semibold text-kova-ink">{post.title}</h3>
      )}
      <textarea
        className="mt-3 min-h-[140px] w-full rounded-lg border border-kova-border p-3 text-sm"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {post.carousel_slides?.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-kova-muted">
          {post.carousel_slides.map((slide, index) => (
            <li key={index}>{slide}</li>
          ))}
        </ul>
      )}
      {message && <p className="mt-2 text-sm text-kova-green">{message}</p>}
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
          disabled={!!busy}
          onClick={() => run("schedule", () => onSchedule(defaultSchedule()))}
        >
          Schedule
        </Button>
        <Button
          type="button"
          disabled={!!busy}
          onClick={() => run("publish", onPublish)}
        >
          Publish
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
