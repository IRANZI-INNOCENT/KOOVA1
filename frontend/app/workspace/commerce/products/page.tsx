"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/workspace/page-skeleton";
import { ApiError } from "@/lib/api";
import { getProducts, type Product } from "@/lib/commerce";
import { useWorkspace } from "@/lib/workspace-context";

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600" },
  active: { bg: "bg-kova-green/10", text: "text-kova-green" },
  archived: { bg: "bg-gray-100", text: "text-gray-400" },
};

export default function ProductsPage() {
  const {
    businessId,
    accessToken,
    workspaceLoading,
  } = useWorkspace();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    async function load() {
      try {
        const list = await getProducts(
          bizId,
          token,
        );
        if (!cancelled) {
          setProducts(list);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load products.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceLoading, businessId, accessToken]);

  const storePath = products.find((item) => item.store_path)?.store_path;

  if (workspaceLoading || loading) {
    return (
      <div className={WORKSPACE_PAGE}>
        <ListSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="space-y-6">
          <PageHeader
            eyebrow="Products"
            title="Your catalog"
            description="Tap a product to edit price, photos, and status."
            actions={
              <div className="flex flex-wrap gap-2">
                {storePath && (
                  <a
                    href={storePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50"
                  >
                    View store
                  </a>
                )}
                <Link
                  href="/workspace/commerce/snap-to-sell"
                  className="inline-flex h-10 items-center rounded-lg bg-kova-orange px-4 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
                >
                  Snap a product
                </Link>
              </div>
            }
          />

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* ──── Product table ──── */}
          {products.length ? (
            <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
              <div className="hidden grid-cols-[minmax(0,1fr)_140px_120px_120px] gap-4 border-b border-kova-border bg-kova-orange/5 px-5 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 md:grid">
                <span>Product</span>
                <span>Price</span>
                <span>Status</span>
                <span>AI</span>
              </div>
              {products.map((product) => {
                const image =
                  product.images.find((item) => item.is_primary) ??
                  product.images[0];
                const badge =
                  STATUS_BADGE[product.status] ?? STATUS_BADGE.draft;
                return (
                  <Link
                    key={product.id}
                    href={`/workspace/commerce/products/${product.id}`}
                    className="grid grid-cols-1 items-center gap-3 border-b border-kova-border px-4 py-4 last:border-b-0 transition hover:bg-kova-orange/5 md:grid-cols-[minmax(0,1fr)_140px_120px_120px] md:gap-4 md:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-kova-background">
                        {image?.url && (
                          <img
                            src={image.url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-kova-dark">
                          {product.name}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {product.category || "Uncategorized"}
                        </p>
                        <p className="mt-1 text-sm text-kova-dark md:hidden">
                          {product.price
                            ? `${product.currency} ${product.price}`
                            : "—"}
                          <span className="ml-2 text-xs uppercase tracking-wide text-gray-500">
                            {product.status}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="hidden text-sm font-semibold text-kova-dark md:block">
                      {product.price
                        ? `${product.currency} ${product.price}`
                        : "—"}
                    </span>
                    <span className="hidden md:block">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badge.bg} ${badge.text}`}
                      >
                        {product.status}
                      </span>
                    </span>
                    <span className="hidden text-xs font-semibold text-kova-orange md:block">
                      {product.ai_generated ? "Understood" : "Manual"}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-sm text-gray-500">
              <p className="font-medium text-kova-dark">No products yet</p>
              <Link
                href="/workspace/commerce/snap-to-sell"
                className="mt-2 inline-block font-semibold text-kova-green hover:underline"
              >
                Snap your first product →
              </Link>
            </div>
          )}
        </div>
    </div>
  );
}
