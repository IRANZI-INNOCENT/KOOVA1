"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CatalogContentModal } from "@/components/workspace/catalog-content";
import { PageSkeleton } from "@/components/workspace/page-skeleton";
import { WorkspacePageFrame } from "@/components/workspace/workspace-page-frame";
import { ApiError } from "@/lib/api";
import {
  getProductContentPlans,
  getProducts,
  type Product,
  type ProductContentPlan,
} from "@/lib/commerce";
import { useWorkspace } from "@/lib/workspace-context";

export default function CommerceWorkspacePage() {
  const router = useRouter();
  const {
    business,
    businessId,
    accessToken,
    workspaceLoading,
  } = useWorkspace();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contentFocus, setContentFocus] = useState<Product | "all" | null>(null);
  const [plans, setPlans] = useState<Record<number, ProductContentPlan>>({});

  useEffect(() => {
    if (
      workspaceLoading ||
      !businessId ||
      !accessToken
    ) {
      return;
    }

    let cancelled = false;

    async function loadCommerce() {
      try {
        setError("");
        const [businessProducts, contentPlans] =
          await Promise.all([
            getProducts(businessId, accessToken),
            getProductContentPlans(
              businessId,
              accessToken,
            ).catch(
              () => [] as ProductContentPlan[],
            ),
          ]);

        if (cancelled) {
          return;
        }

        setProducts(businessProducts);
        setPlans(
          Object.fromEntries(
            contentPlans.map((plan) => [
              plan.product_id,
              plan,
            ]),
          ),
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load your Commerce workspace.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCommerce();

    return () => {
      cancelled = true;
    };
  }, [workspaceLoading, businessId, accessToken]);

  function openSnapToSell() {
    if (!business) {
      router.push("/workspace/setup");
      return;
    }
    router.push("/workspace/commerce/snap-to-sell");
  }

  const draftCount = products.filter((p) => p.status === "draft").length;
  const activeCount = products.filter((p) => p.status === "active").length;

  return (
    <WorkspacePageFrame
      loading={workspaceLoading || loading}
      skeleton={<PageSkeleton />}
    >
      <main className="min-h-screen bg-kova-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          {/* ──── Header ──── */}
          <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
                Commerce
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-kova-dark sm:text-3xl">
                Turn your products into sales.
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                Add your products once. Kova turns them into commerce assets
                that can power your storefront, content, conversations and
                future sales.
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-end">
              <button
                type="button"
                onClick={openSnapToSell}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-kova-orange px-5 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e] sm:w-auto"
              >
                Snap to Sell
              </button>
              <Link
                href="/workspace/commerce/orders"
                className="text-center text-sm font-semibold text-kova-orange"
              >
                View orders
              </Link>
            </div>
          </header>

          <div className="mt-6 h-px bg-kova-border" />

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* ──── No business state ──── */}
          {!business && !error && (
            <section className="mt-6 overflow-hidden rounded-lg border border-kova-border bg-white">
              <div className="grid gap-0 lg:grid-cols-[1.4fr_0.6fr]">
                <div className="p-7 sm:p-9">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-kova-orange">
                    First step
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-kova-dark">
                    Set up your business before adding products.
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-gray-600">
                    Kova needs to know which business owns your products. Once
                    configured, you can photograph your stock and let Kova build
                    the product assets for you.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/workspace/setup")}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-kova-green px-5 text-sm font-bold text-white transition hover:bg-[#12563d]"
                  >
                    Set up my business
                  </button>
                </div>
                <div className="border-t border-kova-border bg-kova-orange/5 p-7 sm:p-9 lg:border-l lg:border-t-0">
                  <p className="text-sm font-bold text-kova-dark">
                    What happens next?
                  </p>
                  <ol className="mt-4 space-y-4">
                    {[
                      "Tell Kova about your business.",
                      "Snap a photo of your product.",
                      "Kova understands the product.",
                      "Review the generated product draft.",
                    ].map((step, i) => (
                      <li key={step} className="flex gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kova-orange/15 text-xs font-bold text-kova-orange">
                          {i + 1}
                        </span>
                        <span className="pt-1 text-sm leading-5 text-gray-600">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </section>
          )}

          {/* ──── Business commerce ──── */}
          {business && (
            <>
              {/* Business context */}
              <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-kova-dark">
                    {business.name}
                  </p>
                  {business.location && (
                    <p className="text-xs text-gray-500">{business.location}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openSnapToSell}
                  className="text-sm font-semibold text-kova-orange hover:underline"
                >
                  Add another product
                </button>
              </div>

              {/* Metrics */}
              <div className="mt-5 grid gap-px overflow-hidden rounded-lg border border-kova-border bg-kova-border sm:grid-cols-3">
                <MetricCard label="Products" value={products.length} color="green" />
                <MetricCard label="Drafts" value={draftCount} color="default" />
                <MetricCard label="Active" value={activeCount} color="orange" />
              </div>

              {/* Catalog */}
              <section className="mt-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-kova-orange">
                      Product catalog
                    </p>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight text-kova-dark">
                      Your business assets
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Products here can power Kova's Commerce and Social
                      experiences.
                    </p>
                  </div>
                  {products.length > 0 && (
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => setContentFocus("all")}
                        className="inline-flex h-9 items-center rounded-md bg-kova-green px-3 text-xs font-bold text-white"
                      >
                        Content for all products
                      </button>
                      <button
                        type="button"
                        onClick={openSnapToSell}
                        className="hidden text-sm font-semibold text-kova-orange hover:underline sm:block"
                      >
                        Snap a product
                      </button>
                    </div>
                  )}
                </div>

                {products.length === 0 ? (
                  <EmptyCatalog onSnap={openSnapToSell} />
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {products.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={() =>
                          router.push(
                            `/workspace/commerce/products/${product.id}`,
                          )
                        }
                        onContent={() => setContentFocus(product)}
                        plan={plans[product.id]}
                      />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
        {business && contentFocus && accessToken && (
          <CatalogContentModal
            businessId={business.id}
            token={accessToken}
            products={products}
            plans={plans}
            focus={contentFocus === "all" ? null : contentFocus}
            onClose={() => setContentFocus(null)}
            onChanged={() => {
              if (!accessToken || !business) return;
              getProductContentPlans(business.id, accessToken)
                .then((contentPlans) =>
                  setPlans(Object.fromEntries(contentPlans.map((plan) => [plan.product_id, plan]))),
                )
                .catch(() => undefined);
            }}
          />
        )}
      </main>
    </WorkspacePageFrame>
  );
}

/* ───── Metric card ───── */

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
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
    </div>
  );
}

/* ───── Empty catalog ───── */

function EmptyCatalog({ onSnap }: { onSnap: () => void }) {
  return (
    <div className="mt-5 rounded-lg border-2 border-dashed border-kova-orange/40 bg-kova-orange/5 p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-kova-orange/20">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-kova-orange"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-kova-dark">
        Start with your first product
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        Take one product photo and give Kova the basic commercial information.
        Kova will create a draft product asset for you.
      </p>
      <button
        type="button"
        onClick={onSnap}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-kova-orange px-5 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
      >
        Snap your first product
      </button>
    </div>
  );
}

/* ───── Product card ───── */

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600" },
  active: { bg: "bg-kova-green/10", text: "text-kova-green" },
  archived: { bg: "bg-gray-100", text: "text-gray-400" },
};

function ProductCard({
  product,
  onClick,
  onContent,
  plan,
}: {
  product: Product;
  onClick: () => void;
  onContent: () => void;
  plan?: ProductContentPlan;
}) {
  const image =
    product.images?.find((item) => item.is_primary) ?? product.images?.[0];
  const badge = STATUS_BADGE[product.status] ?? STATUS_BADGE.draft;

  return (
    <article className="group overflow-hidden rounded-lg border border-kova-border bg-white text-left transition hover:-translate-y-0.5 hover:border-kova-orange/50 hover:shadow-sm">
      <button type="button" onClick={onClick} className="block w-full text-left">
      <div className="aspect-square bg-kova-background">
        {image?.url || image?.image ? (
          <img
            src={image.url || image.image}
            alt={image.alt_text || product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-sm font-semibold text-kova-dark">
            {product.name}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badge.bg} ${badge.text}`}
          >
            {product.status}
          </span>
        </div>
        {product.category && (
          <p className="mt-1.5 text-xs text-gray-500">{product.category}</p>
        )}
        {product.price !== null && (
          <p className="mt-2 text-sm font-bold text-kova-orange">
            {product.currency} {product.price}
          </p>
        )}
        {plan && plan.scheduled > 0 && (
          <p className="mt-2 text-xs font-semibold text-kova-green">
            Scheduled
            {plan.next_at ? ` · ${new Date(plan.next_at).toLocaleString()}` : ""}
          </p>
        )}
        {plan && plan.scheduled === 0 && plan.generated > plan.published && (
          <p className="mt-2 text-xs font-semibold text-kova-orange">Content ready</p>
        )}
        {plan && plan.scheduled === 0 && plan.generated > 0 && plan.generated === plan.published && (
          <p className="mt-2 text-xs font-semibold text-gray-400">Content published</p>
        )}
      </div>
      </button>
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onContent}
          className="inline-flex h-8 items-center rounded-md bg-kova-orange/15 px-2.5 text-xs font-bold text-kova-dark"
        >
          Create content
        </button>
      </div>
    </article>
  );
}
