"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { KovaStepsGuide } from "@/components/workspace/kova-steps-guide";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import {
  OverviewActionPanel,
  buildOverviewActions,
} from "@/components/workspace/overview-daily-panel";
import { ApiError } from "@/lib/api";
import { getLatestBrief, type MorningBrief } from "@/lib/brief";
import { getSocialOverview } from "@/lib/social";
import {
  getConnectedChannels,
  getProducts,
  getCommercePage,
  getContents,
  getLeads,
  getProductContentPlans,
  type Product,
  type ProductContentPlan,
  type CommercePage,
  type Content,
  type Lead,
} from "@/lib/commerce";
import { getOrders, type OrderRecord } from "@/lib/operations";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/lib/workspace-context";

function formatName(name: string) {
  if (name === name.toUpperCase() && name.length > 1) {
    return name.charAt(0) + name.slice(1).toLowerCase();
  }
  return name;
}

export default function OverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    business,
    businessId,
    accessToken,
    workspaceLoading,
  } = useWorkspace();

  const [products, setProducts] = useState<Product[]>([]);
  const [commercePage, setCommercePage] = useState<CommercePage | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [contentPlans, setContentPlans] = useState<
    Record<number, ProductContentPlan>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [socialConnected, setSocialConnected] = useState(false);
  const [pendingSocialActions, setPendingSocialActions] = useState(0);
  const [brief, setBrief] = useState<MorningBrief | null>(null);

  useEffect(() => {
    if (workspaceLoading || !businessId || !accessToken) {
      return;
    }

    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;

    async function loadOverview() {
      try {
        setLoading(true);
        setError("");

        const [prods, page, contentList, leadList, orderList, plans, channels, social, dailyBrief] =
          await Promise.all([
            getProducts(bizId, token),
            getCommercePage(bizId, token),
            getContents(bizId, token).catch(() => [] as Content[]),
            getLeads(bizId, token).catch(() => [] as Lead[]),
            getOrders(bizId, token).catch(() => [] as OrderRecord[]),
            getProductContentPlans(bizId, token).catch(
              () => [] as ProductContentPlan[],
            ),
            getConnectedChannels(bizId, token).catch(() => null),
            getSocialOverview(bizId, token).catch(() => null),
            getLatestBrief(bizId, token).catch(() => null),
          ]);

        if (cancelled) return;

        setProducts(prods);
        setCommercePage(page);
        setContents(contentList);
        setLeads(leadList);
        setOrders(orderList);
        setContentPlans(
          Object.fromEntries(plans.map((plan) => [plan.product_id, plan])),
        );
        setSocialConnected(!!channels?.connected);
        setPendingSocialActions(social?.pending_actions ?? 0);
        setBrief(
          dailyBrief && dailyBrief.status === "ready" ? dailyBrief : null,
        );
      } catch (err) {
        if (cancelled) return;

        if (err instanceof ApiError && err.status === 404) {
          router.replace("/workspace/setup");
          return;
        }
        if (
          err instanceof Error &&
          err.message === "No business is configured."
        ) {
          router.replace("/workspace/onboarding");
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your workspace.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [workspaceLoading, businessId, accessToken, router]);

  function copyStoreLink() {
    if (!commercePage?.slug) return;
    const url = `${window.location.origin}/store/${commercePage.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (error) {
    return (
      <WorkspacePageFrame loading={false}>
        <div className="p-4 sm:p-8">
          <div className="mx-auto max-w-5xl rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      </WorkspacePageFrame>
    );
  }

  const activeProducts = products.filter((p) => p.status === "active");
  const newLeads = leads.filter((l) => l.status === "new");
  const now = Date.now();
  const dueFollowUps = leads.filter((lead) => {
    if (["converted", "lost"].includes(lead.status)) return false;
    if (!lead.next_follow_up_at) return lead.status === "new";
    return new Date(lead.next_follow_up_at).getTime() <= now;
  }).length;
  const lowStockCount = activeProducts.filter(
    (product) => product.stock !== null && product.stock <= 2,
  ).length;
  const packingOrders = orders.filter((order) =>
    ["confirmed", "packing", "out_for_delivery"].includes(order.status),
  ).length;
  const draftContent = contents.filter((c) => c.status === "draft");
  const approvedContent = contents.filter((c) => c.status === "approved");
  const publishedContent = contents.filter((c) => c.status === "published");
  const storeIsLive = !!commercePage?.is_published;
  const actionItems = buildOverviewActions({
    newLeads,
    dueFollowUps,
    lowStockCount,
    packingOrders,
    socialConnected,
    approvedContentCount: approvedContent.length,
    pendingSocialActions,
    storeLive: storeIsLive,
    activeProductCount: activeProducts.length,
    totalProductCount: products.length,
  });
  const storeUrl = commercePage?.slug
    ? `/store/${commercePage.slug}`
    : null;
  const showSetup =
    !socialConnected || products.length === 0 || publishedContent.length === 0;

  return (
    <WorkspacePageFrame
      loading={workspaceLoading || loading}
      skeleton={<PageSkeleton />}
    >
      <div className={WORKSPACE_PAGE}>
        <div className="space-y-6">
          <PageHeader
            title={
              user?.first_name
                ? `Hi ${formatName(user.first_name)}`
                : business?.name || "Today"
            }
            description={business?.name && user?.first_name ? business.name : undefined}
            actions={
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/workspace/kova"
                  className="inline-flex h-10 items-center rounded-lg bg-kova-orange px-4 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
                >
                  Talk to Kova
                </Link>
                {storeIsLive && storeUrl ? (
                  <>
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50"
                    >
                      View store
                    </a>
                    <button
                      type="button"
                      onClick={copyStoreLink}
                      className="inline-flex h-10 items-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50"
                    >
                      {copied ? "Copied" : "Share"}
                    </button>
                  </>
                ) : null}
              </div>
            }
          />

          {showSetup ? (
            <KovaStepsGuide
              title="Get started"
              steps={[
                {
                  letter: "1",
                  title: "Connect",
                  description: "Facebook or Instagram",
                  href: "/workspace/social/channels",
                  done: socialConnected,
                },
                {
                  letter: "2",
                  title: "Add a product",
                  description: "Snap a photo or enter details",
                  href:
                    products.length > 0
                      ? "/workspace/commerce/products"
                      : "/workspace/commerce/snap-to-sell",
                  done: products.length > 0,
                },
                {
                  letter: "3",
                  title: "Create a post",
                  description: "Product, tip, or short video",
                  href: "/workspace/social/studio",
                  done: publishedContent.length > 0,
                },
              ]}
            />
          ) : null}

          <OverviewActionPanel items={actionItems} />

          {brief ? (
            <section className="rounded-lg border border-kova-border bg-white px-4 py-3.5 sm:px-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-kova-dark">
                  {brief.greeting || "Today’s report"}
                </h2>
                <Link
                  href="/workspace/analytics"
                  className="text-sm font-semibold text-kova-green hover:underline"
                >
                  Reports
                </Link>
              </div>
              {brief.sections?.pulse?.summary ? (
                <p className="mt-1.5 text-sm leading-6 text-gray-600">
                  {brief.sections.pulse.summary}
                </p>
              ) : null}
            </section>
          ) : (
            <Link
              href="/workspace/analytics"
              className="block border border-kova-border bg-white px-4 py-3.5 text-sm transition hover:border-kova-green/40 sm:px-5"
            >
              <span className="font-semibold text-kova-dark">Reports</span>
              <span className="mt-0.5 block text-gray-500">
                Daily and weekly manager brief
              </span>
            </Link>
          )}

          <MetricStrip
            items={[
              {
                label: "Products",
                value: products.length,
                hint: `${activeProducts.length} active`,
                tone: "green",
              },
              {
                label: "Leads",
                value: leads.length,
                hint: `${newLeads.length} new`,
              },
              {
                label: "Posts",
                value: contents.length,
                hint: `${publishedContent.length} live · ${draftContent.length} draft`,
                tone: "orange",
              },
              {
                label: "Store",
                value: storeIsLive ? "Live" : "Draft",
                tone: storeIsLive ? "green" : "default",
              },
            ]}
          />

          {products.length > 0 ? (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-kova-dark">
                  Products
                </h2>
                <Link
                  href="/workspace/commerce/products"
                  className="text-sm font-semibold text-kova-green hover:underline"
                >
                  All
                </Link>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {products.slice(0, 4).map((product) => {
                  const plan = contentPlans[product.id];
                  const image =
                    product.images.find((i) => i.is_primary) ??
                    product.images[0];
                  return (
                    <Link
                      key={product.id}
                      href={`/workspace/commerce/products/${product.id}`}
                      className="group overflow-hidden rounded-md border border-kova-border/80 bg-white transition hover:border-kova-orange/50"
                    >
                      <div className="aspect-square max-h-36 bg-kova-background sm:max-h-none">
                        {image?.url ? (
                          <img
                            src={image.url}
                            alt={image.alt_text || product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-gray-400">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 sm:p-3">
                        <h3 className="line-clamp-2 text-sm font-semibold text-kova-dark">
                          {product.name}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-kova-orange">
                          {product.price
                            ? `${product.currency} ${product.price}`
                            : "Price on request"}
                        </p>
                        {plan && plan.scheduled > 0 ? (
                          <p className="mt-1 text-xs font-semibold text-kova-green">
                            Scheduled
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="border border-kova-border bg-white px-5 py-6">
              <p className="font-semibold text-kova-dark">No products yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Snap a photo to add your first listing.
              </p>
              <Link
                href="/workspace/commerce/snap-to-sell"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
              >
                Snap product
              </Link>
            </section>
          )}
        </div>
      </div>
    </WorkspacePageFrame>
  );
}
