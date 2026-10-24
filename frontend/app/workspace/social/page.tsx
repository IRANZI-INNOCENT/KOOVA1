"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ApiError } from "@/lib/api";
import { PlatformAvatar } from "@/components/social/platform-avatar";
import { ActivityColumns } from "@/components/ui/activity-columns";
import { MetricStrip } from "@/components/ui/metric-strip";
import { WORKSPACE_PAGE } from "@/components/ui/page-header";
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

function modeCopy(current: string) {
  return MODE_META[current as OperatingMode] ?? MODE_META.assist;
}

function knownMode(value: string | null | undefined): value is OperatingMode {
  return Boolean(value && (MODES as readonly string[]).includes(value));
}

export default function SocialOverviewPage() {
  const { businessId, accessToken, workspaceLoading, workspaceError } =
    useWorkspace();
  const [overview, setOverview] = useState<SocialOverview | null>(null);
  const [mode, setMode] = useState<OperatingMode>("assist");
  const [modeUpdating, setModeUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (workspaceLoading) {
      return;
    }

    if (!businessId || !accessToken) {
      setLoading(false);
      return;
    }

    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;

    async function load() {
      try {
        const [data, policy] = await Promise.all([
          getSocialOverview(bizId, token),
          getBusinessPolicy(bizId, token).catch(() => null),
        ]);
        if (cancelled) return;
        setOverview(data);
        if (knownMode(policy?.social_operating_mode)) {
          setMode(policy.social_operating_mode);
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
      if (knownMode(policy.social_operating_mode)) {
        setMode(policy.social_operating_mode);
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

  if ((workspaceLoading || loading) && !overview) {
    return (
      <div className={WORKSPACE_PAGE}>
        <div className="space-y-6">
          <p className="text-sm text-gray-500">{modeCopy(mode).description}</p>
          <div className="grid w-full grid-cols-3 rounded-lg border border-kova-border bg-white p-0.5 sm:flex sm:w-auto">
            {MODES.map((m) => (
              <span
                key={m}
                className="inline-flex h-11 items-center justify-center px-2 text-xs font-semibold text-gray-400 sm:h-9 sm:px-3.5"
              >
                {MODE_META[m].label}
              </span>
            ))}
          </div>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading posts…</p>
          )}
        </div>
      </div>
    );
  }

  if (!overview?.channels || !Array.isArray(overview.channels.accounts)) {
    const notice =
      error ||
      workspaceError ||
      "Posting will show here once your business is ready.";
    return (
      <div className={WORKSPACE_PAGE}>
        <div className="space-y-6">
          <p className="text-sm text-gray-500">{modeCopy(mode).description}</p>
          <div
            role="alert"
            className="rounded-lg border border-kova-border bg-white px-4 py-3 text-sm text-kova-dark"
          >
            {notice}
          </div>
        </div>
      </div>
    );
  }

  const accounts = overview.channels.accounts;
  const recentActions = Array.isArray(overview.recent_actions)
    ? overview.recent_actions
    : [];
  const drafts = overview.content?.drafts ?? 0;
  const hasChannels = (overview.channels.total ?? accounts.length) > 0;
  const recommendations = (overview.command?.recommendations ?? []).filter(
    (item) =>
      Boolean(
        item &&
          typeof item.href === "string" &&
          item.href &&
          typeof item.title === "string" &&
          item.title,
      ),
  );

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">{modeCopy(mode).description}</p>
          <div className="grid w-full grid-cols-3 rounded-lg border border-kova-border bg-white p-0.5 sm:flex sm:w-auto sm:shrink-0">
            {MODES.map((m) => {
              const active = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={modeUpdating}
                  onClick={() => handleModeChange(m)}
                  className={`h-11 rounded-md px-2 text-xs font-semibold transition sm:h-9 sm:px-3.5 ${
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
              value: overview.command?.scheduled_posts ?? 0,
              tone: "orange",
            },
            {
              label: "Inbox",
              value: overview.command?.conversations_to_review ?? 0,
            },
            {
              label: "Leads",
              value: overview.command?.potential_leads ?? 0,
              tone: "green",
            },
            {
              label: "Verified today",
              value: overview.command?.actions_verified_today ?? 0,
              tone: "green",
            },
          ]}
        />

        {overview.command?.plan ? (
          <p className="text-sm leading-6 text-kova-dark">{overview.command.plan}</p>
        ) : null}

        {overview.command?.automation_paused ? (
          <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <p>{overview.command.pause_reason || "Scheduled publishing is paused."}</p>
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

        {(overview.pending_actions ?? 0) > 0 ? (
          <Link
            href="/workspace/social/studio"
            className="flex items-center justify-between gap-3 border border-kova-border bg-white px-4 py-3 text-sm"
          >
            <span className="font-semibold text-kova-dark">
              Waiting for your approval
            </span>
            <span className="font-semibold text-kova-dark">
              {overview.pending_actions}
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
              </span>
            ))}
          </div>
        ) : null}

        <ActivityColumns items={recentActions} columns={3} />

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
