"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AutopilotStudioPanel } from "@/components/social/autopilot-studio-panel";
import { PlatformAvatar } from "@/components/social/platform-avatar";
import { PageHeader, WORKSPACE_PAGE } from "@/components/ui/page-header";
import { ApiError, authenticatedApiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  getBusiness,
  getConnectedChannels,
  getContentBatches,
  getContentCapabilities,
  getOrganicContentSeeds,
  getProducts,
  mediaSrc,
  publishOwnerVideo,
  uploadContentMedia,
  type ConnectedChannels,
  type Content,
  type ContentBatch,
  type ContentCapabilities,
  type OrganicContentSeed,
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

  const [capabilities, setCapabilities] =
    useState<ContentCapabilities | null>(null);
  const [campaignMode, setCampaignMode] = useState<
    "product" | "organic" | "video"
  >("product");
  const [productId, setProductId] = useState("");
  const [organicSeeds, setOrganicSeeds] = useState<OrganicContentSeed[]>([]);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [seedsLoading, setSeedsLoading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);
  const [acting, setActing] = useState("");

  const selectedProduct = products.find((p) => String(p.id) === productId);
  const selectedSeed = organicSeeds.find((s) => s.id === selectedSeedId) ?? null;

  async function loadOrganicSeeds(force = false) {
    if (!businessId || !accessToken) return;
    if (!force && organicSeeds.length > 0) return;
    setSeedsLoading(true);
    try {
      const seeds = await getOrganicContentSeeds(businessId, accessToken);
      setOrganicSeeds(seeds);
      if (seeds.length > 0 && (force || !selectedSeedId)) {
        setSelectedSeedId(seeds[0].id);
        setNote(seeds[0].brief);
      }
    } catch {
      setError("Kova could not load content ideas. Try again in a moment.");
    } finally {
      setSeedsLoading(false);
    }
  }

  useEffect(() => {
    if (campaignMode !== "organic" || !businessId || !accessToken) return;
    void loadOrganicSeeds();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load when entering organic mode
  }, [campaignMode, businessId, accessToken]);

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
        const [ch, prods, batchList, policy, caps] = await Promise.all([
          getConnectedChannels(business.id, token),
          getProducts(business.id, token),
          getContentBatches(business.id, token),
          getBusinessPolicy(business.id, token),
          getContentCapabilities(business.id, token),
        ]);
        setChannels(ch);
        setProducts(prods);
        setBatches(batchList);
        setMode(policy.social_operating_mode);
        setCapabilities(caps);
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
    if (mode === "autopilot") {
      setError(
        "Autopilot creates and schedules content on each shift. Use Run shift now below or open Autopilot.",
      );
      return;
    }
    setGenerating(true);
    setError("");
    try {
      if (campaignMode === "organic" && !selectedSeed) {
        setError("Choose one of Kova's content seeds below.");
        return;
      }
      if (campaignMode === "video") {
        if (!videoFile) {
          setError("Choose a short video to upload.");
          return;
        }
        const uploaded = await uploadContentMedia(
          businessId,
          accessToken,
          videoFile,
        );
        await publishOwnerVideo(businessId, accessToken, {
          asset_id: uploaded.id,
          caption: note,
        });
      } else {
        await authenticatedApiRequest(
          `/content/${businessId}/campaign/`,
          accessToken,
          {
            method: "POST",
            body: JSON.stringify({
              note,
              product_id:
                campaignMode === "product" && productId
                  ? Number(productId)
                  : null,
              organic_theme:
                campaignMode === "organic"
                  ? selectedSeed?.theme_key
                  : undefined,
            }),
          },
        );
      }
      const batchList = await getContentBatches(businessId, accessToken);
      setBatches(batchList);
      setNote("");
      setProductId("");
      setVideoFile(null);
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
      <div className={WORKSPACE_PAGE}>
        <div className="space-y-6">
          <PageHeader title="Create" />

          <section className="border border-kova-border bg-white px-5 py-6">
            <p className="font-semibold text-kova-dark">
              Connect an account first
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Facebook or Instagram — then Kova can draft posts.
            </p>
            <Link
              href="/workspace/social/channels"
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark hover:bg-[#f0a46e] sm:h-10 sm:w-auto"
            >
              Connect
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {channels?.accounts.map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-2 truncate rounded-md border border-kova-border bg-white px-2 py-1 text-xs font-semibold text-kova-dark"
              >
                <PlatformAvatar
                  platform={a.platform}
                  imageUrl={a.profile_picture_url}
                  name={a.name}
                  size="sm"
                />
                {a.name}
              </span>
            ))}
          </div>
          {mode === "autopilot" ? (
            <span className="text-xs font-semibold text-kova-dark">
              Autopilot on
            </span>
          ) : null}
        </div>

        {capabilities?.kenya_relatable_mode ? (
          <p className="text-xs text-gray-500">
            Kenya voice on.{" "}
            <Link
              href="/workspace/settings/business-brand"
              className="font-semibold text-kova-green hover:underline"
            >
              Brand settings
            </Link>
          </p>
        ) : null}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {mode === "autopilot" && businessId && accessToken && (
          <AutopilotStudioPanel
            businessId={businessId}
            accessToken={accessToken}
          />
        )}

        {/* ──── Brief composer (assist / approval only) ──── */}
        {mode !== "autopilot" && (
        <div className="overflow-hidden rounded-lg border border-kova-border bg-white">
          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["product", "Product"],
                  ["organic", "Tip / story"],
                  ["video", "Video"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCampaignMode(key)}
                  className={`h-11 rounded-md px-2 text-xs font-semibold transition ${
                    campaignMode === key
                      ? "bg-kova-green text-white"
                      : "bg-kova-background text-kova-dark hover:bg-kova-green/10"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {campaignMode === "product" && (
            <label className="block">
              <span className="text-sm font-semibold text-kova-dark">
                Product
              </span>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="mt-1.5 block w-full rounded-md border border-kova-border bg-white px-3 py-2.5 text-sm text-kova-dark focus:border-kova-orange focus:ring-1 focus:ring-kova-orange"
              >
                <option value="">Choose a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{" "}
                    {p.price ? `— ${p.currency} ${p.price}` : ""}
                  </option>
                ))}
              </select>
            </label>
            )}

            {campaignMode === "organic" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-kova-dark">
                    Ideas
                  </p>
                  <button
                    type="button"
                    disabled={seedsLoading}
                    onClick={() => void loadOrganicSeeds(true)}
                    className="text-xs font-semibold text-kova-green hover:underline disabled:opacity-50"
                  >
                    {seedsLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                {seedsLoading && organicSeeds.length === 0 ? (
                  <p className="py-4 text-sm text-gray-500">Loading ideas…</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {organicSeeds.map((seed) => {
                      const active = seed.id === selectedSeedId;
                      return (
                        <li key={seed.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSeedId(seed.id);
                              setNote(seed.brief);
                            }}
                            className={`w-full border px-3 py-2.5 text-left transition ${
                              active
                                ? "border-kova-dark bg-kova-background"
                                : "border-kova-border bg-white hover:border-kova-dark/40"
                            }`}
                          >
                            <p className="text-sm font-semibold text-kova-dark">
                              {seed.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                              {seed.brief}
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {campaignMode === "video" && (
              <label className="block">
                <span className="text-sm font-semibold text-kova-dark">
                  Video file
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  onChange={(e) =>
                    setVideoFile(e.target.files?.[0] ?? null)
                  }
                  className="mt-1.5 block w-full text-sm text-gray-600"
                />
              </label>
            )}

            {campaignMode === "product" && selectedProduct && (
              <div className="flex items-center gap-3 rounded-md border border-kova-border bg-kova-background/60 p-3">
                {selectedProduct.images[0]?.url ? (
                  <img
                    src={mediaSrc(selectedProduct.images[0].url)}
                    alt={selectedProduct.name}
                    className="h-12 w-12 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-xs text-gray-400">
                    —
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-kova-dark">
                    {selectedProduct.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedProduct.price
                      ? `${selectedProduct.currency} ${selectedProduct.price}`
                      : "Price on request"}
                  </p>
                </div>
              </div>
            )}

            <label className="block">
              <span className="text-sm font-semibold text-kova-dark">
                Brief
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={
                  campaignMode === "organic"
                    ? "Edit the idea or add detail"
                    : campaignMode === "video"
                      ? "Caption (optional)"
                      : "e.g. Mention free delivery in Nairobi"
                }
                className="mt-1.5 block w-full rounded-md border border-kova-border bg-white px-3 py-2.5 text-sm text-kova-dark placeholder:text-gray-400 focus:border-kova-orange focus:ring-1 focus:ring-kova-orange"
              />
            </label>

            <button
              type="button"
              onClick={generateCampaign}
              disabled={generating}
              className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-kova-orange px-5 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e] disabled:opacity-60 sm:h-11 sm:w-auto"
            >
              {generating ? (
                <>
                  <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-kova-dark/30 border-t-kova-dark" />
                  {campaignMode === "video" ? "Uploading…" : "Generating…"}
                </>
              ) : campaignMode === "video" ? (
                "Upload video"
              ) : (
                "Generate"
              )}
            </button>
          </div>
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
      <div className="flex flex-col gap-3 border-b border-kova-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-kova-dark">
            {batch.kind === "owner_video"
              ? "Video"
              : batch.kind === "organic"
                ? batch.organic_theme?.replace("_", " ") ?? "Tip / story"
                : batch.product_name || "Posts"}
          </h2>
          {batch.brief ? (
            <p className="mt-0.5 truncate text-xs text-gray-500">
              {batch.brief}
            </p>
          ) : null}
        </div>
        {hasDrafts && mode !== "autopilot" ? (
          <button
            type="button"
            onClick={onApproveAll}
            className="inline-flex h-9 shrink-0 items-center rounded-md bg-kova-green px-3 text-xs font-bold text-white"
          >
            Approve all
          </button>
        ) : null}
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
          <span className="font-semibold text-kova-dark">
            {PLATFORM_LABELS[piece.platform] ?? piece.platform}
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">
            {TYPE_LABELS[piece.content_type] ?? piece.content_type}
          </span>
        </div>
        <span className={`text-xs font-medium ${badge.text}`}>
          {statusLabel}
        </span>
      </div>
      {queued && piece.scheduled_at ? (
        <div className="border-b border-kova-border px-4 py-1.5">
          <p className="text-xs text-gray-500">
            On calendar · {new Date(piece.scheduled_at).toLocaleString()}
          </p>
        </div>
      ) : null}

      {piece.account_name ? (
        <div className="border-b border-kova-border px-4 py-1.5">
          <p className="text-xs text-gray-500">{piece.account_name}</p>
        </div>
      ) : null}

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

        {/* Carousel slides or reel skit beats */}
        {piece.slides &&
          piece.slides.length > 0 &&
          (piece.content_type === "carousel" ||
            piece.content_type === "reel") && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500">
                {piece.content_type === "reel" ? "Film beats" : "Slides"}
              </p>
              {piece.slides.map((slide, i) => (
                <div
                  key={i}
                  className="border-l border-kova-border py-1.5 pl-3 text-xs leading-5 text-kova-dark"
                >
                  <span className="font-medium text-gray-500">{i + 1}. </span>
                  {slide.caption}
                </div>
              ))}
            </div>
          )}

        {piece.hashtags && piece.hashtags.length > 0 ? (
          <p className="text-xs leading-5 text-gray-500">
            {piece.hashtags.map((tag) => `#${tag}`).join(" ")}
          </p>
        ) : null}
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
              className="inline-flex h-8 items-center rounded-md border border-kova-border bg-white px-3 text-xs font-semibold text-kova-dark transition hover:border-kova-dark disabled:opacity-60"
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
