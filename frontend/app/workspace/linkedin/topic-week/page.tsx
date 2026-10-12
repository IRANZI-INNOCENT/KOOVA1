"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { LinkedInBrainCard } from "@/components/linkedin/linkedin-brain-card";
import { TopicWeekAutopilotPanel } from "@/components/linkedin/topic-week-autopilot-panel";
import { TopicWeekPlanView } from "@/components/linkedin/topic-week-plan";
import { PostCard } from "@/components/linkedin/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { useAuth } from "@/lib/auth-context";
import {
  approvePost,
  generateProgramDrafts,
  getCurrentTopicWeek,
  getProfessionalProfile,
  markPostCopied,
  publishPost,
  runTopicAutopilot,
  schedulePost,
  startTopicWeek,
  updateProfessionalPost,
  updateProfessionalProfile,
  type ProfessionalPost,
  type ProfessionalProfile,
} from "@/lib/professional";
import { parseTopicWeekPlan } from "@/lib/topic-week-types";

type Step = "topic" | "plan" | "drafts";

const STEPS: { id: Step; label: string }[] = [
  { id: "topic", label: "Topic" },
  { id: "plan", label: "Plan" },
  { id: "drafts", label: "Drafts" },
];

export default function TopicWeekPage() {
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [stance, setStance] = useState("");
  const [programId, setProgramId] = useState<number | null>(null);
  const [primaryPillar, setPrimaryPillar] = useState<string | null>(null);
  const [planRaw, setPlanRaw] = useState<Record<string, unknown> | null>(null);
  const [posts, setPosts] = useState<ProfessionalPost[]>([]);
  const [step, setStep] = useState<Step>("topic");
  const [loading, setLoading] = useState("");
  const [bootLoading, setBootLoading] = useState(true);
  const [error, setError] = useState("");
  const [autopilotSaving, setAutopilotSaving] = useState(false);
  const [autopilotRunning, setAutopilotRunning] = useState(false);

  const plan = useMemo(
    () => (planRaw ? parseTopicWeekPlan(planRaw) : null),
    [planRaw],
  );

  const hydrateFromServer = useCallback(
    async (token: string) => {
      const [prof, current] = await Promise.all([
        getProfessionalProfile(token),
        getCurrentTopicWeek(token),
      ]);
      setProfile(prof);
      if (current.program) {
        setProgramId(current.program.id);
        setPlanRaw(current.program.plan);
        const input = current.program.input_data ?? {};
        setTopic(String(input.topic ?? ""));
        setAudience(String(input.audience ?? ""));
        setStance(String(input.stance ?? ""));
        const pillar =
          (input.primary_pillar as string) ||
          ((input.brain as { matched_pillar?: string })?.matched_pillar ?? null);
        setPrimaryPillar(pillar);
        if (current.posts.length) {
          setPosts(current.posts);
          setStep("drafts");
        } else if (current.program.plan) {
          setStep("plan");
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!accessToken) return;
    hydrateFromServer(accessToken).finally(() => setBootLoading(false));
  }, [accessToken, hydrateFromServer]);

  async function createPlan() {
    if (!accessToken || !topic.trim()) return;
    setLoading("plan");
    setError("");
    try {
      const result = await startTopicWeek(accessToken, {
        topic: topic.trim(),
        audience: audience.trim(),
        stance: stance.trim(),
      });
      setProgramId(result.program.id);
      setPlanRaw(result.program.plan);
      const input = result.program.input_data ?? {};
      setPrimaryPillar(
        (input.primary_pillar as string) ||
          ((input.brain as { matched_pillar?: string })?.matched_pillar ?? null),
      );
      setStep("plan");
    } catch {
      setError("Could not create the week plan. Check OpenRouter configuration.");
    } finally {
      setLoading("");
    }
  }

  async function createDrafts(schedule: boolean) {
    if (!accessToken || !programId) return;
    setLoading(schedule ? "schedule" : "drafts");
    setError("");
    try {
      const drafts = await generateProgramDrafts(
        accessToken,
        programId,
        schedule,
      );
      setPosts(drafts);
      setStep("drafts");
    } catch {
      setError("Could not generate drafts.");
    } finally {
      setLoading("");
    }
  }

  async function runFullWeek() {
    if (!accessToken || !topic.trim()) return;
    setLoading("full");
    setError("");
    try {
      const result = await startTopicWeek(accessToken, {
        topic: topic.trim(),
        audience: audience.trim(),
        stance: stance.trim(),
        run_full: true,
      });
      setProgramId(result.program.id);
      setPlanRaw(result.program.plan);
      const input = result.program.input_data ?? {};
      setPrimaryPillar(
        (input.primary_pillar as string) ||
          ((input.brain as { matched_pillar?: string })?.matched_pillar ?? null),
      );
      if (result.posts?.length) {
        setPosts(result.posts);
        setStep("drafts");
      } else {
        setStep("plan");
      }
    } catch {
      setError("Could not build the full week.");
    } finally {
      setLoading("");
    }
  }

  async function saveAutopilotSettings() {
    if (!accessToken || !profile) return;
    setAutopilotSaving(true);
    try {
      const updated = await updateProfessionalProfile(accessToken, {
        topic_autopilot_enabled: profile.topic_autopilot_enabled,
        topic_autopilot_standing_topic: profile.topic_autopilot_standing_topic,
      });
      setProfile(updated);
    } finally {
      setAutopilotSaving(false);
    }
  }

  async function runAutopilotNow() {
    if (!accessToken) return;
    setAutopilotRunning(true);
    setError("");
    try {
      const result = await runTopicAutopilot(accessToken, true);
      if (result.program) {
        setProgramId(result.program.id);
        setPlanRaw(result.program.plan);
        setTopic(String(result.program.input_data?.topic ?? topic));
      }
      if (result.posts.length) {
        setPosts(result.posts);
        setStep("drafts");
      }
      if (!result.ran && result.reason === "error") {
        setError("Autopilot could not finish. Try again later.");
      }
      setProfile(await getProfessionalProfile(accessToken));
    } finally {
      setAutopilotRunning(false);
    }
  }

  function refreshPost(updated: ProfessionalPost) {
    setPosts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  }

  const mode = profile?.operating_mode ?? "approval";
  const autopilotOn = profile?.topic_autopilot_enabled ?? false;

  if (bootLoading) {
    return (
      <WorkspacePageFrame>
        <div className="p-8 text-sm text-kova-muted">Loading this week…</div>
      </WorkspacePageFrame>
    );
  }

  return (
    <WorkspacePageFrame>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header>
          <h1 className="text-2xl font-semibold text-kova-ink">Topic week</h1>
          <p className="mt-1 text-sm text-kova-muted">
            One theme, three posts, a clear rhythm — or let autopilot run every
            week.
          </p>
        </header>

        {profile && (
          <TopicWeekAutopilotPanel
            profile={profile}
            saving={autopilotSaving}
            running={autopilotRunning}
            onProfileChange={setProfile}
            onSave={saveAutopilotSettings}
            onRunNow={runAutopilotNow}
          />
        )}

        <nav className="flex gap-2 border-b border-kova-border pb-3">
          {STEPS.map((item) => {
            const active = step === item.id;
            const done =
              (item.id === "plan" && !!plan) ||
              (item.id === "drafts" && posts.length > 0);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(item.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  active
                    ? "bg-kova-green text-white"
                    : done
                      ? "bg-kova-green/10 text-kova-green"
                      : "bg-kova-cream text-kova-muted"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {step === "topic" && (
          <div className="space-y-4">
            <LinkedInBrainCard topic={topic.trim() || undefined} />
          <div className="space-y-4 rounded-xl border border-kova-border bg-white p-5 shadow-sm">
            <Input
              label="Topic"
              placeholder="e.g. Trends in Agentic AI"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <Input
              label="Audience (optional)"
              placeholder="Peers, hiring managers…"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            />
            <Input
              label="Stance (optional)"
              placeholder="builder, skeptic, curator…"
              value={stance}
              onChange={(e) => setStance(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                disabled={loading === "plan"}
                onClick={createPlan}
              >
                {loading === "plan" ? "Planning…" : "Build plan"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading === "full"}
                onClick={runFullWeek}
              >
                {loading === "full" ? "Working…" : "Plan + draft + schedule"}
              </Button>
            </div>
          </div>
          </div>
        )}

        {step === "plan" && plan && (
          <div className="space-y-4">
            {primaryPillar && (
              <p className="text-sm text-kova-muted">
                Kova aligned this week with pillar{" "}
                <span className="font-semibold text-kova-green">
                  {primaryPillar}
                </span>
                .
              </p>
            )}
            <TopicWeekPlanView plan={plan} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={loading === "drafts"}
                onClick={() => createDrafts(false)}
              >
                {loading === "drafts" ? "Drafting…" : "Generate drafts"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading === "schedule"}
                onClick={() => createDrafts(true)}
              >
                {loading === "schedule"
                  ? "Scheduling…"
                  : "Generate & schedule week"}
              </Button>
            </div>
          </div>
        )}

        {step === "plan" && !plan && (
          <p className="text-sm text-kova-muted">
            No plan yet — enter a topic on the first step.
          </p>
        )}

        {step === "drafts" && (
          <div className="space-y-4">
            {plan && (
              <details className="rounded-lg border border-kova-border bg-kova-cream/30 p-3 text-sm">
                <summary className="cursor-pointer font-medium text-kova-ink">
                  View week plan: {plan.title}
                </summary>
                <div className="mt-3">
                  <TopicWeekPlanView plan={plan} />
                </div>
              </details>
            )}
            {autopilotOn && (
              <p className="text-sm text-kova-green">
                Autopilot is on — new weeks will be created and scheduled
                automatically. You can still edit any draft below.
              </p>
            )}
            {posts.length === 0 ? (
              <p className="text-sm text-kova-muted">
                No drafts yet. Generate them from the plan step.
              </p>
            ) : (
              posts.map((post) => (
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
                    refreshPost(
                      await schedulePost(accessToken, post.id, iso),
                    );
                  }}
                  onPublish={async () => {
                    if (!accessToken) return;
                    const result = await publishPost(accessToken, post.id);
                    refreshPost(result.post);
                  }}
                  onCopied={async () => {
                    if (!accessToken) return;
                    refreshPost(await markPostCopied(accessToken, post.id));
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>
    </WorkspacePageFrame>
  );
}
