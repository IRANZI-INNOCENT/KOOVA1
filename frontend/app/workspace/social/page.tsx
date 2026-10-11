"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ApiError } from "@/lib/api";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { useWorkspace } from "@/lib/workspace-context";
import {
  getBusinessPolicy,
  getSocialOverview,
  resumeScheduledPublishing,
  updateOperatingMode,
  type OperatingMode,
  type SocialOverview,
} from "@/lib/social";

const MODE_META: Record<
  OperatingMode,
  { label: string; description: string }
> = {
  assist: {
    label: "Assist",
    description:
      "Kova drafts content and recommends actions. You review and act.",
  },
  approval: {
    label: "Approval",
    description:
      "Kova prepares content and queues actions. You approve before anything goes live.",
  },
  autopilot: {
    label: "Autopilot",
    description:
      "Kova has the company. It writes, replies, polishes listings, plans the day's posts, and files the report.",
  },
};

const MODES: OperatingMode[] = ["assist", "approval", "autopilot"];

export default function SocialOverviewPage() {
  const router = useRouter();
  const {
    businessId,
    accessToken,
    workspaceLoading,
  } = useWorkspace();
  const [overview, setOverview] = useState<SocialOverview | null>(null);
  const [mode, setMode] = useState<OperatingMode>("assist");
  const [modeUpdating, setModeUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (
      workspaceLoading ||
      !businessId ||
      !accessToken
    ) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [data, policy] = await Promise.all([
          getSocialOverview(businessId, accessToken),
          getBusinessPolicy(businessId, accessToken),
        ]);
        if (cancelled) {
          return;
        }
        setOverview(data);
        setMode(policy.social_operating_mode);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load social overview.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceLoading, businessId, accessToken]);

  async function handleModeChange(next: OperatingMode) {
    if (!businessId || !accessToken || next === mode) return;
    setModeUpdating(true);
    try {
      const policy = await updateOperatingMode(businessId, next, accessToken);
      setMode(policy.social_operating_mode);
      if (next === "autopilot") {
        router.push("/workspace/social/autopilot");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not update operating mode.",
      );
    } finally {
      setModeUpdating(false);
    }
  }

  if (workspaceLoading || loading) {
    return <PageSkeleton />;
  }

  if (error && !overview) {
    return (
      <div className="p-4 sm:p-8">
        <div className="mx-auto max-w-6xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  const o = overview!;
  const hasChannels = o.channels.total > 0;

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ──── Header + mode toggle ──── */}
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
              Kova Social
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-kova-dark sm:text-3xl">
              Your social presence, managed.
            </h1>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-gray-500 sm:block">Mode:</span>
            <div className="flex rounded-lg border border-kova-border bg-white p-0.5">
              {MODES.map((m) => {
                const active = m === mode;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={modeUpdating}
                    onClick={() => handleModeChange(m)}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? m === "autopilot"
                          ? "bg-kova-orange text-kova-dark shadow-sm"
                          : "bg-kova-green text-white shadow-sm"
                        : "text-gray-400 hover:text-kova-dark"
                    } ${modeUpdating ? "opacity-60" : ""}`}
                  >
                    {MODE_META[m].label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Mode description */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {mode === "autopilot" && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-kova-orange" />
          )}
          <span>{MODE_META[mode].description}</span>
        </div>

        <div className="h-px bg-kova-border" />

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* ──── Stat cards ──── */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-kova-border bg-kova-border sm:grid-cols-4">
          <StatCell
            label="Posts scheduled"
            value={o.command?.scheduled_posts ?? 0}
            detail="Waiting for their time"
            color="orange"
          />
          <StatCell
            label="Conversations to review"
            value={o.command?.conversations_to_review ?? 0}
            detail="Comments and messages still waiting"
            color="default"
          />
          <StatCell
            label="Potential leads"
            value={o.command?.potential_leads ?? 0}
            detail="New buyers Kova has recorded"
            color="green"
          />
          <StatCell
            label="Actions verified today"
            value={o.command?.actions_verified_today ?? 0}
            detail="Completed on the platform today"
            color="green"
          />
        </div>

        {o.command?.plan && (
          <p className="text-sm leading-6 text-kova-dark">{o.command.plan}</p>
        )}

        {o.command?.automation_paused && (
          <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <p>{o.command.pause_reason || "Scheduled publishing is paused."}</p>
            <button
              type="button"
              className="inline-flex h-9 items-center rounded-md bg-kova-green px-4 text-xs font-bold text-white"
              onClick={() => {
                if (!businessId || !accessToken) return;
                resumeScheduledPublishing(businessId, accessToken)
                  .then(() => getSocialOverview(businessId, accessToken))
                  .then(setOverview)
                  .catch((err) => {
                    setError(err instanceof ApiError ? err.message : "Could not resume scheduled publishing.");
                  });
              }}
            >
              Resume scheduled posts
            </button>
          </div>
        )}

        {o.command?.recommendations?.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-kova-dark">Kova recommends</h2>
            {o.command.recommendations.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="block rounded-lg border border-kova-border bg-white px-5 py-4 hover:border-kova-green"
              >
                <p className="text-sm font-bold text-kova-dark">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">{item.detail}</p>
              </Link>
            ))}
          </section>
        )}

        {/* ──── Pending actions ──── */}
        {o.pending_actions > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-kova-orange/50 bg-kova-orange/10 px-5 py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-kova-orange text-sm font-bold text-kova-dark">
              {o.pending_actions}
            </span>
            <p className="text-sm font-semibold text-kova-dark">
              Pending action{o.pending_actions !== 1 ? "s" : ""} waiting for
              your approval
            </p>
          </div>
        )}

        {/* ──── Autopilot banner ──── */}
        {mode === "autopilot" && hasChannels && (
          <div className="flex items-start gap-4 rounded-lg border border-kova-orange/50 bg-gradient-to-r from-kova-orange/15 to-kova-orange/5 px-6 py-5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kova-orange">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kova-dark">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-kova-dark">
                Autopilot is active
              </p>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Kova is handling posts, replies, listings, and today's report.
                Open Autopilot to see what it has done.
              </p>
              <Link
                href="/workspace/social/autopilot"
                className="mt-3 inline-flex text-sm font-bold text-kova-green"
              >
                Watch the shift
              </Link>
            </div>
          </div>
        )}

        {/* ──── Quick actions ──── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            title="Connect an account"
            description="Add Facebook or Instagram so Kova can manage your presence."
            href="/workspace/social/channels"
            variant="orange"
          />
          <QuickAction
            title="Create content"
            description="Ask Kova to draft from your products, brand, and audience."
            href="/workspace/social/studio"
            variant="green"
          />
          <QuickAction
            title="View performance"
            description="See how published content is performing."
            href="/workspace/social/performance"
            variant="default"
          />
        </div>

        {/* ──── Connected channels ──── */}
        {o.channels.accounts.length > 0 && (
          <div className="rounded-lg border border-kova-border bg-white">
            <div className="border-b border-kova-border px-5 py-4">
              <p className="text-sm font-bold text-kova-dark">Connected channels</p>
            </div>
            <div className="divide-y divide-kova-border">
              {o.channels.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-kova-orange/15 text-xs font-bold text-kova-orange">
                    {acc.platform === "instagram" ? "IG" : "FB"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-kova-dark">
                      {acc.account_name || acc.account_username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {acc.platform === "instagram"
                        ? "Instagram"
                        : "Facebook Page"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      acc.is_healthy
                        ? "bg-kova-green/10 text-kova-green"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {acc.is_healthy ? "Healthy" : "Issue"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ──── Recent activity ──── */}
        {o.recent_actions.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-kova-dark">
              Recent activity
            </h2>
            <ul className="mt-4 space-y-2">
              {o.recent_actions.map((action) => (
                <li
                  key={action.id}
                  className="rounded-lg border border-kova-border bg-white px-5 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
                    <span className="text-kova-orange">
                      {action.action_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span
                      className={
                        action.action_status === "completed"
                          ? "text-kova-green"
                          : action.action_status === "failed"
                            ? "text-red-600"
                            : "text-kova-orange"
                      }
                    >
                      {action.action_status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-kova-dark">{action.intent}</p>
                  {action.result && (
                    <p className="mt-1 text-sm text-gray-500">
                      {action.result}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ──── Empty state ──── */}
        {!hasChannels &&
          o.content.drafts === 0 &&
          o.recent_actions.length === 0 && (
            <section className="rounded-lg border-2 border-dashed border-kova-orange/40 bg-kova-orange/5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-kova-orange/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kova-orange">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-kova-dark">
                Start by connecting a social account
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Once connected, Kova can draft content, manage publishing, and
                track engagement.
              </p>
              <Link
                href="/workspace/social/channels"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-kova-orange px-6 text-sm font-bold text-kova-dark hover:bg-[#f0a46e]"
              >
                Connect your first account
              </Link>
            </section>
          )}
      </div>
    </div>
  );
}

/* ───── Stat cell ───── */

function StatCell({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: number;
  detail: string;
  color: "green" | "orange" | "default";
}) {
  const valueColor =
    color === "green"
      ? "text-kova-green"
      : color === "orange"
        ? "text-kova-orange"
        : "text-kova-dark";
  return (
    <div className="bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

/* ───── Quick action card ───── */

function QuickAction({
  title,
  description,
  href,
  variant,
}: {
  title: string;
  description: string;
  href: string;
  variant: "green" | "orange" | "default";
}) {
  const border =
    variant === "green"
      ? "border-kova-green/30 hover:border-kova-green"
      : variant === "orange"
        ? "border-kova-orange/50 hover:border-kova-orange"
        : "border-kova-border hover:border-gray-300";
  const titleColor =
    variant === "green"
      ? "text-kova-green"
      : variant === "orange"
        ? "text-kova-orange"
        : "text-kova-dark";
  return (
    <Link
      href={href}
      className={`block rounded-lg border bg-white px-5 py-4 transition-colors ${border}`}
    >
      <p className={`text-sm font-bold ${titleColor}`}>{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
    </Link>
  );
}
