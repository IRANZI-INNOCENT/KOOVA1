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
import { useAuth } from "@/lib/auth-context";
import {
  answerEventMoment,
  approvePost,
  getProfessionalProfile,
  markPostCopied,
  publishPost,
  schedulePost,
  startEventMoment,
  updateProfessionalPost,
  type ProfessionalPost,
  type ProfessionalProfile,
} from "@/lib/professional";

export default function EventMomentPage() {
  const { accessToken } = useAuth();
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("conference");
  const [imageHint, setImageHint] = useState("");
  const [photos, setPhotos] = useState<EventPhotoItem[]>([]);
  const [programId, setProgramId] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [arcLength, setArcLength] = useState(3);
  const [posts, setPosts] = useState<ProfessionalPost[]>([]);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function startEvent() {
    if (!accessToken) return;
    setLoading("start");
    setError("");
    const form = new FormData();
    form.append("event_type", eventType);
    form.append("event_title", eventTitle);
    form.append("image_hint", imageHint);
    for (const photo of photos) {
      form.append("images", photo.file);
    }
    try {
      const result = await startEventMoment(accessToken, form);
      setProgramId(result.id);
      setQuestion(result.question);
    } catch {
      setError("Could not start event moment.");
    } finally {
      setLoading("");
    }
  }

  async function submitAnswer() {
    if (!accessToken || !programId || !answer.trim()) return;
    setLoading("answer");
    setError("");
    try {
      const result = await answerEventMoment(accessToken, programId, {
        answer: answer.trim(),
        arc_length: arcLength,
      });
      setPosts(result.posts);
      setProfile(await getProfessionalProfile(accessToken));
    } catch {
      setError("Could not build your post arc.");
    } finally {
      setLoading("");
    }
  }

  function refreshPost(updated: ProfessionalPost) {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  }

  const mode = profile?.operating_mode ?? "approval";

  return (
    <WorkspacePageFrame embedded requireBusiness={false}>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Event moment</h1>
          <p className="mt-1 text-sm text-kova-muted">
            Share a conference, workshop, or milestone with one guided question.
          </p>
        </div>

        {!programId && (
          <div className="space-y-3 rounded-xl border border-kova-border bg-white p-4">
            <select
              className="w-full rounded-lg border border-kova-border p-2 text-sm"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              <option value="conference">Conference</option>
              <option value="workshop">Workshop / training</option>
              <option value="graduation">Graduation / certification</option>
              <option value="networking">Networking event</option>
            </select>
            <Input
              label="Event name (optional)"
              placeholder="Event name"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
            />
            <Input
              label="Photo context (optional)"
              placeholder="What the photo shows"
              value={imageHint}
              onChange={(e) => setImageHint(e.target.value)}
            />
            <EventPhotoPicker
              photos={photos}
              onChange={setPhotos}
              disabled={loading === "start"}
            />
            <Button
              type="button"
              disabled={loading === "start"}
              onClick={startEvent}
            >
              {loading === "start" ? "Starting…" : "Continue"}
            </Button>
          </div>
        )}

        {programId && !posts.length && (
          <div className="space-y-3 rounded-xl border border-kova-border bg-kova-cream/40 p-4">
            <p className="font-medium text-kova-ink">{question}</p>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-kova-border p-3 text-sm"
              placeholder="Your answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <label className="text-sm">
              Posts in arc:{" "}
              <select
                value={arcLength}
                onChange={(e) => setArcLength(Number(e.target.value))}
                className="ml-2 rounded border border-kova-border p-1"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <Button
              type="button"
              disabled={loading === "answer"}
              onClick={submitAnswer}
            >
              {loading === "answer" ? "Creating…" : "Create post arc"}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              operatingMode={mode}
              onSave={async (body) => {
                if (!accessToken) return;
                refreshPost(
                  await updateProfessionalPost(accessToken, post.id, { body }),
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
                const result = await publishPost(accessToken, post.id, text);
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
      </div>
    </WorkspacePageFrame>
  );
}
