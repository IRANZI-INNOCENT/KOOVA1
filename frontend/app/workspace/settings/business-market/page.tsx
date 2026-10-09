"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { useSectionSetup } from "@/components/workspace/use-section-setup";
import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { SETUP_LABELS, SETUP_SECTIONS } from "@/lib/setup-flow";

interface Business {
  id: number;
}

interface Competitor {
  name: string;
  note: string;
  source_url: string;
}

interface Source {
  title: string;
  url: string;
}

interface MarketBrief {
  status: "empty" | "ready" | "skipped";
  kept: boolean;
  summary: string;
  competitors: Competitor[];
  gap: string;
  positioning: string;
  sources: Source[];
  researched_at: string | null;
}

interface MarketForm {
  summary: string;
  gap: string;
  positioning: string;
}

const emptyForm: MarketForm = {
  summary: "",
  gap: "",
  positioning: "",
};

export default function BusinessMarketPage() {
  const router = useRouter();
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState<MarketForm>(emptyForm);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [status, setStatus] = useState<MarketBrief["status"]>("empty");
  const [kept, setKept] = useState(false);
  const [researched, setResearched] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [researching, setResearching] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState("");
  const pauseSave = useRef(false);

  const setup = useSectionSetup({
    section: "market",
    businessId: business?.id ?? null,
    accessToken,
    form,
    ready,
    save: async (current) => {
      if (!business || !accessToken || pauseSave.current) return;
      await authenticatedApiRequest(
        `/business-brain/${business.id}/market/`,
        accessToken,
        { method: "PATCH", body: JSON.stringify(current) },
      );
    },
  });

  function applyBrief(brief: MarketBrief) {
    setForm({
      summary: brief.summary || "",
      gap: brief.gap || "",
      positioning: brief.positioning || "",
    });
    setCompetitors(Array.isArray(brief.competitors) ? brief.competitors : []);
    setSources(Array.isArray(brief.sources) ? brief.sources : []);
    setStatus(brief.status);
    setKept(brief.kept);
    setResearched(Boolean(brief.researched_at) || Boolean(brief.summary));
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user || !accessToken) {
      router.replace("/login");
      return;
    }
    const token = accessToken;

    async function load() {
      try {
        const businesses = await authenticatedApiRequest<Business[]>(
          "/businesses/",
          token,
        );
        if (!businesses.length) {
          router.replace("/workspace/setup");
          return;
        }
        const current = businesses[0];
        setBusiness(current);
        const brief = await authenticatedApiRequest<MarketBrief>(
          `/business-brain/${current.id}/market/`,
          token,
        );
        applyBrief(brief);
        setReady(true);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load the market brief.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, user, accessToken, router]);

  async function research() {
    if (!business || !accessToken) return;
    pauseSave.current = true;
    setResearching(true);
    setError("");
    try {
      const brief = await authenticatedApiRequest<MarketBrief>(
        `/business-brain/${business.id}/market/research/`,
        accessToken,
        { method: "POST" },
      );
      applyBrief(brief);
      pauseSave.current = false;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Kova could not search the market.",
      );
    } finally {
      pauseSave.current = false;
      setResearching(false);
    }
  }

  async function decide(nextKept: boolean) {
    if (!business || !accessToken) return;
    setDeciding(true);
    setError("");
    try {
      await authenticatedApiRequest(
        `/business-brain/${business.id}/market/`,
        accessToken,
        { method: "PATCH", body: JSON.stringify(form) },
      );
      const brief = await authenticatedApiRequest<MarketBrief>(
        `/business-brain/${business.id}/market/decision/`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({ kept: nextKept }),
        },
      );
      applyBrief(brief);
      if (setup.isSetup) {
        router.push("/workspace");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Kova could not save that choice.",
      );
    } finally {
      setDeciding(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kova-background">
        <p className="text-sm text-gray-500">Loading your workspace...</p>
      </main>
    );
  }

  const stepIndex = SETUP_SECTIONS.indexOf("market");
  const hasBrief = researched || status !== "empty";

  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-3xl">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Business Brain
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Market position
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Kova searches public pages for who else sells what you sell, near where you sell it.
              Keep the brief and Kova can use it when writing and replying. Leave it, and it stays here unused.
            </p>
          </div>

          <div className="mt-6 border border-kova-border bg-white p-4">
            {setup.isSetup && (
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-kova-green">
                Setup {stepIndex + 2} of {SETUP_SECTIONS.length + 1} · {SETUP_LABELS.market}
              </p>
            )}
            <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${setup.isSetup ? "mt-3" : ""}`}>
              <p className="max-w-xl text-sm leading-6 text-gray-600">
                {researching
                  ? "Searching public listings..."
                  : "This uses the business, customers, brand, and goals you already saved."}
              </p>
              <button
                type="button"
                onClick={research}
                disabled={researching || deciding}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-kova-orange px-4 text-sm font-semibold text-kova-dark hover:bg-[#f0a46e] disabled:opacity-60"
              >
                {researching ? "Searching..." : hasBrief ? "Research again" : "Research the market"}
              </button>
            </div>
            {setup.autoState !== "idle" && (
              <p className="mt-3 text-xs text-gray-500">
                {setup.autoState === "saving" ? "Saving..." : "Saved. You can leave and come back."}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {hasBrief && (
            <div className="mt-8 space-y-8">
              <section className="border border-kova-border bg-white p-6">
                <h2 className="text-base font-semibold text-kova-dark">What Kova found</h2>
                <textarea
                  value={form.summary}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, summary: event.target.value }))
                  }
                  rows={5}
                  className="mt-3 block w-full border border-kova-border bg-white px-4 py-3 text-sm text-kova-dark outline-none focus:border-kova-green focus:ring-1 focus:ring-kova-green"
                />
              </section>

              {competitors.length > 0 && (
                <section className="border border-kova-border bg-white p-6">
                  <h2 className="text-base font-semibold text-kova-dark">Competitors named on those pages</h2>
                  <ul className="mt-4 space-y-4">
                    {competitors.map((item) => (
                      <li key={`${item.name}-${item.source_url}`}>
                        <p className="text-sm font-semibold text-kova-dark">{item.name}</p>
                        {item.note && (
                          <p className="mt-1 text-sm leading-6 text-gray-600">{item.note}</p>
                        )}
                        {item.source_url && (
                          <a
                            href={item.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-sm font-semibold text-kova-green"
                          >
                            Source
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="border border-kova-border bg-white p-6">
                <h2 className="text-base font-semibold text-kova-dark">The opening</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Edit this if the gap does not sound like your business.
                </p>
                <textarea
                  value={form.gap}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, gap: event.target.value }))
                  }
                  rows={4}
                  className="mt-3 block w-full border border-kova-border bg-white px-4 py-3 text-sm text-kova-dark outline-none focus:border-kova-green focus:ring-1 focus:ring-kova-green"
                />
              </section>

              <section className="border border-kova-border bg-white p-6">
                <h2 className="text-base font-semibold text-kova-dark">Positioning line</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Keeping this brief does not replace the positioning on your brand page.
                </p>
                <textarea
                  value={form.positioning}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, positioning: event.target.value }))
                  }
                  rows={3}
                  className="mt-3 block w-full border border-kova-border bg-white px-4 py-3 text-sm text-kova-dark outline-none focus:border-kova-green focus:ring-1 focus:ring-kova-green"
                />
              </section>

              {sources.length > 0 && (
                <section className="border border-kova-border bg-white p-6">
                  <h2 className="text-base font-semibold text-kova-dark">Sources</h2>
                  <ul className="mt-4 space-y-2">
                    {sources.map((source) => (
                      <li key={source.url}>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-semibold text-kova-green"
                        >
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="text-sm text-gray-600">
                {kept
                  ? "Kova will use this brief when it writes and replies."
                  : status === "skipped"
                    ? "This brief is saved here. Kova will not use it until you keep it."
                    : "Review the brief, then keep it or leave it out."}
              </p>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={deciding || researching}
              className="inline-flex h-10 items-center justify-center rounded-md border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark hover:border-kova-green disabled:opacity-60"
            >
              Leave it out
            </button>
            <button
              type="button"
              onClick={() => decide(true)}
              disabled={deciding || researching || !hasBrief}
              className="inline-flex h-10 items-center justify-center rounded-md bg-kova-green px-4 text-sm font-semibold text-white hover:bg-[#12563d] disabled:opacity-60"
            >
              {deciding ? "Saving..." : "Keep this brief"}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
