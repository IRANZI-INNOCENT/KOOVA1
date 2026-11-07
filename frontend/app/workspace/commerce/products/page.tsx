"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { ApiError, authenticatedApiRequest } from "@/lib/api";
import {
  createBroadcastPack,
  deleteProduct,
  getProducts,
  invalidateCommerceCaches,
  peekProducts,
  updateProduct,
  type BroadcastPack,
  type Product,
} from "@/lib/commerce";
import { useWorkspace } from "@/lib/workspace-context";

function wholeShillings(price: string | null, currency: string) {
  if (!price) return "—";
  const amount = Number(price);
  if (!Number.isFinite(amount)) return `${currency} ${price}`;
  return `${currency} ${Math.round(amount).toLocaleString()}`;
}

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
  const [open, setOpen] = useState<Product | null>(null);

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
      setOpen((current) => (current?.id === product.id ? null : current));
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
            href="/workspace/commerce/snap-to-sell?entry=manual"
            data-coach="product"
            data-coach-priority="page"
            className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-kova-orange px-4 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e] sm:h-10 sm:w-auto"
          >
            Add listing
          </Link>
          <button
            type="button"
            onClick={() => void shareTodaysStock()}
            disabled={broadcastBusy}
            title="Writes a WhatsApp status and a group message from what is in stock."
            className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark disabled:opacity-60 sm:h-10 sm:w-auto"
          >
            {broadcastBusy ? "Building…" : "Copy today’s stock message"}
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

        <p className="text-xs leading-5 text-gray-500">
          Copy today’s stock message writes a WhatsApp status and a group
          message from what is in stock.
        </p>

        {products.length ? (
          <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_88px_88px] gap-4 border-b border-kova-border px-5 py-3 text-xs font-medium text-gray-500 md:grid">
              <span>Listing</span>
              <span>Price</span>
              <span>Stock</span>
              <span />
            </div>
            {products.map((product) => {
              const image =
                product.images.find((item) => item.is_primary) ??
                product.images[0];
              const nameKey = product.name.trim().toLowerCase();
              const duplicate =
                nameKey.length > 0 &&
                products.filter(
                  (item) => item.name.trim().toLowerCase() === nameKey,
                ).length > 1;
              const stockLabel =
                product.offering_kind === "service" || product.stock == null
                  ? "—"
                  : String(product.stock);
              return (
                <div
                  key={product.id}
                  onClick={() => setOpen(product)}
                  className="grid cursor-pointer grid-cols-1 items-center gap-3 border-b border-kova-border px-4 py-4 last:border-b-0 hover:bg-kova-background md:grid-cols-[minmax(0,1fr)_120px_88px_88px] md:gap-4 md:px-5"
                >
                  <div className="flex min-w-0 items-center gap-4">
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
                      {duplicate ? (
                        <p className="mt-0.5 text-xs font-medium text-kova-orange">
                          Duplicate name
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-kova-dark md:hidden">
                        {wholeShillings(product.price, product.currency)}
                        {stockLabel !== "—" ? ` · ${stockLabel} in stock` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="hidden text-sm font-semibold text-kova-dark md:block">
                    {wholeShillings(product.price, product.currency)}
                  </span>
                  <span className="hidden text-sm text-kova-dark md:block">
                    {stockLabel}
                  </span>
                  <div
                    className="justify-self-start md:justify-self-end"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => void removeProduct(product)}
                      disabled={deletingId === product.id}
                      className="text-sm font-semibold text-red-700 disabled:opacity-60"
                    >
                      {deletingId === product.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="border border-kova-border bg-white px-5 py-6">
            <p className="font-semibold text-kova-dark">No products yet</p>
            <Link
              href="/workspace/commerce/snap-to-sell"
              className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark hover:bg-[#f0a46e] sm:h-10 sm:w-auto"
            >
              Add listing
            </Link>
          </div>
        ) : null}

        {open && businessId && accessToken ? (
          <ProductDialog
            product={open}
            businessId={businessId}
            token={accessToken}
            onClose={() => setOpen(null)}
            onSaved={(updated) => {
              setProducts((current) =>
                current.map((item) => (item.id === updated.id ? updated : item)),
              );
              setOpen(updated);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function ProductDialog({
  product,
  businessId,
  token,
  onClose,
  onSaved,
}: {
  product: Product;
  businessId: number;
  token: string;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(product.price ?? "");
  const [stock, setStock] = useState(
    product.stock == null ? "" : String(product.stock),
  );
  const [size, setSize] = useState(product.size);
  const [color, setColor] = useState(product.color);
  const [shortDescription, setShortDescription] = useState(product.short_description);
  const [description, setDescription] = useState(product.description);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isService = product.offering_kind === "service";
  const image =
    product.images.find((item) => item.is_primary) ?? product.images[0];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving && !posting) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, posting, saving]);

  useEffect(() => {
    setName(product.name);
    setPrice(product.price ?? "");
    setStock(product.stock == null ? "" : String(product.stock));
    setSize(product.size);
    setColor(product.color);
    setShortDescription(product.short_description);
    setDescription(product.description);
  }, [product]);

  function payload(): Partial<Product> {
    const parsedStock = stock.trim() === "" ? null : Number(stock);
    return {
      name: name.trim(),
      price: price.trim() || null,
      stock: isService || parsedStock == null || !Number.isFinite(parsedStock) ? null : parsedStock,
      size,
      color,
      short_description: shortDescription,
      description,
    };
  }

  async function save(): Promise<Product | null> {
    if (!name.trim()) {
      setError("Add a name before saving.");
      return null;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateProduct(businessId, product.id, token, payload());
      invalidateCommerceCaches(businessId);
      onSaved(updated);
      setNotice("Listing saved.");
      return updated;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the listing.");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function writeAndPost() {
    if (posting || saving) return;
    setPosting(true);
    setError("");
    setNotice("");
    try {
      const saved = await save();
      if (!saved) return;
      setNotice("KCOVA is writing the post…");
      const result = await authenticatedApiRequest<{
        pieces?: { id: number }[];
      }>(`/content/${businessId}/campaign/`, token, {
        method: "POST",
        body: JSON.stringify({
          product_id: product.id,
          platform: "all",
          note: `Create a post that can sell ${saved.name}.`,
        }),
      });
      const pieces = result.pieces ?? [];
      if (pieces.length === 0) {
        setError("KCOVA did not return a post. Connect Facebook or Instagram first.");
        setNotice("");
        return;
      }
      setNotice("Sending the post…");
      for (const piece of pieces) {
        await authenticatedApiRequest(
          `/content/${businessId}/${piece.id}/publish/`,
          token,
          { method: "POST" },
        );
      }
      setNotice(
        pieces.length === 1
          ? "KCOVA wrote the post and sent it."
          : `KCOVA wrote ${pieces.length} posts and sent them.`,
      );
    } catch (err) {
      setNotice("");
      setError(
        err instanceof ApiError ? err.message : "KCOVA could not write and send the post.",
      );
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-kova-dark/50 p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!saving && !posting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg bg-white shadow-sm sm:rounded-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-kova-border px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {isService ? "Service" : "Product"}
            </p>
            <h2 id="product-dialog-title" className="mt-1 truncate text-base font-semibold text-kova-dark">
              {product.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving || posting}
            className="shrink-0 text-sm font-semibold text-gray-400 disabled:opacity-50"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="flex gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-kova-background">
              {image?.url ? (
                <img src={image.url} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <p className="text-sm text-gray-500">
              {wholeShillings(product.price, product.currency)}
              {product.category ? ` · ${product.category}` : ""}
            </p>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="text-sm font-medium text-kova-green">{notice}</p>
          ) : null}

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-500">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-kova-border px-3 py-2 text-sm"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500">
                Price ({product.currency || "KES"})
              </span>
              <input
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                inputMode="decimal"
                className="w-full rounded-md border border-kova-border px-3 py-2 text-sm"
              />
            </label>
            {isService ? null : (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-gray-500">Stock</span>
                <input
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-md border border-kova-border px-3 py-2 text-sm"
                />
              </label>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500">Size</span>
              <input
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className="w-full rounded-md border border-kova-border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-gray-500">Color</span>
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="w-full rounded-md border border-kova-border px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-500">Short description</span>
            <textarea
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              rows={3}
              className="w-full rounded-md border border-kova-border px-3 py-2 text-sm leading-6"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-gray-500">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              className="w-full rounded-md border border-kova-border px-3 py-2 text-sm leading-6"
            />
          </label>
          {product.selling_points?.length ? (
            <div>
              <p className="text-xs font-medium text-gray-500">Selling points</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-kova-dark">
                {product.selling_points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-t border-kova-border px-5 py-4 sm:flex-row">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || posting}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-kova-border px-4 text-sm font-semibold text-kova-dark disabled:opacity-60"
          >
            {saving && !posting ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void writeAndPost()}
            disabled={saving || posting}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-kova-green px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {posting ? "Working…" : "Write and post"}
          </button>
        </div>
      </div>
    </div>
  );
}
