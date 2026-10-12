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
          <PageHeader
            eyebrow="Create"
            title="Connect an account first"
            description="Kova writes posts for the accounts you connect — Facebook and Instagram."
          />

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
    <div className={WORKSPACE_PAGE}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Create"
          title="Make posts for your accounts"
          description="Pick a product, share everyday tips, or upload a short video. Kova formats it for Facebook and Instagram."
          actions={
            mode === "autopilot" ? (
              <div className="flex items-center gap-2 rounded-full bg-kova-orange/15 px-4 py-2">
                <span className="flex h-2 w-2 rounded-full bg-kova-orange" />
                <span className="text-xs font-bold text-kova-orange">
                  Autopilot on
                </span>
              </div>
            ) : undefined
          }
        />

        <div className="flex flex-wrap gap-2">
          {channels?.accounts.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-2 rounded-full border border-kova-orange/25 bg-kova-orange/10 px-2 py-1 text-xs font-semibold text-kova-dark"
            >
              <PlatformAvatar
                platform={a.platform}
                imageUrl={a.profile_picture_url}
                name={a.name}
                size="sm"
              />
              {PLATFORM_LABELS[a.platform] ?? a.platform}: {a.name}
            </span>
          ))}
        </div>

        <div className="h-px bg-kova-border" />

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
          <div className="border-b border-kova-border bg-gradient-to-r from-kova-orange/10 to-kova-orange/5 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-bold text-kova-dark">
              Content brief
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              One brief → content for every connected channel
            </p>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["product", "Product"],
                  ["organic", "Organic"],
                  ["video", "Upload video"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCampaignMode(key)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
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
                className="mt-2 block w-full rounded-md border border-kova-border bg-white px-3 py-3 text-base text-kova-dark transition focus:border-kova-orange focus:ring-1 focus:ring-kova-orange"
              >
                <option value="">Pick a product to feature</option>
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
                    Content seeds from Kova
                  </p>
                  <button
                    type="button"
                    disabled={seedsLoading}
                    onClick={() => void loadOrganicSeeds(true)}
                    className="text-xs font-bold text-kova-green hover:underline disabled:opacity-50"
                  >
                    {seedsLoading ? "Refreshing…" : "New ideas"}
                  </button>
                </div>
                <p className="text-xs leading-5 text-gray-500">
                  Pick an angle — Kova will adapt it for every connected channel.
                  You can edit the brief below before generating.
                </p>
                {seedsLoading && organicSeeds.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-kova-green border-t-transparent" />
                    Kova is drafting ideas for your business…
                  </div>
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
                            className={`w-full rounded-lg border px-3 py-3 text-left transition ${
                              active
                                ? "border-kova-orange bg-kova-orange/10 ring-1 ring-kova-orange/40"
                                : "border-kova-border bg-white hover:border-kova-orange/35"
                            }`}
                          >
                            <p className="text-sm font-semibold text-kova-dark">
                              {seed.title}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">
                              {seed.brief}
                            </p>
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-kova-orange">
                              {seed.theme_label}
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
                  Short video (MP4, MOV, WebM — max 100 MB)
                </span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  onChange={(e) =>
                    setVideoFile(e.target.files?.[0] ?? null)
                  }
                  className="mt-2 block w-full text-sm text-gray-600"
                />
              </label>
            )}

            {/* Product preview */}
            {campaignMode === "product" && selectedProduct && (
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
                placeholder={
                  campaignMode === "organic"
                    ? "Adjust the brief for this seed, or add extra detail for Kova."
                    : campaignMode === "video"
                      ? "Caption for your video (optional)."
                      : "Promote the new grey sofa, mention free delivery in Nairobi."
                }
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
                  {campaignMode === "video"
                    ? "Uploading…"
                    : "Generating for all channels…"}
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
                  {campaignMode === "video"
                    ? "Upload and queue video"
                    : "Generate content for all channels"}
                </>
              )}
            </button>
          </div>
        </div>
        )}

        {/* ──── Empty state ──── */}
        {mode !== "autopilot" && batches.length === 0 && !generating && (
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
            {batch.kind === "owner_video"
              ? "Your video"
              : batch.kind === "organic"
                ? `Organic · ${batch.organic_theme?.replace("_", " ") ?? "brand"}`
                : batch.product_name
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
