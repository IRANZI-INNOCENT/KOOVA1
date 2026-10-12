"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { QuickLinks } from "@/components/ui/quick-links";
import { KovaStepsGuide } from "@/components/workspace/kova-steps-guide";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import {
  OverviewActionPanel,
  buildOverviewActions,
} from "@/components/workspace/overview-daily-panel";
import { ApiError } from "@/lib/api";
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
  const [contentPlans, setContentPlans] = useState<
    Record<number, ProductContentPlan>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [socialConnected, setSocialConnected] = useState(false);
  const [pendingSocialActions, setPendingSocialActions] = useState(0);

  useEffect(() => {
    if (
      workspaceLoading ||
      !businessId ||
      !accessToken
    ) {
      return;
    }

    const token = accessToken;
    const bizId = businessId;
    let cancelled = false;

    async function loadOverview() {
      try {
        setLoading(true);
        setError("");

        const [prods, page, contentList, leadList, plans, channels, social] =
          await Promise.all([
            getProducts(bizId, token),
            getCommercePage(bizId, token),
            getContents(bizId, token).catch(
              () => [] as Content[],
            ),
            getLeads(bizId, token).catch(
              () => [] as Lead[],
            ),
            getProductContentPlans(bizId, token).catch(
              () => [] as ProductContentPlan[],
            ),
            getConnectedChannels(bizId, token).catch(() => null),
            getSocialOverview(bizId, token).catch(() => null),
          ]);

        if (cancelled) {
          return;
        }

        setProducts(prods);
        setCommercePage(page);
        setContents(contentList);
        setLeads(leadList);
        setContentPlans(
          Object.fromEntries(plans.map((plan) => [plan.product_id, plan])),
        );
        setSocialConnected(!!channels?.connected);
        setPendingSocialActions(social?.pending_actions ?? 0);
      } catch (err) {
        if (cancelled) {
          return;
        }

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
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      cancelled = true;
    };
  }, [
    workspaceLoading,
    businessId,
    accessToken,
    router,
  ]);

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
  const draftProducts = products.filter((p) => p.status === "draft");
  const newLeads = leads.filter((l) => l.status === "new");
  const draftContent = contents.filter((c) => c.status === "draft");
  const approvedContent = contents.filter((c) => c.status === "approved");
  const publishedContent = contents.filter((c) => c.status === "published");
  const storeIsLive = !!commercePage?.is_published;
  const actionItems = buildOverviewActions({
    newLeads,
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

  return (
    <WorkspacePageFrame
      loading={workspaceLoading || loading}
      skeleton={<PageSkeleton />}
    >
      <div className={WORKSPACE_PAGE}>
        <div className="space-y-6">
          <PageHeader
            eyebrow="Overview"
            title={business?.name || "Your business"}
            description={
              user?.first_name
                ? `Welcome back, ${formatName(user.first_name)}. Kova works in three simple steps — connect, add products, create posts.`
                : "Kova works in three simple steps — connect, add products, create posts."
            }
            actions={
              storeIsLive && storeUrl ? (
                <div className="flex gap-2">
                  <a
                    href={storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-lg bg-kova-green px-4 text-sm font-bold text-white transition hover:bg-[#12563d]"
                  >
                    View store
                  </a>
                  <button
                    type="button"
                    onClick={copyStoreLink}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50"
                  >
                    {copied ? "Copied" : "Share link"}
                  </button>
                </div>
              ) : undefined
            }
          />

          <KovaStepsGuide
            title="Your first day"
            steps={[
              {
                letter: "A",
                title: "Connect social",
                description: "Facebook or Instagram — one-time setup.",
                href: "/workspace/social/channels",
                done: socialConnected,
              },
              {
                letter: "B",
                title: "Add a product",
                description: "Snap a photo or enter details manually.",
                href:
                  products.length > 0
                    ? "/workspace/commerce/products"
                    : "/workspace/commerce/snap-to-sell",
                done: products.length > 0,
              },
              {
                letter: "C",
                title: "Create your first post",
                description: "Product, tips, or a short video.",
                href: "/workspace/social/studio",
                done: publishedContent.length > 0,
              },
            ]}
          />

          <OverviewActionPanel items={actionItems} />

          <div className="h-px bg-kova-border" />

          {/* ──── Store link card (when published) ──── */}
          {storeIsLive && storeUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-kova-orange/40 bg-kova-orange/5 px-5 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kova-orange/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kova-orange"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-kova-dark">Your store is live</p>
                <p className="truncate text-xs text-gray-500">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}${storeUrl}`
                    : storeUrl}
                </p>
              </div>
              <button
                type="button"
                onClick={copyStoreLink}
                className="inline-flex h-8 shrink-0 items-center rounded-md bg-kova-orange px-3 text-xs font-bold text-kova-dark transition hover:bg-[#f0a46e]"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
          )}

          <MetricStrip
            items={[
              {
                label: "Products",
                value: products.length,
                hint: `${activeProducts.length} active · ${draftProducts.length} draft`,
                tone: "green",
              },
              {
                label: "Leads",
                value: leads.length,
                hint: `${newLeads.length} new · ${leads.filter((l) => l.created_by_ai).length} from Kova`,
              },
              {
                label: "Content",
                value: contents.length,
                hint: `${publishedContent.length} published · ${draftContent.length} draft`,
                tone: "orange",
              },
              {
                label: "Store",
                value: storeIsLive ? "Live" : "Draft",
                hint: storeIsLive ? "Customers can shop" : "Publish in Store tab",
                tone: storeIsLive ? "green" : "default",
              },
            ]}
          />

          <QuickLinks
            links={[
              { label: "Talk to Kova", href: "/workspace/kova", accent: "orange" },
              {
                label: "Snap a product",
                href: "/workspace/commerce/snap-to-sell",
                accent: "orange",
              },
              { label: "Social", href: "/workspace/social", accent: "green" },
              { label: "Settings", href: "/workspace/settings" },
            ]}
          />

          {/* ──── Recent products ──── */}
          {products.length > 0 && (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-kova-dark">
                  Recent products
                </h2>
                <Link
                  href="/workspace/commerce/products"
                  className="text-sm font-semibold text-kova-orange hover:underline"
                >
                  View all →
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
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
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
                        <p className="mt-1.5 text-sm font-bold text-kova-orange">
                          {product.price
                            ? `${product.currency} ${product.price}`
                            : "Price on request"}
                        </p>
                        {plan && plan.scheduled > 0 && (
                          <p className="mt-1.5 text-xs font-semibold text-kova-green">
                            Scheduled
                            {plan.next_at
                              ? ` · ${new Date(plan.next_at).toLocaleString()}`
                              : ""}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* ──── Empty state ──── */}
          {products.length === 0 && (
            <section className="rounded-lg border-2 border-dashed border-kova-orange/40 bg-kova-orange/5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-kova-orange/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-kova-orange"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
              </div>
              <p className="mt-4 text-lg font-semibold text-kova-dark">
                No products yet
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                Use Snap to Sell to photograph your first product, or add one
                manually.
              </p>
              <Link
                href="/workspace/commerce/snap-to-sell"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-kova-orange px-6 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
              >
                Add your first product
              </Link>
            </section>
          )}
        </div>
      </div>
    </WorkspacePageFrame>
  );
}

