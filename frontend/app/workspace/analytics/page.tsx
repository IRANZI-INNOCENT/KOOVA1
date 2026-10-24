"use client";

import { useCallback, useEffect, useState } from "react";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { AppShell } from "@/components/workspace/app-shell";
import { ActivityBoard } from "@/components/workspace/activity-board";
import {
  DailyBriefPanel,
  WeeklyReportPanel,
} from "@/components/workspace/report-panels";
import { ApiError } from "@/lib/api";
import {
  generateBrief,
  generateWeeklyReport,
  getLatestBrief,
  getLatestWeeklyReport,
  type MorningBrief,
  type WeeklyReport,
} from "@/lib/brief";
import { useWorkspace } from "@/lib/workspace-context";

type Tab = "daily" | "weekly" | "activity";

export default function AnalyticsPage() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [tab, setTab] = useState<Tab>("daily");
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"daily" | "weekly" | null>(null);

  const load = useCallback(async () => {
    if (!businessId || !accessToken) return;
    setLoading(true);
    setError("");
    try {
      const [dailyResult, weeklyResult] = await Promise.allSettled([
        getLatestBrief(businessId, accessToken),
        getLatestWeeklyReport(businessId, accessToken),
      ]);
      setBrief(
        dailyResult.status === "fulfilled" ? dailyResult.value : null,
      );
      setWeekly(
        weeklyResult.status === "fulfilled" ? weeklyResult.value : null,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Unable to load reports.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, businessId]);

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;
    void load();
  }, [accessToken, businessId, load, workspaceLoading]);

  const refreshDaily = async (force = false) => {
    if (!businessId || !accessToken) return;
    setBusy("daily");
    setError("");
    try {
      const next = await generateBrief(businessId, accessToken, force);
      setBrief(next);
      setTab("daily");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Kova could not generate today’s brief.",
      );
    } finally {
      setBusy(null);
    }
  };

  const refreshWeekly = async (force = false) => {
    if (!businessId || !accessToken) return;
    setBusy("weekly");
    setError("");
    try {
      const next = await generateWeeklyReport(businessId, accessToken, force);
      setWeekly(next);
      setTab("weekly");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Kova could not generate the weekly report.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <div className={WORKSPACE_PAGE}>
        <PageHeader
          title="Reports"
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refreshDaily(Boolean(brief))}
                className="rounded-lg bg-[#176B4D] px-4 text-sm font-medium text-white transition hover:bg-[#12563D] disabled:opacity-60"
              >
                {busy === "daily"
                  ? "Writing…"
                  : brief
                    ? "Refresh daily"
                    : "Generate daily"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refreshWeekly(Boolean(weekly))}
                className="rounded-lg border border-[#176B4D] px-4 py-2 text-sm font-medium text-[#176B4D] transition hover:bg-[#176B4D]/5 disabled:opacity-60"
              >
                {busy === "weekly"
                  ? "Writing…"
                  : weekly
                    ? "Refresh weekly"
                    : "Generate weekly"}
              </button>
            </div>
          }
        />

        <div className="mt-6 flex touch-pan-x gap-1 overflow-x-auto border-b border-[#E5E7E5] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(
            [
              ["daily", "Daily brief"],
              ["weekly", "Weekly report"],
              ["activity", "Activity"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`shrink-0 border-b-2 px-3.5 py-3 text-sm font-medium whitespace-nowrap transition ${
                tab === id
                  ? "border-[#C45C26] text-[#17211D]"
                  : "border-transparent text-gray-400 hover:text-[#17211D]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
            </div>
          ) : null}

          {!loading && tab === "daily" ? (
            brief && brief.status === "ready" ? (
              <DailyBriefPanel brief={brief} />
            ) : brief && brief.status === "failed" ? (
              <EmptyReport
                title="Daily brief failed"
                detail={brief.error_message || "Try generating again."}
              />
            ) : (
              <EmptyReport
                title="No daily brief yet"
                detail="Generate today’s brief from your posts, inbox, leads, and orders."
              />
            )
          ) : null}

          {!loading && tab === "weekly" ? (
            weekly && weekly.status === "ready" ? (
              <WeeklyReportPanel report={weekly} />
            ) : weekly && weekly.status === "failed" ? (
              <EmptyReport
                title="Weekly report failed"
                detail={weekly.error_message || "Try generating again."}
              />
            ) : (
              <EmptyReport
                title="No weekly report yet"
                detail="Generate this week’s Monday–Sunday review when you want the bigger picture."
              />
            )
          ) : null}

          {!loading && tab === "activity" ? (
            <ActivityBoard
              title="Recent activity"
              intro="Orders, leads, published posts, and replies in one feed."
            />
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function EmptyReport({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="border border-[#E5E7E5] bg-white px-6 py-8">
      <p className="text-sm font-semibold text-[#17211D]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {detail}
      </p>
    </div>
  );
}
