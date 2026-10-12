"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ApiError } from "@/lib/api";
import { PlatformAvatar } from "@/components/social/platform-avatar";
import { ActivityColumns } from "@/components/ui/activity-columns";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { QuickLinks } from "@/components/ui/quick-links";
import { KovaStepsGuide } from "@/components/workspace/kova-steps-guide";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
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
    label: "Help me",
    description:
      "Kova suggests posts and next steps. You choose what to publish.",
  },
  approval: {
    label: "You approve",
    description:
      "Kova prepares posts and replies. Nothing goes live until you say yes.",
  },
  autopilot: {
    label: "Autopilot",
    description:
      "Kova runs the day — drafts, schedules, replies, and keeps your store tidy.",
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

    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;

    async function load() {
      try {
        const [data, policy] = await Promise.all([
          getSocialOverview(bizId, token),
          getBusinessPolicy(bizId, token),
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
    <div className={WORKSPACE_PAGE}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Social"
          title="Posts and replies for Facebook & Instagram"
          description="Connect once, create in Create, and check Replies when customers write you."
          actions={
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-gray-500 sm:block">
                How Kova works:
              </span>
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
          }
        />

        {/* Mode description */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {mode === "autopilot" && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-kova-orange" />
          )}
          <span>{MODE_META[mode].description}</span>
        </div>

        <KovaStepsGuide
          steps={[
            {
              letter: "A",
              title: "Connect accounts",
              description: "Link Facebook or Instagram so Kova can post for you.",
              href: "/workspace/social/channels",
              done: hasChannels,
            },
            {
              letter: "B",
              title: "Create posts",
              description: "From products, everyday tips, or a video you upload.",
              href: "/workspace/social/studio",
              done: o.content.drafts > 0 || o.content.published > 0,
            },
            {
              letter: "C",
              title: "Check replies",
              description: "See comments and messages that need your attention.",
              href: "/workspace/social/engagement",
            },
          ]}
        />

        <div className="h-px bg-kova-border" />

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <MetricStrip
          items={[
            {
              label: "Scheduled",
              value: o.command?.scheduled_posts ?? 0,
              hint: "Waiting to publish",
              tone: "orange",
            },
            {
              label: "Replies",
              value: o.command?.conversations_to_review ?? 0,
              hint: "Need review",
            },
            {
              label: "Leads",
              value: o.command?.potential_leads ?? 0,
              hint: "Open Leads",
              tone: "green",
            },
            {
              label: "Verified today",
              value: o.command?.actions_verified_today ?? 0,
              hint: "On platform",
              tone: "green",
            },
          ]}
        />

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
          <section>
            <h2 className="text-sm font-semibold text-kova-dark">
              Kova recommends
            </h2>
            <ul className="mt-2 space-y-1.5">
              {o.command.recommendations.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="block rounded-md border border-kova-border/80 bg-white px-3 py-2 transition hover:border-kova-green/50"
                  >
                    <p className="text-sm font-semibold text-kova-dark">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-gray-500">
                      {item.detail}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
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

        <QuickLinks
          links={[
            {
              label: "Connect accounts",
              href: "/workspace/social/channels",
              accent: "orange",
            },
            {
              label: "Create posts",
              href: "/workspace/social/studio",
              accent: "green",
            },
            { label: "Open Leads", href: "/workspace/leads" },
          ]}
        />

        {o.channels.accounts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">
              Connected:
            </span>
            {o.channels.accounts.map((acc) => (
              <span
                key={acc.id}
                className={`inline-flex max-w-[16rem] items-center gap-2 truncate rounded-full border px-2 py-1 text-xs ${
                  acc.is_healthy
                    ? "border-kova-green/30 bg-kova-green/5 text-kova-dark"
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
              </span>
            ))}
          </div>
        )}

        <ActivityColumns items={o.recent_actions} columns={3} />

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

