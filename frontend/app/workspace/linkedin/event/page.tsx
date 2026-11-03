"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EventPhotoPicker,
  type EventPhotoItem,
} from "@/components/linkedin/event-photo-picker";
import { PostCard } from "@/components/linkedin/post-card";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  approvePost,
  getProfessionalProfile,
  markPostCopied,
  publishPost,
  schedulePost,
  shareEventMoment,
  updateProfessionalPost,
  type ProfessionalPost,
  type ProfessionalProfile,
} from "@/lib/professional";

const OCCASIONS = [
  { id: "event", label: "Event" },
  { id: "conference", label: "Conference" },
  { id: "training", label: "Training" },
  { id: "course", label: "Course" },
] as const;

export default function EventMomentPage() {
  const { accessToken } = useAuth();
  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number]["id"]>(
    "conference",
  );
  const [eventTitle, setEventTitle] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<EventPhotoItem[]>([]);
  const [posts, setPosts] = useState<ProfessionalPost[]>([]);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setPosts([]);
    setNote("");
    setEventTitle("");
    setPhotos((current) => {
      for (const photo of current) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return [];
    });
    setError("");
  }

  async function writePost() {
    if (!accessToken) return;
    if (!photos.length && !note.trim() && !eventTitle.trim()) {
      setError("Add a photo or a line about what you want to share.");
      return;
    }
    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("event_type", occasion);
    form.append("event_title", eventTitle.trim());
    form.append("note", note.trim());
    for (const photo of photos) {
      form.append("images", photo.file);
    }
    try {
      const result = await shareEventMoment(accessToken, form);
      setPosts(result.posts);
      setProfile(await getProfessionalProfile(accessToken));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "KCOVA could not write that post. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function refreshPost(updated: ProfessionalPost) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  const mode = profile?.operating_mode ?? "approval";
  const ready = posts.length > 0;

  return (
    <WorkspacePageFrame embedded requireBusiness={false}>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold text-kova-ink">
            Share a moment
          </h1>
          <p className="mt-1 text-sm text-kova-muted">
            A conference, training, course, or event. Add a selfie or a photo.
            KCOVA writes the post.
          </p>
        </div>

        {!ready && (
          <div className="space-y-4 rounded-xl border border-kova-border bg-white p-4">
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((item) => {
                const selected = occasion === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={loading}
                    onClick={() => setOccasion(item.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      selected
                        ? "border-kova-green bg-kova-green text-white"
                        : "border-kova-border bg-white text-kova-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <Input
              label="Name"
              placeholder="Optional — AI Summit, the course title…"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
            <EventPhotoPicker
              photos={photos}
              onChange={setPhotos}
              disabled={loading}
            />
            <label className="block text-sm font-medium text-kova-ink">
              Anything KCOVA should mention?
              <textarea
                className="mt-1 min-h-[88px] w-full rounded-lg border border-kova-border p-3 text-sm font-normal"
                placeholder="Optional. One honest line is enough."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading}
              />
            </label>
            <Button
              type="button"
              disabled={loading}
              data-coach="li-post"
              data-coach-priority="page"
              onClick={writePost}
            >
              {loading ? "KCOVA is writing…" : "Write my post"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {ready && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-kova-muted">
                Your post is ready. Publish it, or change the words first.
              </p>
              <Button type="button" variant="outline" onClick={reset}>
                Share another
              </Button>
            </div>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                operatingMode={mode}
                onSave={async (body) => {
                  if (!accessToken) return;
                  refreshPost(
                    await updateProfessionalPost(accessToken, post.id, {
                      body,
                    }),
                  );
                }}
                onApprove={async () => {
                  if (!accessToken) return;
                  refreshPost(await approvePost(accessToken, post.id));
                }}
                onSchedule={async (iso) => {
                  if (!accessToken) return;
                  refreshPost(await schedulePost(accessToken, post.id, iso));
                }}
                onPublish={async (text) => {
                  if (!accessToken) return;
                  if (post.format !== "carousel_outline") {
                    await updateProfessionalPost(accessToken, post.id, {
                      body: text,
                    });
                  }
                  const result = await publishPost(
                    accessToken,
                    post.id,
                    text,
                  );
                  if (result.post) refreshPost(result.post);
                  if (!result.published) {
                    throw new Error(
                      result.detail || "LinkedIn did not publish this post.",
                    );
                  }
                }}
                onCopied={async () => {
                  if (!accessToken) return;
                  refreshPost(await markPostCopied(accessToken, post.id));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </WorkspacePageFrame>
  );
}
