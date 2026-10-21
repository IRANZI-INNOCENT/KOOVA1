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
        <h2 className="text-sm font-semibold text-kova-dark">Needs action</h2>
      </div>
      <ul className="divide-y divide-kova-border/60">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-start gap-3 px-4 py-3 transition hover:bg-kova-background/80 sm:px-5"
            >
              <span
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-sm ${
                  item.priority === "high" ? "bg-kova-orange" : "bg-gray-300"
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
  dueFollowUps?: number;
  lowStockCount?: number;
  packingOrders?: number;
  socialConnected: boolean;
  approvedContentCount: number;
  pendingSocialActions: number;
  storeLive: boolean;
  activeProductCount: number;
  totalProductCount: number;
}): OverviewActionItem[] {
  const items: OverviewActionItem[] = [];

  if ((input.dueFollowUps || 0) > 0) {
    items.push({
      id: "leads-due",
      title:
        input.dueFollowUps === 1
          ? "1 lead due for follow-up"
          : `${input.dueFollowUps} leads due for follow-up`,
      href: "/workspace/inbox?tab=leads",
      priority: "high",
    });
  }

  if ((input.lowStockCount || 0) > 0) {
    items.push({
      id: "low-stock",
      title:
        input.lowStockCount === 1
          ? "1 product is low on stock"
          : `${input.lowStockCount} products are low on stock`,
      href: "/workspace/commerce/products",
      priority: "medium",
    });
  }

  if ((input.packingOrders || 0) > 0) {
    items.push({
      id: "orders-packing",
      title:
        input.packingOrders === 1
          ? "1 order needs packing or delivery"
          : `${input.packingOrders} orders need packing or delivery`,
      href: "/workspace/commerce/orders",
      priority: "high",
    });
  }

  for (const lead of input.newLeads.slice(0, 5)) {
    const name = lead.customer_name?.trim() || "Unnamed lead";
    const detail = [lead.interest, lead.source]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(" · ");
    items.push({
      id: `lead-${lead.id}`,
      title: `New lead: ${name}`,
      detail: detail || undefined,
      href: "/workspace/inbox?tab=leads",
      priority: "high",
    });
  }

  if (!input.socialConnected) {
    items.push({
      id: "social-connect",
      title: "Connect Facebook or Instagram",
      href: "/workspace/social/channels",
      priority: "high",
    });
  }

  if (input.pendingSocialActions > 0) {
    items.push({
      id: "social-pending",
      title:
        input.pendingSocialActions === 1
          ? "1 action waiting for approval"
          : `${input.pendingSocialActions} actions waiting for approval`,
      href: "/workspace/social",
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
      href: "/workspace/social/studio",
    });
  }

  if (!input.storeLive && input.activeProductCount > 0) {
    items.push({
      id: "store-unpublished",
      title: "Publish your store",
      detail: `${input.activeProductCount} product${input.activeProductCount === 1 ? "" : "s"} ready`,
      href: "/workspace/commerce/storefront",
    });
  }

  if (input.totalProductCount === 0) {
    items.push({
      id: "no-products",
      title: "Add your first product",
      href: "/workspace/commerce/snap-to-sell",
    });
  }

  return items;
}
