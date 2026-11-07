"use client";

import { useEffect, useState } from "react";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { AppShell } from "@/components/workspace/app-shell";
import { BusinessAnalytics } from "@/components/workspace/business-analytics";
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
import {
  getExpenses,
  getLeads,
  peekExpenses,
  peekLeads,
  type BusinessExpense,
  type Lead,
} from "@/lib/commerce";
import {
  getMessages,
  getOrders,
  getSocialPosts,
  peekOrders,
  peekSocialPosts,
  type OrderRecord,
  type SocialMessageRecord,
  type SocialPostRecord,
} from "@/lib/operations";
import { useWorkspace } from "@/lib/workspace-context";

export default function AnalyticsPage() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [posts, setPosts] = useState<SocialPostRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [messages, setMessages] = useState<SocialMessageRecord[]>([]);
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"daily" | "weekly" | null>(null);

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) return;
    const token = accessToken;
    const bizId = businessId;
    const cachedPosts = peekSocialPosts(bizId);
    const cachedOrders = peekOrders(bizId);
    const cachedLeads = peekLeads(bizId);
    const cachedExpenses = peekExpenses(bizId);
    if (cachedPosts) setPosts(cachedPosts);
    if (cachedOrders) setOrders(cachedOrders);
    if (cachedLeads) setLeads(cachedLeads);
    if (cachedExpenses) setExpenses(cachedExpenses);

    let cancelled = false;
    void getSocialPosts(bizId, token)
      .then((rows) => {
        if (!cancelled) setPosts(rows);
      })
      .catch(() => undefined);
    void getOrders(bizId, token)
      .then((rows) => {
        if (!cancelled) setOrders(rows);
      })
      .catch(() => undefined);
    void getLeads(bizId, token)
      .then((rows) => {
        if (!cancelled) setLeads(rows);
      })
      .catch(() => undefined);
    void getExpenses(bizId, token)
      .then((rows) => {
        if (!cancelled) setExpenses(rows);
      })
      .catch(() => undefined);
    void getMessages(bizId, token)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch(() => undefined);
    void getLatestBrief(bizId, token)
      .then((row) => {
        if (!cancelled) setBrief(row);
      })
      .catch(() => undefined);
    void getLatestWeeklyReport(bizId, token)
      .then((row) => {
        if (!cancelled) setWeekly(row);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [accessToken, businessId, workspaceLoading]);

  const refreshDaily = async (force = false) => {
    if (!businessId || !accessToken) return;
    setBusy("daily");
    setError("");
    try {
      setBrief(await generateBrief(businessId, accessToken, force));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "KCOVA could not generate today’s brief.",
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
        err instanceof ApiError
          ? err.message
          : "KCOVA could not generate the weekly report.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <div className={WORKSPACE_PAGE}>
        <PageHeader
          title="Last 7 days"
          description="Posts, shop, and people."
        />

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <BusinessAnalytics
            posts={posts}
            orders={orders}
            leads={leads}
            expenses={expenses}
            messages={messages}
          />
        </div>

        <section className="mt-10 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-kova-dark">Brief</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refreshDaily(Boolean(brief))}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[#176B4D] px-4 text-sm font-medium text-white transition hover:bg-[#12563D] disabled:opacity-60"
              >
                {busy === "daily" ? "Writing…" : brief ? "Refresh daily" : "Generate daily"}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void refreshWeekly(Boolean(weekly))}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-[#176B4D] px-4 text-sm font-medium text-[#176B4D] transition hover:bg-[#176B4D]/5 disabled:opacity-60"
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
            <p className="text-sm leading-6 text-gray-500">
              Generate the daily brief when you want the written version of this week.
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
