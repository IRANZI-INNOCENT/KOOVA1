"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { getBusiness, getKovaExchanges, sendKovaMessage, type KovaTurn } from "@/lib/commerce";
import {
  getAutopilot,
  startAutopilotShift,
  type AutopilotDesk,
  type AutopilotMetricPost,
  type AutopilotPicture,
  type AutopilotProductResult,
  type AutopilotWorkItem,
  type AutopilotWorkState,
} from "@/lib/social";

const AREAS: {
  key: "posts" | "replies" | "listings" | "report";
  label: string;
  stat: string;
  href: string;
  link: string;
}[] = [
  {
    key: "posts",
    label: "Posts",
    stat: "Posts placed",
    href: "/workspace/social/calendar",
    link: "Calendar",
  },
  {
    key: "replies",
    label: "Replies",
    stat: "Replies sent",
    href: "/workspace/social/engagement",
    link: "Inbox",
  },
  {
    key: "listings",
    label: "Listings",
    stat: "Listings",
    href: "/workspace/commerce",
    link: "Products",
  },
  {
    key: "report",
    label: "Report",
    stat: "Daily report",
    href: "/workspace/brief",
    link: "Open",
  },
];

const STATE_LABEL: Record<AutopilotWorkState, string> = {
  done: "Done",
  scheduled: "Scheduled",
  sent: "Sent",
  filed: "Filed",
  clear: "Checked",
  failed: "Needs a look",
};

