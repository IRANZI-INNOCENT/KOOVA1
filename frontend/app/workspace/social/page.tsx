"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api";
import { PlatformAvatar } from "@/components/social/platform-avatar";
import { ActivityColumns } from "@/components/ui/activity-columns";
import { MetricStrip } from "@/components/ui/metric-strip";
import { WORKSPACE_PAGE } from "@/components/ui/page-header";
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
    description: "Kova suggests. You choose what to publish.",
  },
  approval: {
    label: "You approve",
    description: "Nothing goes live until you say yes.",
  },
  autopilot: {
    label: "Autopilot",
    description: "Kova drafts, schedules, and replies for you.",
  },
};

const MODES: OperatingMode[] = ["assist", "approval", "autopilot"];

export default function SocialOverviewPage() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [overview, setOverview] = useState<SocialOverview | null>(null);
  const [mode, setMode] = useState<OperatingMode>("assist");
  const [modeUpdating, setModeUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) {
      return;
    }

    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;

    async function load() {
      try {
        const data = await getSocialOverview(bizId, token);
        if (cancelled) return;
        setOverview(data);
        try {
          const policy = await getBusinessPolicy(bizId, token);
          if (!cancelled) setMode(policy.social_operating_mode);
        } catch {
          /* overview still usable */
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load social overview.",
        );
      } finally {
        if (!cancelled) setLoading(false);
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
        <div className="mx-auto max-w-6xl rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">{MODE_META[mode].description}</p>
          <div className="flex shrink-0 rounded-lg border border-kova-border bg-white p-0.5">
            {MODES.map((m) => {
              const active = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={modeUpdating}
                  onClick={() => handleModeChange(m)}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? m === "autopilot"
                        ? "bg-kova-orange text-kova-dark"
                        : "bg-kova-green text-white"
                      : "text-gray-400 hover:text-kova-dark"
                  } ${modeUpdating ? "opacity-60" : ""}`}
                >
                  {MODE_META[m].label}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        <MetricStrip
          items={[
            {
              label: "Scheduled",
              value: o.command?.scheduled_posts ?? 0,
              tone: "orange",
            },
            {
              label: "Inbox",
              value: o.command?.conversations_to_review ?? 0,
            },
            {
              label: "Leads",
              value: o.command?.potential_leads ?? 0,
              tone: "green",
            },
            {
              label: "Verified today",
              value: o.command?.actions_verified_today ?? 0,
              tone: "green",
            },
          ]}
        />

        {o.command?.plan ? (
          <p className="text-sm leading-6 text-kova-dark">{o.command.plan}</p>
        ) : null}

        {o.command?.automation_paused ? (
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

        {o.command?.recommendations?.length > 0 ? (
          <section>
            <h2 className="text-sm font-semibold text-kova-dark">Next</h2>
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
                    {item.detail ? (
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

        {o.pending_actions > 0 ? (
          <Link
            href="/workspace/social/studio"
            className="flex items-center justify-between gap-3 border border-kova-border bg-white px-4 py-3 text-sm"
          >
            <span className="font-semibold text-kova-dark">
              Waiting for your approval
            </span>
            <span className="font-semibold text-kova-dark">
              {o.pending_actions}
            </span>
          </Link>
        ) : null}

        {o.channels.accounts.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {o.channels.accounts.map((acc) => (
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
              </span>
            ))}
          </div>
        ) : null}

        <ActivityColumns items={o.recent_actions} columns={3} />

        {!hasChannels &&
        o.content.drafts === 0 &&
        o.recent_actions.length === 0 ? (
          <section className="border border-kova-border bg-white px-5 py-6">
            <p className="font-semibold text-kova-dark">
              Connect Facebook or Instagram
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Then create and schedule posts from Create.
            </p>
            <Link
              href="/workspace/social/channels"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark hover:bg-[#f0a46e]"
            >
              Connect
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}
