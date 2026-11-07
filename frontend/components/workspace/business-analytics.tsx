"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

import type { BusinessExpense, Lead } from "@/lib/commerce";
import type { OrderRecord, SocialMessageRecord, SocialPostRecord } from "@/lib/operations";

const WEEK_DAYS = 7;

function weekStart() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (WEEK_DAYS - 1));
  return date;
}

function inWeek(iso: string | null | undefined, start = weekStart()) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return !Number.isNaN(time) && time >= start.getTime();
}

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function preview(caption: string) {
  const flat = caption.replace(/\s+/g, " ").trim();
  if (!flat) return "Untitled post";
  if (flat.length <= 48) return flat;
  return `${flat.slice(0, 48).trimEnd()}…`;
}

function engagement(post: SocialPostRecord) {
  return post.likes + post.comments_count + post.shares + post.clicks;
}

export function BusinessAnalytics({
  posts,
  orders,
  leads,
  expenses,
  messages,
}: {
  posts: SocialPostRecord[];
  orders: OrderRecord[];
  leads: Lead[];
  expenses: BusinessExpense[];
  messages: SocialMessageRecord[];
}) {
  const [selected, setSelected] = useState<SocialPostRecord | null>(null);
  const start = useMemo(() => weekStart(), []);
  const startKey = dateKey(start);

  const published = useMemo(
    () =>
      posts
        .filter(
          (post) =>
            post.publishing_status === "published" && inWeek(post.published_at, start),
        )
        .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || "")),
    [posts, start],
  );

  const useReach = published.some((post) => post.reach > 0);
  const reach = published.reduce((sum, post) => sum + post.reach, 0);
  const likes = published.reduce((sum, post) => sum + post.likes, 0);
  const comments = published.reduce((sum, post) => sum + post.comments_count, 0);
  const shares = published.reduce((sum, post) => sum + post.shares, 0);
  const clicks = published.reduce((sum, post) => sum + post.clicks, 0);

  const weekOrders = orders.filter((order) => inWeek(order.created_at, start));
  const weekLeads = leads.filter((lead) => inWeek(lead.created_at, start));
  const weekExpenses = expenses.filter((item) => item.spent_on >= startKey);
  const weekMessages = messages.filter((item) => inWeek(item.created_at, start));

  const orderCounts = (
    [
      ["new", "New"],
      ["confirmed", "Confirmed"],
      ["packing", "Packing"],
      ["out_for_delivery", "Out for delivery"],
      ["delivered", "Delivered"],
    ] as const
  )
    .map(([status, label]) => ({
      label,
      value: weekOrders.filter((order) => order.status === status || (status === "delivered" && order.status === "fulfilled")).length,
    }))
    .filter((row) => row.value > 0);

  const expenseCounts = (
    [
      ["rider", "Rider"],
      ["packaging", "Packaging"],
      ["restock", "Restock"],
      ["ads", "Ads"],
      ["other", "Other"],
    ] as const
  )
    .map(([category, label]) => ({
      label,
      value: weekExpenses
        .filter((item) => item.category === category)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    }))
    .filter((row) => row.value > 0);

  const messageCounts = [
    { label: "Buying", value: weekMessages.filter((item) => item.intent === "buying").length },
    { label: "Questions", value: weekMessages.filter((item) => item.intent === "question").length },
    { label: "Complaints", value: weekMessages.filter((item) => item.intent === "complaint").length },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Reach" value={reach.toLocaleString()} />
        <Stat label="Engagement" value={(likes + comments + shares).toLocaleString()} />
        <Stat label="Orders" value={String(weekOrders.length)} />
        <Stat label="New leads" value={String(weekLeads.length)} />
      </section>

      <ChartCard title="Post performance" hint={useReach ? "Reach" : "Likes, comments, shares, and clicks"}>
        {published.length === 0 ? (
          <EmptyChart
            text="No published posts in the last 7 days."
            href="/workspace/social/studio"
            action="Create a post"
          />
        ) : (
          <BarList
            tone="green"
            rows={published.slice(0, 12).map((post) => ({
              key: String(post.id),
              label: preview(post.caption || ""),
              value: useReach ? post.reach : engagement(post),
              onClick: () => setSelected(post),
            }))}
          />
        )}
      </ChartCard>

      <ChartCard title="What people did" hint="On posts published this week">
        {published.length === 0 ? (
          <EmptyChart text="No published posts in the last 7 days." />
        ) : (
          <BarList
            tone="orange"
            rows={[
              { key: "likes", label: "Likes", value: likes },
              { key: "comments", label: "Comments", value: comments },
              { key: "shares", label: "Shares", value: shares },
              { key: "clicks", label: "Clicks", value: clicks },
            ]}
          />
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Orders" hint="By status, last 7 days">
          {orderCounts.length === 0 ? (
            <EmptyChart text="No orders in the last 7 days." href="/workspace/commerce/orders" action="Orders" />
          ) : (
            <BarList tone="green" rows={orderCounts.map((row) => ({ ...row, key: row.label }))} />
          )}
        </ChartCard>
        <ChartCard title="Cash out" hint="KES logged this week">
          {expenseCounts.length === 0 ? (
            <EmptyChart text="No expenses logged this week." href="/workspace/commerce/expenses" action="Log an expense" />
          ) : (
            <BarList
              tone="orange"
              rows={expenseCounts.map((row) => ({
                ...row,
                key: row.label,
                display: Math.round(row.value).toLocaleString(),
              }))}
            />
          )}
        </ChartCard>
      </div>

      <ChartCard title="People" hint={`${weekLeads.length} new lead${weekLeads.length === 1 ? "" : "s"}`}>
        {messageCounts.length === 0 ? (
          <EmptyChart text="No buying messages, questions, or complaints this week." href="/workspace/inbox" action="Inbox" />
        ) : (
          <BarList tone="green" rows={messageCounts.map((row) => ({ ...row, key: row.label }))} />
        )}
      </ChartCard>

      {selected ? (
        <PostChartDialog post={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-kova-border bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-kova-dark">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-kova-border bg-white px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-kova-dark">{title}</h2>
        {hint ? <p className="text-xs text-gray-400">{hint}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart({
  text,
  href,
  action,
}: {
  text: string;
  href?: string;
  action?: string;
}) {
  return (
    <p className="text-sm leading-6 text-gray-500">
      {text}{" "}
      {href && action ? (
        <Link href={href} className="font-semibold text-kova-green hover:underline">
          {action}
        </Link>
      ) : null}
    </p>
  );
}

function BarList({
  rows,
  tone,
}: {
  rows: {
    key: string;
    label: string;
    value: number;
    display?: string;
    onClick?: () => void;
  }[];
  tone: "green" | "orange";
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const bar = tone === "green" ? "bg-[#176B4D]" : "bg-[#F4B183]";
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const width = row.value <= 0 ? 0 : Math.max(4, Math.round((row.value / max) * 100));
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-kova-dark">{row.label}</span>
              <span className="shrink-0 font-semibold text-kova-dark">
                {row.display ?? row.value.toLocaleString()}
              </span>
            </span>
            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-[#E7E5E1]">
              <span className={`block h-2 rounded-full ${bar}`} style={{ width: `${width}%` }} />
            </span>
          </>
        );
        return (
          <li key={row.key}>
            {row.onClick ? (
              <button type="button" onClick={row.onClick} className="block w-full text-left">
                {body}
              </button>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PostChartDialog({
  post,
  onClose,
}: {
  post: SocialPostRecord;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const figures = [
    ["Reach", post.reach],
    ["Likes", post.likes],
    ["Comments", post.comments_count],
    ["Shares", post.shares],
    ["Clicks", post.clicks],
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-kova-dark/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="analytics-post-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg bg-white shadow-sm sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-kova-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Published</p>
            <h2 id="analytics-post-title" className="mt-1 truncate text-base font-semibold text-kova-dark">
              {post.account_name || post.platform}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-sm font-semibold text-gray-400">
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-kova-dark">
            {post.caption?.trim() || "Untitled post"}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {figures.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-gray-500">{label}</dt>
                <dd className="mt-0.5 text-lg font-semibold text-kova-dark">{value.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
