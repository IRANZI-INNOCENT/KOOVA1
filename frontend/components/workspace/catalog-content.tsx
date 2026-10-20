"use client";

import { useState } from "react";

import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { type Product, type ProductContentPlan } from "@/lib/commerce";

type PlatformChoice = "all" | "facebook" | "instagram";

type Piece = {
  id: number;
  platform: string;
  content_type: string;
  caption: string;
  product_name: string;
  status: string;
};

type Scheduled = {
  content_id: number;
  platform: string;
  content_type: string;
  product_name: string;
  scheduled_at: string;
  reason: string;
};

export function CatalogContentModal({
  businessId,
  token,
  products,
  plans,
  focus,
  onClose,
  onChanged,
}: {
  businessId: number;
  token: string;
  products: Product[];
  plans: Record<number, ProductContentPlan>;
  focus: Product | null;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [platform, setPlatform] = useState<PlatformChoice>("all");
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [progress, setProgress] = useState("");
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function isPlanned(product: Product) {
    const plan = plans[product.id];
    if (!plan) return false;
    return plan.scheduled > 0 || plan.generated > plan.published;
  }

  const focusPlan = focus ? plans[focus.id] : undefined;
  const focusBlocked = Boolean(focus && isPlanned(focus));
  const waiting = focus
    ? []
    : products.filter((product) => product.status === "active" && isPlanned(product));
  const targets = focus
    ? focusBlocked
      ? []
      : [focus]
    : products.filter((product) => product.status === "active" && !isPlanned(product));

  async function generate() {
    setBusy(true);
    setError("");
    setPieces([]);
    setScheduled([]);
    setDone(0);
    setTotal(targets.length);
    const collected: Piece[] = [];
    try {
      for (let index = 0; index < targets.length; index += 1) {
        const product = targets[index];
        setDone(index);
        setProgress(`Writing for ${product.name}`);
        const result = await authenticatedApiRequest<{
          product_name?: string;
          pieces: Array<Omit<Piece, "product_name">>;
        }>(`/content/${businessId}/campaign/`, token, {
          method: "POST",
          body: JSON.stringify({
            product_id: product.id,
            platform,
            note: `Create posts that can sell ${product.name}.`,
          }),
        });
        for (const piece of result.pieces || []) {
          collected.push({
            ...piece,
            product_name: result.product_name || product.name,
          });
        }
        setPieces([...collected]);
        setDone(index + 1);
      }
      if (collected.length === 0) {
        setError("Kova did not return any posts. Connect Facebook or Instagram first.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kova could not write the posts.");
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  async function publishNow() {
    setBusy(true);
    setError("");
    setDone(0);
    setTotal(pieces.length);
    try {
      for (let index = 0; index < pieces.length; index += 1) {
        const piece = pieces[index];
        setDone(index);
        setProgress(`Publishing ${piece.product_name}`);
        setPieces((current) =>
          current.map((item) =>
            item.id === piece.id ? { ...item, status: "publishing" } : item,
          ),
        );
        await authenticatedApiRequest(
          `/content/${businessId}/${piece.id}/publish/`,
          token,
          { method: "POST" },
        );
        setPieces((current) =>
          current.map((item) =>
            item.id === piece.id ? { ...item, status: "published" } : item,
          ),
        );
        setDone(index + 1);
      }
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "A post could not be published.");
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  async function schedule() {
    setBusy(true);
    setError("");
    setDone(0);
    setTotal(1);
    setProgress("Kova is choosing when each post should go out.");
    try {
      const result = await authenticatedApiRequest<{ scheduled: Scheduled[] }>(
        `/content/${businessId}/schedule/`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ content_ids: pieces.map((piece) => piece.id) }),
        },
      );
      setScheduled(result.scheduled);
      setDone(1);
      onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kova could not schedule the posts.");
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-content-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white shadow-sm"
      >
      <div className="overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-gray-500">
              Content
            </p>
            <h2 id="catalog-content-title" className="mt-1 text-lg font-semibold text-kova-dark">
              {focus ? focus.name : "Every active product"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {focus
                ? "Kova writes posts for this product. You can publish them now or let Kova place them on the calendar."
                : `${targets.length} active product${targets.length === 1 ? "" : "s"} still need content. Products that already have posts stay as they are.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-gray-400"
          >
            Close
          </button>
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-xs font-medium text-gray-400">
            Platform
          </span>
          <select
            value={platform}
            onChange={(event) => setPlatform(event.target.value as PlatformChoice)}
            disabled={busy || pieces.length > 0}
            className="h-10 w-full rounded-md border border-kova-border px-3"
          >
            <option value="all">All connected accounts</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
          </select>
        </label>

        {focusBlocked && focusPlan && (
          <p className="mt-4 rounded-lg border border-kova-green/30 bg-kova-green/5 px-3 py-2 text-sm text-kova-dark">
            {focusPlan.scheduled > 0
              ? `Already scheduled${focusPlan.next_at ? ` for ${new Date(focusPlan.next_at).toLocaleString()}` : ""}. A new set would overlap this plan.`
              : "Content is already written for this product and has not all gone out yet."}
          </p>
        )}
        {waiting.length > 0 && (
          <ul className="mt-4 space-y-1">
            {waiting.map((product) => {
              const plan = plans[product.id];
              return (
                <li key={product.id} className="text-sm text-gray-600">
                  {product.name}
                  {plan?.scheduled
                    ? ` · scheduled${plan.next_at ? ` ${new Date(plan.next_at).toLocaleString()}` : ""}`
                    : " · content ready"}
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {pieces.length > 0 && (
          <ul className="mt-4 space-y-2">
            {pieces.map((piece) => (
              <li key={piece.id} className="rounded-md border border-kova-border px-3 py-2">
                <p className="text-xs font-medium text-gray-500">
                  {piece.product_name} · {piece.platform} · {piece.content_type}
                  {piece.status === "publishing" ? " · publishing" : ""}
                  {piece.status === "published" ? " · published" : ""}
                </p>
                <p className="mt-1 line-clamp-3 text-sm leading-5 text-kova-dark">{piece.caption}</p>
              </li>
            ))}
          </ul>
        )}

        {scheduled.length > 0 && (
          <ul className="mt-4 space-y-2">
            {scheduled.map((item) => (
              <li key={item.content_id} className="rounded-md bg-kova-orange/10 px-3 py-2 text-sm">
                <p className="font-semibold text-kova-dark">
                  {item.product_name} · {item.platform} · {new Date(item.scheduled_at).toLocaleString()}
                </p>
                {item.reason && <p className="mt-1 text-gray-600">{item.reason}</p>}
              </li>
            ))}
          </ul>
        )}

      </div>
      <div className="shrink-0 border-t border-kova-border bg-white p-5">
        {busy && (
          <div className="mb-4 rounded-lg border border-kova-orange/40 bg-kova-orange/10 px-3 py-3">
            <div className="flex items-center gap-3">
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-kova-orange border-t-transparent" />
              <p className="text-sm font-semibold text-kova-dark">
                {progress || "Kova is working"}
                {total > 0 ? ` · ${Math.min(done + 1, total)} of ${total}` : ""}
              </p>
            </div>
            {total > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-kova-green transition-all"
                  style={{
                    width: `${Math.min(100, Math.round(((done + 0.35) / total) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {pieces.length === 0 && (
            <button
              type="button"
              onClick={generate}
              disabled={busy || targets.length === 0}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-kova-green px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {busy && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {busy ? "Writing…" : "Generate"}
            </button>
          )}
          {!busy && pieces.length > 0 && scheduled.length === 0 && (
            <>
              <button
                type="button"
                onClick={publishNow}
                className="inline-flex h-10 items-center rounded-md bg-kova-green px-4 text-sm font-bold text-white"
              >
                Publish now
              </button>
              <button
                type="button"
                onClick={schedule}
                className="inline-flex h-10 items-center rounded-md bg-kova-orange px-4 text-sm font-bold text-kova-dark"
              >
                Let Kova schedule
              </button>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
