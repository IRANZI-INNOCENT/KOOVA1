"use client";

import { useEffect, useState } from "react";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { AppShell } from "@/components/workspace/app-shell";
import {
  DailyBriefPanel,
  WeeklyReportPanel,
} from "@/components/workspace/report-panels";
import { ApiError } from "@/lib/api";
import {
  getBusinessAnalytics,
  type AnalyticsPeriod,
  type BusinessAnalyticsReport,
} from "@/lib/analytics";
import {
  generateBrief,
  generateWeeklyReport,
  getLatestBrief,
  getLatestWeeklyReport,
  type MorningBrief,
  type WeeklyReport,
} from "@/lib/brief";
import { useWorkspace } from "@/lib/workspace-context";

export default function AnalyticsPage() {
  const { businessId, accessToken, workspaceLoading, business } = useWorkspace();
  const [period, setPeriod] = useState<AnalyticsPeriod>("7d");
  const [report, setReport] = useState<BusinessAnalyticsReport | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"daily" | "weekly" | null>(null);

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;

    let cancelled = false;
    setAnalyticsLoading(true);
    void getBusinessAnalytics(businessId, accessToken, period)
      .then((payload) => {
        if (!cancelled) setReport(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "Could not load analytics.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, businessId, period, workspaceLoading]);

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;
    const token = accessToken;
    const bizId = businessId;
    void getLatestBrief(bizId, token).then(setBrief).catch(() => undefined);
    void getLatestWeeklyReport(bizId, token).then(setWeekly).catch(() => undefined);
  }, [accessToken, businessId, workspaceLoading]);

  const refreshDaily = async (force = false) => {
    if (!businessId || !accessToken) return;
    setBusy("daily");
    setError("");
    try {
      setBrief(await generateBrief(businessId, accessToken, force));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "KCOVA could not generate today’s brief.",
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
      setWeekly(await generateWeeklyReport(businessId, accessToken, force));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "KCOVA could not generate the weekly report.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <div className={WORKSPACE_PAGE}>
        <PageHeader
          eyebrow={business?.name}
          title="Analytics"
          description="Real numbers from your shop, leads, expenses, and social posts — never estimated revenue."
        />

        <div className="mt-8">
          <AnalyticsDashboard
            report={report}
            period={period}
            onPeriodChange={setPeriod}
            loading={analyticsLoading}
            error={error && !report ? error : undefined}
          />
        </div>

        <section className="mt-12 space-y-4 border-t border-kova-border pt-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-kova-dark">Written brief</h2>
              <p className="mt-1 text-xs text-kova-muted">
                AI narrative grounded in the same business data. Recommendations are
                suggestions — verify facts above.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refreshDaily(Boolean(brief))}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-kova-green px-4 text-sm font-medium text-white transition hover:bg-[#12563d] disabled:opacity-60"
              >
                {busy === "daily" ? "Writing…" : brief ? "Refresh daily" : "Generate daily"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refreshWeekly(Boolean(weekly))}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-kova-green px-4 text-sm font-medium text-kova-green transition hover:bg-kova-green/5 disabled:opacity-60"
              >
                {busy === "weekly" ? "Writing…" : weekly ? "Refresh weekly" : "Generate weekly"}
              </button>
            </div>
          </div>

          {brief && brief.status === "ready" ? (
            <DailyBriefPanel brief={brief} />
          ) : brief && brief.status === "failed" ? (
            <p className="text-sm text-red-700">
              {brief.error_message || "The daily brief did not finish."}
            </p>
          ) : (
            <p className="text-sm leading-6 text-kova-muted">
              Generate a daily brief when you want KCOVA to summarise this period in prose.
            </p>
          )}

          {weekly && weekly.status === "ready" ? (
            <WeeklyReportPanel report={weekly} />
          ) : weekly && weekly.status === "failed" ? (
            <p className="text-sm text-red-700">
              {weekly.error_message || "The weekly report did not finish."}
            </p>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
