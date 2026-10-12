"use client";

import Link from "next/link";

export interface OverviewActionItem {
  id: string;
  title: string;
  detail?: string;
  href: string;
  priority?: "high" | "medium";
}

/**
 * Only real workspace state — no AI narrative or filler cards.
 */
export function OverviewActionPanel({
  items,
}: {
  items: OverviewActionItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-kova-border bg-white">
      <div className="border-b border-kova-border/60 px-4 py-2.5 sm:px-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-kova-dark">
          Needs your action
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          From your store, social accounts, leads, and content in Kova.
        </p>
      </div>
      <ul className="divide-y divide-kova-border/60">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-3 px-4 py-3 transition hover:bg-kova-background/80 sm:px-5"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  item.priority === "high"
                    ? "bg-kova-orange"
                    : "bg-kova-green/70"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-kova-dark">
                  {item.title}
                </span>
                {item.detail ? (
                  <span className="mt-0.5 block text-xs leading-5 text-gray-500">
                    {item.detail}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs font-semibold text-kova-green">
                Open →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function buildOverviewActions(input: {
  newLeads: Array<{
    id: number;
    customer_name: string;
    interest: string;
    source: string;
  }>;
  socialConnected: boolean;
  approvedContentCount: number;
  pendingSocialActions: number;
  storeLive: boolean;
  activeProductCount: number;
  totalProductCount: number;
}): OverviewActionItem[] {
  const items: OverviewActionItem[] = [];

  for (const lead of input.newLeads.slice(0, 5)) {
    const name = lead.customer_name?.trim() || "Unnamed lead";
    const detail = [lead.interest, lead.source]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" · ");
    items.push({
      id: `lead-${lead.id}`,
      title: `New lead: ${name}`,
      detail: detail || "Status: new — follow up in Leads.",
      href: "/workspace/leads",
      priority: "high",
    });
  }

  if (!input.socialConnected) {
    items.push({
      id: "social-connect",
      title: "Connect Facebook or Instagram",
      detail: "Not connected in Kova yet.",
      href: "/workspace/social/channels",
      priority: "high",
    });
  }

  if (input.pendingSocialActions > 0) {
    items.push({
      id: "social-pending",
      title:
        input.pendingSocialActions === 1
          ? "1 autopilot action waiting"
          : `${input.pendingSocialActions} autopilot actions waiting`,
      detail: "Needs approval in Social autopilot.",
      href: "/workspace/social/autopilot",
      priority: "high",
    });
  }

  if (input.approvedContentCount > 0) {
    items.push({
      id: "content-approved",
      title:
        input.approvedContentCount === 1
          ? "1 approved post ready"
          : `${input.approvedContentCount} approved posts ready`,
      detail: "Publish or schedule in Content Studio.",
      href: "/workspace/social/studio",
    });
  }

  if (
    !input.storeLive &&
    input.activeProductCount > 0
  ) {
    items.push({
      id: "store-unpublished",
      title: "Store not published",
      detail: `${input.activeProductCount} active product${input.activeProductCount === 1 ? "" : "s"} — customers cannot shop yet.`,
      href: "/workspace/commerce/storefront",
    });
  }

  if (input.totalProductCount === 0) {
    items.push({
      id: "no-products",
      title: "Add your first product",
      detail: "Commerce is empty in Kova.",
      href: "/workspace/commerce/snap-to-sell",
    });
  }

  return items;
}
