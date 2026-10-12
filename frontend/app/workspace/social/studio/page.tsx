"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  getBusiness,
  getConnectedChannels,
  getContentBatches,
  getProducts,
  mediaSrc,
  type ConnectedChannels,
  type Content,
  type ContentBatch,
  type Product,
} from "@/lib/commerce";
import {
  getBusinessPolicy,
  type OperatingMode,
} from "@/lib/social";

const PLATFORM_LABELS: Record<string, string> = {
  facebook_page: "Facebook",
  instagram: "Instagram",
};

const TYPE_LABELS: Record<string, string> = {
  post: "Post",
  carousel: "Carousel",
  reel: "Reel",
  story: "Story",
};

const TYPE_ICONS: Record<string, string> = {
  post: "📝",
  carousel: "🎠",
  reel: "🎬",
  story: "📱",
};

const STATUS_BADGE: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
  approved: {
    bg: "bg-kova-orange/10",
    text: "text-kova-orange",
    dot: "bg-kova-orange",
  },
  published: {
    bg: "bg-kova-green/10",
    text: "text-kova-green",
    dot: "bg-kova-green",
  },
  rejected: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
};

export default function ContentStudioPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [channels, setChannels] = useState<ConnectedChannels | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ContentBatch[]>([]);
  const [mode, setMode] = useState<OperatingMode>("assist");
  const [loading, setLoading] = useState(true);

  const [productId, setProductId] = useState("");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);
  const [acting, setActing] = useState("");

  const selectedProduct = products.find((p) => String(p.id) === productId);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }
    const token = accessToken;

    async function load() {
      try {
        const business = await getBusiness(token);
        setBusinessId(business.id);
        const [ch, prods, batchList, policy] = await Promise.all([
          getConnectedChannels(business.id, token),
          getProducts(business.id, token),
          getContentBatches(business.id, token),
          getBusinessPolicy(business.id, token),
        ]);
        setChannels(ch);
        setProducts(prods);
        setBatches(batchList);
        setMode(policy.social_operating_mode);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load content studio.",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, isAuthenticated, accessToken, router]);

  async function generateCampaign() {
    if (!businessId || !accessToken) return;
    setGenerating(true);
    setError("");
    try {
      await authenticatedApiRequest(
        `/content/${businessId}/campaign/`,
        accessToken,
        {
          method: "POST",
          body: JSON.stringify({
            note,
            product_id: productId ? Number(productId) : null,
          }),
        },
      );
      const batchList = await getContentBatches(businessId, accessToken);
      setBatches(batchList);
      setNote("");
      setProductId("");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Kova could not generate content.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function actOnPiece(
    piece: Content,
    action: "approve" | "publish" | "reject",
  ) {
    if (!businessId || !accessToken || actingId !== null) return;
    setError("");
    setActingId(piece.id);
    setActing(action);
    try {
      const updated = await authenticatedApiRequest<Content>(
        `/content/${businessId}/${piece.id}/${action}/`,
        accessToken,
        { method: "POST" },
      );
      setBatches((current) =>
        current.map((batch) => ({
          ...batch,
          contents: batch.contents.map((c) =>
            c.id === updated.id ? updated : c,
          ),
        })),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not update that piece.",
      );
    } finally {
      setActingId(null);
      setActing("");
    }
  }

  async function approveAll(batch: ContentBatch) {
    for (const piece of batch.contents) {
      if (piece.status === "draft") {
        await actOnPiece(piece, "approve");
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-kova-green border-t-transparent" />
      </div>
    );
  }

  /* ──── Gate: no channels ──── */
  if (channels && !channels.connected) {
    return (
      <div className="p-4 sm:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
              Content Studio
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Connect a channel first
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
              Kova generates content adapted to your connected social accounts.
              Connect at least one account so Kova knows which platforms to
              write for.
            </p>
          </header>

          <div className="h-px bg-kova-border" />

          <section className="rounded-lg border-2 border-dashed border-kova-orange/40 bg-kova-orange/5 p-8 text-center">
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
                <path d="M17 2H7a2 2 0 00-2 2v16l7-4 7 4V4a2 2 0 00-2-2z" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-semibold text-kova-dark">
              Content adapts to the channel
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Kova writes specifically for your connected accounts — Instagram
              carousels, Facebook posts, reel scripts, and stories — all from
              one brief.
            </p>
            <Link
              href="/workspace/social/channels"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark hover:bg-[#f0a46e]"
            >
              Connect an account
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* ──── Header ──── */}
        <header>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
                Content Studio
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
                Tell Kova what to promote
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600 sm:text-base">
                Describe what you want or select a product. Kova generates
                adapted content for all your connected channels simultaneously.
              </p>
            </div>

            {mode === "autopilot" && (
              <div className="flex items-center gap-2 rounded-full bg-kova-orange/15 px-4 py-2">
                <span className="flex h-2 w-2 rounded-full bg-kova-orange" />
                <span className="text-xs font-bold text-kova-orange">
                  Autopilot active
                </span>
              </div>
            )}
          </div>

          {/* Channel pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {channels?.accounts.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-kova-orange/10 px-3 py-1.5 text-xs font-semibold text-kova-dark"
              >
                <span className="flex h-1.5 w-1.5 rounded-full bg-kova-orange" />
                {PLATFORM_LABELS[a.platform] ?? a.platform}: {a.name}
              </span>
            ))}
          </div>
        </header>

        <div className="h-px bg-kova-border" />

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* ──── Brief composer ──── */}
        <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
          <div className="border-b border-kova-border bg-gradient-to-r from-kova-orange/10 to-kova-orange/5 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-bold text-kova-dark">
              Content brief
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              One brief → content for every connected channel
            </p>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            {/* Product selector */}
            <label className="block">
              <span className="text-sm font-semibold text-kova-dark">
                Product
              </span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-2 block w-full rounded-md border border-kova-border bg-white px-3 py-3 text-base text-kova-dark transition focus:border-kova-orange focus:ring-1 focus:ring-kova-orange"
              >
                <option value="">General business content</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{" "}
                    {p.price ? `— ${p.currency} ${p.price}` : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* Product preview */}
            {selectedProduct && (
              <div className="flex items-center gap-4 rounded-lg border border-kova-orange/30 bg-kova-orange/5 p-4">
                {selectedProduct.images[0]?.url ? (
                  <img
                    src={selectedProduct.images[0].url}
                    alt={selectedProduct.name}
                    className="h-16 w-16 rounded-lg object-cover ring-2 ring-kova-orange/30"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-kova-background text-xs text-gray-400">
                    No img
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-kova-dark">
                    {selectedProduct.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedProduct.category &&
                      `${selectedProduct.category} · `}
                    {selectedProduct.price
                      ? `${selectedProduct.currency} ${selectedProduct.price}`
                      : "Price on request"}
                    {selectedProduct.color &&
                      ` · ${selectedProduct.color}`}
                  </p>
                  {selectedProduct.selling_points.length > 0 && (
                    <p className="mt-1 truncate text-xs font-medium text-kova-orange">
                      {selectedProduct.selling_points
                        .slice(0, 3)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Note */}
            <label className="block">
              <span className="text-sm font-semibold text-kova-dark">
                What should Kova create?
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Promote the new grey sofa, mention free delivery in Nairobi."
                className="mt-2 block w-full rounded-md border border-kova-border bg-white px-3 py-3 text-base text-kova-dark transition placeholder:text-gray-400 focus:border-kova-orange focus:ring-1 focus:ring-kova-orange"
              />
            </label>

            {/* Generate button */}
            <button
              type="button"
              onClick={generateCampaign}
              disabled={generating}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-kova-orange px-6 text-sm font-bold text-kova-dark shadow-sm transition hover:bg-[#f0a46e] disabled:opacity-60"
            >
              {generating ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-kova-dark/30 border-t-kova-dark" />
                  Generating for all channels…
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Generate content for all channels
                </>
              )}
            </button>
          </div>
        </div>

        {/* ──── Empty state ──── */}
        {batches.length === 0 && !generating && (
          <div className="rounded-lg border-2 border-dashed border-kova-border bg-white p-8 text-center">
            <p className="font-semibold text-kova-dark">
              No content generated yet
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Describe what you want above and Kova will create adapted content
              for every connected channel.
            </p>
          </div>
        )}

        {/* ──── Batch list ──── */}
        {batches.map((batch) => (
          <BatchSection
            key={batch.id}
            batch={batch}
            mode={mode}
            onAction={actOnPiece}
            onApproveAll={() => approveAll(batch)}
            actingId={actingId}
            acting={acting}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════ Batch section ═══════════════════════ */

function BatchSection({
  batch,
  mode,
  onAction,
  onApproveAll,
  actingId,
  acting,
}: {
  batch: ContentBatch;
  mode: OperatingMode;
  onAction: (piece: Content, action: "approve" | "publish" | "reject") => void;
  onApproveAll: () => void;
  actingId: number | null;
  acting: string;
}) {
  const hasDrafts = batch.contents.some((c) => c.status === "draft");

  return (
    <section className="overflow-hidden rounded-lg border border-kova-border bg-white">
      {/* Batch header */}
      <div className="flex flex-col gap-3 border-b border-kova-border bg-gradient-to-r from-kova-green/5 to-transparent px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-kova-dark">
            {batch.product_name
              ? `Content for ${batch.product_name}`
              : "Business content"}
          </h2>
          {batch.brief && (
            <p className="mt-0.5 truncate text-sm text-gray-500">
              {batch.brief}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {hasDrafts && mode !== "autopilot" && (
            <button
              type="button"
              onClick={onApproveAll}
              className="inline-flex h-9 items-center rounded-md bg-kova-green px-3 text-xs font-bold text-white"
            >
              Approve all drafts
            </button>
          )}
          <span className="inline-flex items-center rounded-full bg-kova-orange/10 px-2.5 py-1 text-xs font-semibold text-kova-orange">
            {batch.contents.length} piece
            {batch.contents.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Piece grid */}
      <div className="grid gap-px bg-kova-border sm:grid-cols-2 lg:grid-cols-3">
        {batch.contents.map((piece) => (
          <PieceCard
            key={piece.id}
            piece={piece}
            mode={mode}
            onAction={(action) => onAction(piece, action)}
            busy={actingId === piece.id}
            busyLabel={actingId === piece.id ? acting : ""}
          />
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════ Piece card ═══════════════════════ */

function PieceCard({
  piece,
  mode,
  onAction,
  busy,
  busyLabel,
}: {
  piece: Content;
  mode: OperatingMode;
  onAction: (action: "approve" | "publish" | "reject") => void;
  busy: boolean;
  busyLabel: string;
}) {
  const queued = piece.queue_status === "scheduled" || piece.queue_status === "pending";
  const badge =
    piece.status === "published"
      ? STATUS_BADGE.published
      : queued
        ? {
            bg: "bg-kova-green/10",
            text: "text-kova-green",
            dot: "bg-kova-green",
          }
        : STATUS_BADGE[piece.status] ?? STATUS_BADGE.draft;
  const statusLabel =
    piece.status === "published"
      ? "published"
      : queued
        ? "scheduled"
        : piece.status;

  return (
    <div className="flex flex-col bg-white">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-kova-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span>{TYPE_ICONS[piece.content_type] ?? "📄"}</span>
          <span className="font-bold uppercase tracking-wide text-kova-dark">
            {PLATFORM_LABELS[piece.platform] ?? piece.platform}
          </span>
          <span className="text-gray-300">·</span>
          <span className="font-semibold text-gray-500">
            {TYPE_LABELS[piece.content_type] ?? piece.content_type}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${badge.bg} ${badge.text}`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${badge.dot}`}
          />
          {statusLabel}
        </span>
      </div>
      {queued && piece.scheduled_at && (
        <div className="border-b border-kova-border bg-kova-green/5 px-4 py-1.5">
          <p className="text-xs font-medium text-kova-green">
            On calendar · {new Date(piece.scheduled_at).toLocaleString()}
          </p>
        </div>
      )}

      {piece.account_name && (
        <div className="border-b border-kova-border bg-kova-orange/5 px-4 py-1.5">
          <p className="text-xs font-medium text-kova-orange">
            {piece.account_name}
          </p>
        </div>
      )}

      {/* Media */}
      {(() => {
        const images = (
          piece.media_urls?.length
            ? piece.media_urls
            : piece.product_image
              ? [piece.product_image]
              : []
        )
          .map(mediaSrc)
          .filter(Boolean);
        if (images.length === 0) return null;
        return (
          <div className="border-b border-kova-border">
            <img
              src={images[0]}
              alt={piece.product_name || "Post image"}
              className="aspect-[4/3] w-full object-cover"
            />
            {images.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto p-3">
                {images.slice(1, 4).map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-md object-cover"
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Body */}
      <div className="flex-1 space-y-3 p-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-kova-dark">
          {piece.caption}
        </p>

        {piece.call_to_action && (
          <p className="inline-block rounded-md bg-kova-green/10 px-2.5 py-1 text-xs font-bold text-kova-green">
            {piece.call_to_action}
          </p>
        )}

        {/* Carousel slides */}
        {piece.content_type === "carousel" &&
          piece.slides &&
          piece.slides.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wide text-kova-orange">
                Slides
              </p>
              {piece.slides.map((slide, i) => (
                <div
                  key={i}
                  className="rounded-md border-l-3 border-kova-orange/40 bg-kova-orange/5 py-2 pl-3 pr-2 text-xs leading-5 text-kova-dark"
                >
                  <span className="font-bold text-kova-orange">
                    {i + 1}.{" "}
                  </span>
                  {slide.caption}
                </div>
              ))}
            </div>
          )}

        {/* Hashtags */}
        {piece.hashtags && piece.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {piece.hashtags.map((tag, i) => (
              <span
                key={i}
                className="rounded-full bg-kova-orange/10 px-2 py-0.5 text-xs font-semibold text-kova-orange"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      {piece.status !== "published" &&
        piece.status !== "rejected" &&
        !queued && (
        <div className="flex flex-wrap gap-2 border-t border-kova-border px-4 py-3">
          {piece.status === "draft" && mode !== "autopilot" && (
            <button
              type="button"
              onClick={() => onAction("approve")}
              disabled={busy}
              className="inline-flex h-8 items-center rounded-md bg-kova-orange/15 px-3 text-xs font-bold text-kova-orange transition hover:bg-kova-orange/25 disabled:opacity-60"
            >
              {busy && busyLabel === "approve" ? "Approving…" : "Approve"}
            </button>
          )}
          {(piece.status === "approved" || mode !== "autopilot") && (
            <button
              type="button"
              onClick={() => onAction("publish")}
              disabled={busy}
              className="inline-flex h-8 items-center rounded-md bg-kova-green px-3 text-xs font-bold text-white disabled:opacity-60"
            >
              {busy && busyLabel === "publish" ? "Publishing…" : "Publish"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction("reject")}
            className="inline-flex h-8 items-center rounded-md px-3 text-xs font-semibold text-gray-400 transition hover:text-red-600"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
