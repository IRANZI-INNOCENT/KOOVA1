"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { ApiError } from "@/lib/api";
import { generateBrief, getLatestBrief } from "@/lib/brief";
import {
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

function localDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function ensureTodayBrief(businessId: number, token: string) {
  const today = localDate();
  const key = `kova-brief-auto-${businessId}-${today}`;
  if (sessionStorage.getItem(key) === "1") return;
  try {
    const latest = await getLatestBrief(businessId, token);
    if (
      latest.date === today &&
      (latest.status === "ready" || latest.status === "generating")
    ) {
      return;
    }
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) return;
  }
  sessionStorage.setItem(key, "1");
  await generateBrief(businessId, token).catch(() => undefined);
}

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

        const [prods, page, contentList, leadList, plans] =
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
        void ensureTodayBrief(
          bizId,
          token,
        );
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
  const publishedContent = contents.filter((c) => c.status === "published");
  const storeIsLive = !!commercePage?.is_published;
  const storeUrl = commercePage?.slug
    ? `/store/${commercePage.slug}`
    : null;

  return (
    <WorkspacePageFrame
      loading={workspaceLoading || loading}
      skeleton={<PageSkeleton />}
    >
      <div className="p-4 sm:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* ──── Header ──── */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
                Overview
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-kova-dark sm:text-3xl">
                {business?.name || "Your business"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {user?.first_name
                  ? `Welcome back, ${formatName(user.first_name)}.`
                  : "Welcome back."}{" "}
                Here is what is happening with your business.
              </p>
            </div>
            {storeIsLive && storeUrl && (
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
                  {copied ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-kova-green"><polyline points="20 6 9 17 4 12" /></svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                      Share link
                    </>
                  )}
                </button>
              </div>
            )}
          </header>

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

          {/* ──── Stats ──── */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-kova-border bg-kova-border sm:grid-cols-4">
            <StatCell
              label="Products"
              value={String(products.length)}
              detail={`${activeProducts.length} active · ${draftProducts.length} draft`}
              color="green"
            />
            <StatCell
              label="Leads"
              value={String(leads.length)}
              detail={`${newLeads.length} new · ${leads.filter((l) => l.created_by_ai).length} from Kova`}
              color="default"
            />
            <StatCell
              label="Content"
              value={String(contents.length)}
              detail={`${publishedContent.length} published · ${draftContent.length} draft`}
              color="orange"
            />
            <StatCell
              label="Store"
              value={storeIsLive ? "Live" : "Draft"}
              detail={storeIsLive ? "Customers can shop" : "Publish to go live"}
              color={storeIsLive ? "green" : "default"}
            />
          </div>

          {/* ──── Quick actions ──── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ActionCard
              label="Talk to Kova"
              description="Ask Kova about products, content, or customers."
              href="/workspace/kova"
              variant="orange"
            />
            <ActionCard
              label="Snap to Sell"
              description="Photograph a product and list it for sale."
              href="/workspace/commerce/snap-to-sell"
              variant="orange"
            />
            <ActionCard
              label="Social"
              description="Create content and manage social channels."
              href="/workspace/social"
              variant="green"
            />
            <ActionCard
              label="Settings"
              description="Business Brain, goals, and policies."
              href="/workspace/settings"
              variant="default"
            />
          </div>

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

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {products.slice(0, 4).map((product) => {
                  const plan = contentPlans[product.id];
                  const image =
                    product.images.find((i) => i.is_primary) ??
                    product.images[0];
                  return (
                    <Link
                      key={product.id}
                      href={`/workspace/commerce/products/${product.id}`}
                      className="group overflow-hidden rounded-lg border border-kova-border bg-white transition hover:-translate-y-0.5 hover:border-kova-orange/50 hover:shadow-sm"
                    >
                      <div className="aspect-[4/3] bg-kova-background">
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
                      <div className="p-3.5">
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

/* ───── Stat cell ───── */

function StatCell({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  color: "green" | "orange" | "default";
}) {
  const valueColor =
    color === "green"
      ? "text-kova-green"
      : color === "orange"
        ? "text-kova-orange"
        : "text-kova-dark";
  return (
    <div className="bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

/* ───── Action card ───── */

function ActionCard({
  label,
  description,
  href,
  variant,
}: {
  label: string;
  description: string;
  href: string;
  variant: "orange" | "green" | "default";
}) {
  const border =
    variant === "orange"
      ? "border-kova-orange/40 hover:border-kova-orange"
      : variant === "green"
        ? "border-kova-green/30 hover:border-kova-green"
        : "border-kova-border hover:border-gray-300";
  const titleColor =
    variant === "orange"
      ? "text-kova-orange"
      : variant === "green"
        ? "text-kova-green"
        : "text-kova-dark";
  return (
    <Link
      href={href}
      className={`block rounded-lg border bg-white px-4 py-3.5 transition-colors ${border}`}
    >
      <p className={`text-sm font-bold ${titleColor}`}>{label}</p>
      <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
    </Link>
  );
}
