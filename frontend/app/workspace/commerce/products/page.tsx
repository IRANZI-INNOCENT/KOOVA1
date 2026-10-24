"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { ListSkeleton } from "@/components/workspace/page-skeleton";
import { ApiError } from "@/lib/api";
import {
  createBroadcastPack,
  deleteProduct,
  getProducts,
  peekProducts,
  type BroadcastPack,
  type Product,
} from "@/lib/commerce";
import { useWorkspace } from "@/lib/workspace-context";

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600" },
  active: { bg: "bg-kova-green/10", text: "text-kova-green" },
  archived: { bg: "bg-gray-100", text: "text-gray-400" },
};

export default function ProductsPage() {
  const { businessId, accessToken, workspaceLoading } = useWorkspace();
  const [products, setProducts] = useState<Product[]>(
    () => (businessId ? peekProducts(businessId) : undefined) ?? [],
  );
  const [loading, setLoading] = useState(
    () => !(businessId && peekProducts(businessId)),
  );
  const [error, setError] = useState("");
  const [broadcast, setBroadcast] = useState<BroadcastPack | null>(null);
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (workspaceLoading) {
      return;
    }
    if (!businessId || !accessToken) {
      setLoading(false);
      return;
    }

    const token = accessToken;
    const bizId = businessId;
    const cached = peekProducts(bizId);
    if (cached) {
      setProducts(cached);
      setLoading(false);
    }
    let cancelled = false;

    async function load() {
      try {
        const list = await getProducts(bizId, token);
        if (!cancelled) setProducts(list);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not load products.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspaceLoading, businessId, accessToken]);

  const storePath = products.find((item) => item.store_path)?.store_path;

  async function shareTodaysStock() {
    if (!businessId || !accessToken) return;
    setBroadcastBusy(true);
    setBroadcastNotice("");
    setError("");
    try {
      const pack = await createBroadcastPack(businessId, accessToken);
      setBroadcast(pack);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not build share drafts.",
      );
    } finally {
      setBroadcastBusy(false);
    }
  }

  async function removeProduct(product: Product) {
    if (!businessId || !accessToken || deletingId != null) return;
    const confirmed = window.confirm(
      `Delete ${product.name}? It will be removed from your shop.`,
    );
    if (!confirmed) return;
    setDeletingId(product.id);
    setError("");
    try {
      await deleteProduct(businessId, product.id, accessToken);
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not delete this product.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setBroadcastNotice(`${label} copied.`);
    } catch {
      setError("Could not copy.");
    }
  }

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Link
            href="/workspace/commerce/snap-to-sell"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-kova-orange px-4 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e] sm:h-10 sm:w-auto"
          >
            Add listing
          </Link>
          <button
            type="button"
            onClick={() => void shareTodaysStock()}
            disabled={broadcastBusy}
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark disabled:opacity-60 sm:h-10 sm:w-auto"
          >
            {broadcastBusy ? "Building…" : "Share today’s list"}
          </button>
          {storePath ? (
            <a
              href={storePath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50 sm:h-10 sm:w-auto"
            >
              View store
            </a>
          ) : null}
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        ) : null}

        {broadcastNotice ? (
          <p className="text-xs font-medium text-kova-green">{broadcastNotice}</p>
        ) : null}

        {broadcast ? (
          <div className="space-y-3 rounded-lg border border-kova-border bg-white p-4">
            <p className="text-sm font-semibold text-kova-dark">
              Share drafts · {broadcast.product_count} products
            </p>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-gray-500">WhatsApp Status</p>
                <button
                  type="button"
                  onClick={() => copyText("Status", broadcast.status_text)}
                  className="text-xs font-semibold text-kova-green"
                >
                  Copy
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-kova-dark">
                {broadcast.status_text}
              </p>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-gray-500">Group message</p>
                <button
                  type="button"
                  onClick={() => copyText("Group message", broadcast.group_text)}
                  className="text-xs font-semibold text-kova-green"
                >
                  Copy
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-kova-dark">
                {broadcast.group_text}
              </p>
            </div>
          </div>
        ) : null}

        {loading && products.length === 0 ? (
          <ListSkeleton rows={4} />
        ) : products.length ? (
          <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_140px_120px_120px_88px] gap-4 border-b border-kova-border px-5 py-3 text-xs font-medium text-gray-500 md:grid">
              <span>Product</span>
              <span>Price</span>
              <span>Status</span>
              <span>AI</span>
              <span />
            </div>
            {products.map((product) => {
              const image =
                product.images.find((item) => item.is_primary) ??
                product.images[0];
              const badge = STATUS_BADGE[product.status] ?? STATUS_BADGE.draft;
              return (
                <div
                  key={product.id}
                  className="grid grid-cols-1 items-center gap-3 border-b border-kova-border px-4 py-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_140px_120px_120px_88px] md:gap-4 md:px-5"
                >
                <Link
                  href={`/workspace/commerce/products/${product.id}`}
                  className="contents"
                >
                  <div className="flex min-w-0 items-center gap-4 transition hover:opacity-80">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-kova-background">
                      {image?.url ? (
                        <img
                          src={image.url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-kova-dark">
                        {product.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {product.offering_kind === "service" ? "Service" : "Product"}
                        {product.category ? ` · ${product.category}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-kova-dark md:hidden">
                        {product.price
                          ? `${product.currency} ${product.price}`
                          : "—"}
                        <span className="ml-2 text-xs text-gray-500">
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
                    <span className={`text-xs font-medium ${badge.text}`}>
                      {product.status}
                    </span>
                  </span>
                  <span className="hidden text-xs text-gray-500 md:block">
                    {product.ai_generated ? "Understood" : "Manual"}
                  </span>
                </Link>
                  <button
                    type="button"
                    onClick={() => void removeProduct(product)}
                    disabled={deletingId === product.id}
                    className="inline-flex h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 md:h-9"
                  >
                    {deletingId === product.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-kova-border bg-white px-5 py-6">
            <p className="font-semibold text-kova-dark">No products yet</p>
            <Link
              href="/workspace/commerce/snap-to-sell"
              className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark hover:bg-[#f0a46e] sm:h-10 sm:w-auto"
            >
              Add listing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