export default function AutopilotPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const [desk, setDesk] = useState<AutopilotDesk | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [turns, setTurns] = useState<KovaTurn[]>([]);
  const [asking, setAsking] = useState(false);
  const [draft, setDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }
    const token = accessToken;
    let stopped = false;

    async function load(startIfIdle: boolean) {
      try {
        const business = await getBusiness(token);
        const [loaded, history] = await Promise.all([
          getAutopilot(business.id, token),
          getKovaExchanges(business.id, token).catch(() => [] as KovaTurn[]),
        ]);
        let next = loaded;
        if (!stopped && startIfIdle) setTurns(history);
        const stale =
          !next.shift ||
          next.shift.status === "failed" ||
          (next.shift.finished_at !== null &&
            Date.now() - new Date(next.shift.finished_at).getTime() > 20 * 60 * 1000);
        if (startIfIdle && next.active && stale) {
          next = await startAutopilotShift(business.id, token, false);
        }
        if (!stopped) {
          setDesk(next);
          setReady(true);
          setError("");
        }
      } catch (err) {
        if (!stopped) {
          setReady(true);
          setError(err instanceof ApiError ? err.message : "Could not open Autopilot.");
        }
      }
    }

    load(true);
    const timer = window.setInterval(() => load(false), 8000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [authLoading, isAuthenticated, accessToken, router]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatOpen, turns, asking]);

  async function askKova(text: string) {
    if (!accessToken || asking) return;
    const message = text.trim();
    if (!message) return;
    setAsking(true);
    setError("");
    setDraft("");
    try {
      const business = await getBusiness(accessToken);
      const reply = await sendKovaMessage(business.id, accessToken, message, "general");
      setTurns((current) => [
        ...current,
        {
          id: Date.now(),
          request: message,
          response: reply.message,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kova could not write that summary.");
    } finally {
      setAsking(false);
    }
  }

  async function runAgain() {
    if (!accessToken) return;
    setStarting(true);
    setError("");
    try {
      const business = await getBusiness(accessToken);
      setDesk(await startAutopilotShift(business.id, accessToken, true));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start the shift.");
    } finally {
      setStarting(false);
    }
  }

  if (authLoading || !ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-kova-green border-t-transparent" />
      </div>
    );
  }

  if (!desk) {
    return (
      <div className="p-4 sm:p-8">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "Could not open Autopilot."}
        </p>
      </div>
    );
  }

  const work = normalizeWork(desk.work);
  const picture = normalizePicture(desk.picture);
  const working = desk.active && desk.shift?.status === "running";
  const headline = !desk.active
    ? "Autopilot is off"
    : working
      ? "Kova is working"
      : "The business right now";
  const leadingProducts = picture.products.filter((product) => product.band !== "low");
  const quietProducts = picture.products.filter((product) => product.band === "low");
  const leadingPosts = picture.posts.filter((post) => post.band !== "low");
  const quietPosts = picture.posts.filter((post) => post.band === "low");

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="overflow-hidden rounded-lg bg-[#fbf6f1]">
          <div className="flex flex-col gap-4 px-5 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-dark">
                  Autopilot
                </p>
                <StatusPill active={desk.active} status={desk.shift?.status} />
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-kova-dark sm:text-3xl">
                {headline}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-kova-dark/70">
                {desk.shift
                  ? shiftClock(desk.shift.started_at, desk.shift.finished_at, working)
                  : "Likes, impressions, and the products people are seeing."}
              </p>
            </div>
            {desk.active ? (
              <button
                type="button"
                onClick={runAgain}
                disabled={starting || working}
                className="inline-flex h-10 items-center rounded-md bg-white px-4 text-sm font-bold text-kova-dark disabled:opacity-60"
              >
                {starting ? "Starting…" : working ? "Working…" : "Run again"}
              </button>
            ) : (
              <Link
                href="/workspace/social"
                className="inline-flex h-10 items-center rounded-md bg-kova-dark px-4 text-sm font-bold text-white"
              >
                Turn it on
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-px bg-[#f3e6d8] sm:grid-cols-3 lg:grid-cols-6">
            <Tile label="Impressions" value={picture.impressions} />
            <Tile label="Likes" value={picture.likes} />
            <Tile label="Reach" value={picture.reach} />
            <Tile label="Comments" value={picture.comments} />
            <Tile label="Shares" value={picture.shares} />
            <Tile label="Clicks" value={picture.clicks} />
          </div>
        </header>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {work.stopped && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {work.stopped}
          </p>
        )}

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuietStat label="Published" value={picture.published} />
          <QuietStat label="Scheduled" value={picture.scheduled} />
          <QuietStat label="Leads" value={picture.leads} />
          <QuietStat label="Orders" value={picture.orders} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-kova-dark">Products</h2>
          {picture.products.length === 0 ? (
            <p className="rounded-lg border border-[#f3e6d8] bg-white px-5 py-4 text-sm text-kova-dark/70">
              Product results appear after a post is published.
            </p>
          ) : (
            <div className="space-y-4">
              {leadingProducts.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-kova-dark/50">
                    Performing
                  </p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {leadingProducts.map((product) => (
                      <ProductCard key={product.name} product={product} />
                    ))}
                  </div>
                </div>
              )}
              {quietProducts.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-kova-dark/50">
                    Not performing
                  </p>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {quietProducts.map((product) => (
                      <ProductCard key={product.name} product={product} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-[#f3e6d8] bg-white">
          <div className="border-b border-[#f3e6d8] bg-[#fbf6f1] px-5 py-3">
            <h2 className="text-sm font-bold text-kova-dark">Posts</h2>
          </div>
          {picture.posts.length === 0 ? (
            <p className="px-5 py-4 text-sm text-kova-dark/70">
              Likes and impressions show here after a post goes out.
            </p>
          ) : (
            <div>
              <PostGroup label="Performing" posts={leadingPosts} />
              <PostGroup label="Not performing" posts={quietPosts} />
            </div>
          )}
        </section>

        {working && (
          <div className="flex items-center gap-3 rounded-lg bg-[#fbf6f1] px-5 py-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-kova-dark" />
            <p className="text-sm font-semibold text-kova-dark">
              This page updates as each step finishes.
            </p>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-kova-dark">This shift</h2>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#f3e6d8] bg-[#f3e6d8] sm:grid-cols-4">
            {AREAS.map((area) => (
              <div key={area.key} className="bg-[#fbf6f1] px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-kova-dark/60">
                  {area.stat}
                </p>
                <p className="mt-1 text-2xl font-bold text-kova-dark">
                  {work.summary[area.key]}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {AREAS.map((area) => (
              <WorkCard
                key={area.key}
                label={area.label}
                href={area.href}
                link={area.link}
                items={work[area.key]}
                working={working}
              />
            ))}
          </div>
        </section>
      </div>
      {chatOpen ? (
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-[min(34rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-kova-green/15 bg-white shadow-xl lg:bottom-6 lg:right-6">
          <div className="flex items-center gap-3 bg-kova-green px-4 py-3 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-kova-green">
              K
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Ask Kova</p>
              <p className="text-xs text-white/80">Here for this business</p>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none text-white hover:bg-white/15"
              aria-label="Close chat"
            >
              ×
            </button>
          </div>
          <div className="flex flex-1 flex-col gap-5 overflow-y-auto bg-white px-4 py-4">
            {turns.length === 0 && !asking && (
              <div>
                <p className="text-sm leading-6 text-kova-dark/70">
                  Ask about likes, impressions, and the products on this page.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    askKova(
                      "Summarize how the business is doing right now. Say what is performing, what is quiet, and the likes and impressions.",
                    )
                  }
                  className="mt-3 text-sm font-semibold text-kova-green"
                >
                  Summarize this page
                </button>
              </div>
            )}
            {turns.map((turn) => (
              <div key={turn.id} className="space-y-3">
                <p className="text-right text-sm leading-6 text-kova-green">
                  {plainChat(turn.request)}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-kova-dark">
                  {plainChat(turn.response)}
                </p>
              </div>
            ))}
            {asking && <p className="text-sm text-kova-green">Writing…</p>}
            <div ref={chatEndRef} />
          </div>
          <form
            className="flex items-center gap-2 border-t border-kova-green/10 bg-white px-3 py-3"
            onSubmit={(event) => {
              event.preventDefault();
              askKova(draft);
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message Kova"
              disabled={asking}
              className="h-11 min-w-0 flex-1 rounded-full border border-kova-green/20 bg-[#f7f6f3] px-4 text-sm text-kova-dark placeholder:text-kova-dark/40 focus:border-kova-green focus:outline-none"
            />
            <button
              type="submit"
              disabled={asking || !draft.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-kova-green text-white disabled:opacity-40"
              aria-label="Send"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-kova-green text-white shadow-lg lg:bottom-6 lg:right-6"
          aria-label="Open chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v6A3.5 3.5 0 0 1 15.5 16H9l-4 4v-4.2A3.5 3.5 0 0 1 5 12.5v-6Z" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function plainChat(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\*\*/g, "")
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/^---+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const EMPTY_PICTURE: AutopilotPicture = {
  likes: 0,
  impressions: 0,
  reach: 0,
  comments: 0,
  shares: 0,
  clicks: 0,
  published: 0,
  scheduled: 0,
  leads: 0,
  orders: 0,
  posts: [],
  products: [],
};

function normalizePicture(raw: AutopilotPicture | undefined): AutopilotPicture {
  if (!raw) return EMPTY_PICTURE;
  return {
    ...EMPTY_PICTURE,
    ...raw,
    posts: Array.isArray(raw.posts) ? raw.posts : [],
    products: Array.isArray(raw.products) ? raw.products : [],
  };
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/80 px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-kova-dark/55">{label}</p>
      <p className="mt-1 text-2xl font-bold text-kova-dark">{amount(value)}</p>
    </div>
  );
}

function QuietStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#f3e6d8] bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-kova-dark/55">{label}</p>
      <p className="mt-1 text-xl font-bold text-kova-dark">{amount(value)}</p>
    </div>
  );
}

function PostGroup({ label, posts }: { label: string; posts: AutopilotMetricPost[] }) {
  if (posts.length === 0) return null;
  return (
    <div>
      <p className="bg-[#fbf6f1] px-5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-kova-dark/50">
        {label}
      </p>
      <ul className="divide-y divide-[#f3e6d8]">
        {posts.map((post) => (
          <li key={post.id} className="px-5 py-4">
            <p className="text-sm font-semibold text-kova-dark">{post.product}</p>
            <p className="mt-0.5 text-xs text-kova-dark/60">
              {post.platform}
              {post.status ? ` · ${post.status}` : ""}
              {post.when ? ` · ${clock(post.when)}` : ""}
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              <Mini label="Impr." value={post.impressions} />
              <Mini label="Likes" value={post.likes} />
              <Mini label="Reach" value={post.reach} />
              <Mini label="Comments" value={post.comments} />
              <Mini label="Shares" value={post.shares} />
              <Mini label="Clicks" value={post.clicks} />
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductCard({ product }: { product: AutopilotProductResult }) {
  const hot = product.highlight;
  return (
    <article className={`rounded-lg p-5 ${hot ? "bg-[#f8efe6]" : "border border-[#f3e6d8] bg-white"}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-kova-dark/70">
        {hot ? "Standing out" : `${product.posts} post${product.posts === 1 ? "" : "s"}`}
      </p>
      <h3 className="mt-2 text-lg font-semibold text-kova-dark">{product.name}</h3>
      <p className="mt-3 text-3xl font-bold text-kova-dark">{amount(product.impressions)}</p>
      <p className="text-sm text-kova-dark/70">impressions</p>
      <p className="mt-3 text-sm font-semibold text-kova-dark">
        {amount(product.likes)} likes · {amount(product.reach)} reach · {amount(product.comments)} comments
      </p>
    </article>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-[#fbf6f1] px-2 py-1.5">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-kova-dark/55">{label}</dt>
      <dd className="text-sm font-bold text-kova-dark">{amount(value)}</dd>
    </div>
  );
}

function amount(value: number) {
  return new Intl.NumberFormat("en-KE").format(value || 0);
}

function normalizeWork(raw: AutopilotDesk["work"] | undefined) {
  const summary = {
    posts: "—",
    replies: "—",
    listings: "—",
    report: "—",
    ...(raw?.summary ?? {}),
  };
  return {
    summary,
    posts: Array.isArray(raw?.posts) ? raw.posts : [],
    replies: Array.isArray(raw?.replies) ? raw.replies : [],
    listings: Array.isArray(raw?.listings) ? raw.listings : [],
    report: Array.isArray(raw?.report) ? raw.report : [],
    stopped: raw?.stopped ?? "",
  };
}

function StatusPill({
  active,
  status,
}: {
  active: boolean;
  status?: "running" | "finished" | "failed";
}) {
  const on = active && status !== "failed";
  const label = !active ? "Off" : status === "running" ? "Working" : status === "failed" ? "Stopped" : "On";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        !active
          ? "bg-white/70 text-kova-dark/50"
          : status === "failed"
            ? "bg-red-50 text-red-700"
            : "bg-white text-kova-dark"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-[#e7c4a8]" : "bg-kova-dark/30"}`} />
      {label}
    </span>
  );
}

function WorkCard({
  label,
  href,
  link,
  items,
  working,
}: {
  label: string;
  href: string;
  link: string;
  items: AutopilotWorkItem[];
  working: boolean;
}) {
  const rows = Array.isArray(items) ? items : [];
  return (
    <section className="overflow-hidden rounded-lg border border-[#f3e6d8] bg-white">
      <div className="flex items-center justify-between border-b border-[#f3e6d8] bg-[#fbf6f1] px-5 py-3">
        <h2 className="text-sm font-bold text-kova-dark">{label}</h2>
        <Link href={href} className="text-xs font-bold text-kova-dark">
          {link}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-gray-500">
          {working ? "In progress" : "Waiting for the next shift"}
        </p>
      ) : (
        <ul className="divide-y divide-[#f3e6d8]">
          {rows.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-kova-dark">{item.title}</p>
                {item.detail && (
                  <p className="mt-0.5 text-sm leading-5 text-gray-500">{item.detail}</p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <StateChip state={item.state} />
                {item.when && (
                  <p className="mt-1 text-[11px] text-gray-400">{clock(item.when)}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StateChip({ state }: { state: AutopilotWorkState }) {
  const tone =
    state === "failed"
      ? "bg-red-50 text-red-700"
      : state === "scheduled"
        ? "bg-white text-kova-dark"
        : state === "clear"
          ? "bg-white/70 text-kova-dark/60"
          : "bg-white text-kova-dark";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>
      {STATE_LABEL[state]}
    </span>
  );
}

function clock(iso: string) {
  return new Date(iso).toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shiftClock(started: string, finished: string | null, working: boolean) {
  const start = clock(started);
  if (working || !finished) return `Started ${start}`;
  return `Started ${start} · Finished ${clock(finished)}`;
}
