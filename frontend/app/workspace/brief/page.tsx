"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { getBusiness, type Business } from "@/lib/commerce";
import {
  getLatestBrief,
  generateBrief,
  type MorningBrief,
  type BriefSections,
} from "@/lib/brief";

function localDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function MorningBriefPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
    user,
  } = useAuth();

  const [business, setBusiness] = useState<Business | null>(null);
  const [brief, setBrief] = useState<MorningBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const autoStarted = useRef(false);

  const loadBrief = useCallback(
    async (token: string, businessId: number) => {
      try {
        const b = await getLatestBrief(businessId, token);
        setBrief(b);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          setBrief(null);
        } else {
          throw err;
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }
    const token = accessToken;

    async function init() {
      try {
        setLoading(true);
        setError("");
        const biz = await getBusiness(token);
        setBusiness(biz);
        await loadBrief(token, biz.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          router.replace("/workspace/setup");
          return;
        }
        setError(
          err instanceof Error ? err.message : "Could not load the brief.",
        );
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [authLoading, isAuthenticated, accessToken, router, loadBrief]);

  async function handleGenerate(force = false) {
    if (!accessToken || !business) return;
    setGenerating(true);
    setError("");
    try {
      const b = await generateBrief(business.id, accessToken, force);
      setBrief(b);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not generate the brief.",
      );
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (loading || !business || !accessToken || autoStarted.current) return;
    const today = localDate();
    if (
      brief &&
      brief.date === today &&
      (brief.status === "ready" || brief.status === "generating")
    ) {
      return;
    }
    const key = `kova-brief-auto-${business.id}-${today}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    autoStarted.current = true;
    void handleGenerate(false);
  }, [loading, business, accessToken, brief]);

  /* ───── Loading ───── */
  if (authLoading || loading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-kova-green border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  /* ───── Error ───── */
  if (error && !brief) {
    return (
      <AppShell>
        <div className="p-4 sm:p-8">
          <div className="mx-auto max-w-3xl rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              className="mt-3 inline-flex h-9 items-center rounded-md bg-kova-green px-4 text-xs font-bold text-white"
            >
              Try again
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell>
      <div className="p-4 sm:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* ──── Header ──── */}
          <header>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
              Morning Brief
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-kova-dark sm:text-3xl">
              {brief?.greeting ||
                `Good morning${user?.first_name ? `, ${user.first_name}` : ""}.`}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{today}</p>
          </header>

          <div className="h-px bg-kova-border" />

          {/* ──── No brief yet ──── */}
          {!brief && (
            <section className="rounded-lg border-2 border-dashed border-kova-green/30 bg-kova-green/5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-kova-green/15">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-kova-green"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-kova-dark">
                Your morning brief is not ready yet
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Kova will analyse your business data and prepare a personalised
                brief with insights, pending actions, and a plan for today.
              </p>
              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-kova-green px-6 text-sm font-bold text-white transition hover:bg-[#12563d] disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating…
                  </>
                ) : (
                  "Generate today's brief"
                )}
              </button>
            </section>
          )}

          {/* ──── Generating state ──── */}
          {brief?.status === "generating" && (
            <section className="flex items-center gap-3 rounded-lg border border-kova-orange/30 bg-kova-orange/5 px-5 py-5">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-kova-orange border-t-transparent" />
              <p className="text-sm font-medium text-kova-dark">
                Kova is preparing your morning brief…
              </p>
            </section>
          )}

          {/* ──── Failed state ──── */}
          {brief?.status === "failed" && (
            <section className="rounded-lg border border-red-200 bg-red-50 px-5 py-5">
              <p className="text-sm font-medium text-red-700">
                The brief could not be generated.{" "}
                {brief.error_message && (
                  <span className="text-red-500">
                    {brief.error_message}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {generating ? "Retrying…" : "Retry"}
              </button>
            </section>
          )}

          {/* ──── Ready brief sections ──── */}
          {brief?.status === "ready" && brief.sections && (
            <BriefContent
              sections={brief.sections as BriefSections}
              onRefresh={() => handleGenerate(true)}
              generating={generating}
            />
          )}

          {/* ──── Error banner (soft, if brief also loaded) ──── */}
          {error && brief && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ════════════════════════════════════════════
   Brief content — all 6 sections
   ════════════════════════════════════════════ */

function BriefContent({
  sections,
  onRefresh,
  generating,
}: {
  sections: BriefSections;
  onRefresh: () => void;
  generating: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* ──── 1 · Pulse ──── */}
      {sections.pulse && (
        <SectionCard
          icon="⚡"
          title="Business Pulse"
          color="green"
        >
          <p className="text-sm leading-relaxed text-gray-700">
            {sections.pulse.summary}
          </p>
          {sections.pulse.metrics?.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-kova-border bg-kova-border sm:grid-cols-3">
              {sections.pulse.metrics.map((m, i) => (
                <div key={i} className="bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    {m.label}
                  </p>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-kova-dark">
                      {m.value}
                    </span>
                    {m.change && (
                      <span
                        className={`text-xs font-semibold ${
                          m.change === "up"
                            ? "text-kova-green"
                            : m.change === "down"
                              ? "text-red-500"
                              : "text-gray-400"
                        }`}
                      >
                        {m.change === "up"
                          ? "↑"
                          : m.change === "down"
                            ? "↓"
                            : "—"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ──── 2 · Pending ──── */}
      {sections.pending && (
        <SectionCard
          icon="🔔"
          title="Needs Your Attention"
          color="orange"
        >
          <p className="text-sm leading-relaxed text-gray-700">
            {sections.pending.summary}
          </p>
          {sections.pending.items?.length > 0 && (
            <div className="mt-4 space-y-2">
              {sections.pending.items.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md border border-kova-border bg-white px-4 py-3"
                >
                  <PriorityDot priority={item.priority} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-kova-dark">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ──── 3 · Opportunities ──── */}
      {sections.opportunities && (
        <SectionCard
          icon="💡"
          title="Opportunities"
          color="green"
        >
          <p className="text-sm leading-relaxed text-gray-700">
            {sections.opportunities.summary}
          </p>
          {sections.opportunities.items?.length > 0 && (
            <div className="mt-4 space-y-2">
              {sections.opportunities.items.map((item, i) => (
                <div
                  key={i}
                  className="rounded-md border border-kova-green/20 bg-kova-green/5 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-kova-dark">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-gray-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {/* ──── 4 · Performance ──── */}
      {sections.performance && (
        <SectionCard
          icon="📊"
          title="Performance"
          color="default"
        >
          <p className="text-sm leading-relaxed text-gray-700">
            {sections.performance.summary}
          </p>
          {sections.performance.highlights?.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {sections.performance.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-kova-orange" />
                  {h}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {/* ──── 5 · Today's Plan ──── */}
      {sections.plan && (
        <SectionCard
          icon="📋"
          title="Today's Plan"
          color="green"
        >
          <p className="text-sm leading-relaxed text-gray-700">
            {sections.plan.summary}
          </p>
          {sections.plan.steps?.length > 0 && (
            <ol className="mt-3 space-y-2">
              {sections.plan.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kova-green text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-sm leading-relaxed text-gray-700">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>
      )}

      {/* ──── 6 · Kova Actions ──── */}
      {sections.kova_actions && (
        <SectionCard
          icon="🤖"
          title="Kova Actions"
          color="orange"
        >
          {sections.kova_actions.completed?.length > 0 && (
            <ActionGroup
              label="Completed"
              items={sections.kova_actions.completed}
              dotColor="bg-kova-green"
            />
          )}
          {sections.kova_actions.planned?.length > 0 && (
            <ActionGroup
              label="Planned"
              items={sections.kova_actions.planned}
              dotColor="bg-kova-orange"
            />
          )}
          {sections.kova_actions.needs_approval?.length > 0 && (
            <ActionGroup
              label="Needs your approval"
              items={sections.kova_actions.needs_approval}
              dotColor="bg-red-400"
            />
          )}
        </SectionCard>
      )}

      {/* ──── Refresh ──── */}
      <div className="flex justify-center pt-2 pb-8">
        <button
          type="button"
          onClick={onRefresh}
          disabled={generating}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-kova-border bg-white px-4 text-xs font-semibold text-gray-500 transition hover:border-kova-orange/50 hover:text-kova-dark disabled:opacity-50"
        >
          {generating ? (
            <>
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              Regenerating…
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              Refresh brief
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ═══════ Shared components ═══════ */

function SectionCard({
  icon,
  title,
  color,
  children,
}: {
  icon: string;
  title: string;
  color: "green" | "orange" | "default";
  children: React.ReactNode;
}) {
  const borderClass =
    color === "green"
      ? "border-kova-green/20"
      : color === "orange"
        ? "border-kova-orange/30"
        : "border-kova-border";

  const labelColor =
    color === "green"
      ? "text-kova-green"
      : color === "orange"
        ? "text-kova-orange"
        : "text-gray-500";

  return (
    <section className={`rounded-lg border ${borderClass} bg-white`}>
      <div className="flex items-center gap-2.5 border-b border-kova-border/60 px-5 py-3.5">
        <span className="text-base">{icon}</span>
        <h2 className={`text-sm font-bold uppercase tracking-wide ${labelColor}`}>
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function PriorityDot({
  priority,
}: {
  priority?: "high" | "medium" | "low";
}) {
  const color =
    priority === "high"
      ? "bg-red-500"
      : priority === "medium"
        ? "bg-kova-orange"
        : "bg-gray-300";
  return (
    <span
      className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${color}`}
      title={priority || ""}
    />
  );
}

function ActionGroup({
  label,
  items,
  dotColor,
}: {
  label: string;
  items: string[];
  dotColor: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span
              className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
