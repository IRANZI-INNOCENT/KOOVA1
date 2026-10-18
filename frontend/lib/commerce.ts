import { authenticatedApiRequest } from "@/lib/api";
import {
  cachedResource,
  invalidateResourceCache,
} from "@/lib/resource-cache";

const BUSINESS_CACHE_TTL_MS = 10 * 60 * 1000;
const LIST_CACHE_TTL_MS = 2 * 60 * 1000;

export function invalidateCommerceCaches(
  businessId: number,
  userId?: number,
): void {
  invalidateResourceCache(`products:${businessId}`);
  invalidateResourceCache(`commerce-page:${businessId}`);
  if (userId !== undefined) {
    invalidateResourceCache(
      `business:uid:${userId}:active`,
    );
    invalidateResourceCache(
      `business:uid:${userId}:${businessId}`,
    );
  }
}

export interface ProductImage {
  id: number;
  image: string;
  url: string | null;
  alt_text: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  business: number;
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: string | null;
  currency: string;
  stock: number | null;
  brand: string;
  material: string;
  size: string;
  color: string;
  condition: string;

  short_description: string;
  description: string;

  seo_title: string;
  seo_description: string;

  selling_points: string[];
  keywords: string[];

  visual_attributes: Record<string, unknown>;
  uncertain_attributes: string[];

  ai_summary: string;
  ai_confidence: string | null;
  ai_generated: boolean;

  status: "draft" | "active" | "archived";

  store_path: string | null;
  product_path: string | null;

  images: ProductImage[];

  created_at: string;
  updated_at: string;
}

export interface CommercePage {
  id: number;
  business: number;
  business_name: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  whatsapp: string;
  email: string;
  phone: string;
  location: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  logo_url?: string | null;
  cover_url?: string | null;
  banners?: StoreBanner[];
  banner_limit?: number;
  layout_preset?: "compact" | "editorial" | "whatsapp_first" | "gallery";
  font_preset?: "classic" | "modern" | "soft";
  show_hero?: boolean;
  show_about?: boolean;
  show_featured?: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreBanner {
  id: number;
  url: string;
  alt_text: string;
  product_id?: number | null;
  product_slug?: string | null;
  product_name?: string | null;
  href?: string | null;
  display_order: number;
  created_at: string;
}

export interface Business {
  id: number;
  name: string;
  description: string;
  industry?: string;
  location: string;
  email: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Resolve the business brain the workspace is operating on.
 */
export async function getBusiness(
  token: string,
  options?: {
    userId?: number;
    revalidate?: boolean;
    businessId?: number | null;
  },
): Promise<Business> {
  const activeKey = options?.businessId ?? "active";
  const cacheKey = options?.userId
    ? `business:uid:${options.userId}:${activeKey}`
    : `business:token:${token.slice(-12)}:${activeKey}`;

  return cachedResource(
    cacheKey,
    BUSINESS_CACHE_TTL_MS,
    async () => {
      const { getBusinesses, pickActiveBusiness } =
        await import("@/lib/business");
      const businesses = await getBusinesses(token);
      const picked = pickActiveBusiness(
        businesses,
        options?.businessId,
      );
      return {
        id: picked.id,
        name: picked.name,
        description: picked.description,
        industry: picked.industry,
        location: picked.location,
        email: picked.email,
        phone: picked.phone,
        created_at: picked.created_at,
        updated_at: picked.updated_at,
      };
    },
    { revalidate: options?.revalidate },
  );
}

/**
 * Get all products belonging to a business.
 */
export async function getProducts(
  businessId: number,
  token: string,
  options?: { revalidate?: boolean },
): Promise<Product[]> {
  return cachedResource(
    `products:${businessId}`,
    LIST_CACHE_TTL_MS,
    () =>
      authenticatedApiRequest<Product[]>(
        `/commerce/${businessId}/products/`,
        token,
      ),
    { revalidate: options?.revalidate },
  );
}

/**
 * Get the business Commerce Page.
 */
export async function getCommercePage(
  businessId: number,
  token: string,
  options?: { revalidate?: boolean },
): Promise<CommercePage> {
  return cachedResource(
    `commerce-page:${businessId}`,
    LIST_CACHE_TTL_MS,
    () =>
      authenticatedApiRequest<CommercePage>(
        `/commerce/${businessId}/page/`,
        token,
      ),
    { revalidate: options?.revalidate },
  );
}

/**
 * Update Commerce Page information.
 */
export async function saveCommercePage(
  businessId: number,
  token: string,
  payload: Partial<CommercePage> & {
    clear_logo?: boolean;
    clear_cover?: boolean;
  },
): Promise<CommercePage> {
  invalidateResourceCache(`commerce-page:${businessId}`);
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

/** Upload logo (multipart). Banner slides use addCommercePageBanner. */
export async function uploadCommercePageImage(
  businessId: number,
  token: string,
  field: "logo" | "cover",
  file: File,
): Promise<CommercePage> {
  const body = new FormData();
  body.append(field, file);
  invalidateResourceCache(`commerce-page:${businessId}`);
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/`,
    token,
    {
      method: "PATCH",
      body,
    },
  );
}

/** Add a hero banner slide (flash sale, announcement, etc). Max 5. */
export async function addCommercePageBanner(
  businessId: number,
  token: string,
  file: File,
  altText = "",
): Promise<CommercePage> {
  const body = new FormData();
  body.append("image", file, file.name || "banner.jpg");
  if (altText.trim()) body.append("alt_text", altText.trim());
  invalidateResourceCache(`commerce-page:${businessId}`);
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/banners/`,
    token,
    { method: "POST", body },
  );
}

export async function updateCommercePageBanner(
  businessId: number,
  token: string,
  bannerId: number,
  payload: {
    alt_text?: string;
    product_id?: number | null;
  },
): Promise<CommercePage> {
  invalidateResourceCache(`commerce-page:${businessId}`);
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/banners/${bannerId}/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteCommercePageBanner(
  businessId: number,
  token: string,
  bannerId: number,
): Promise<CommercePage> {
  invalidateResourceCache(`commerce-page:${businessId}`);
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/banners/${bannerId}/`,
    token,
    { method: "DELETE" },
  );
}

export async function reorderCommercePageBanners(
  businessId: number,
  token: string,
  bannerIds: number[],
): Promise<CommercePage> {
  invalidateResourceCache(`commerce-page:${businessId}`);
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/banners/reorder/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ banner_ids: bannerIds }),
    },
  );
}

/**
 * Publish or unpublish the Commerce Page.
 */
export async function publishCommercePage(
  businessId: number,
  token: string,
  published: boolean,
): Promise<CommercePage> {
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/publish/`,
    token,
    {
      method: "POST",
      body: JSON.stringify({
        is_published: published,
      }),
    },
  );
}

/**
 * Update owner-controlled product facts after AI analysis.
 *
 * The Snap-to-Sell flow creates the initial product draft.
 * This function allows the owner to correct or refine the
 * information before the product is eventually activated.
 */
export async function polishProduct(
  businessId: number,
  productId: number,
  token: string,
): Promise<Product> {
  return authenticatedApiRequest<Product>(
    `/commerce/${businessId}/products/${productId}/polish/`,
    token,
    { method: "POST" },
  );
}

export async function updateProduct(
  businessId: number,
  productId: number,
  token: string,
  payload: Partial<Product>,
): Promise<Product> {
  return authenticatedApiRequest<Product>(
    `/commerce/${businessId}/products/${productId}/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export { mediaSrc } from "@/lib/media";

export interface ContentSlide {
  caption: string;
  media_url: string;
  product_id: number | null;
}

export interface Content {
  id: number;
  business: number;
  batch_id: string | null;
  social_account: number | null;
  account_name: string | null;
  product: number | null;
  product_name: string | null;
  product_image: string | null;
  platform: string;
  content_type: string;
  caption: string;
  call_to_action: string;
  hashtags: string[];
  media_urls: string[];
  slides: ContentSlide[];
  status: "draft" | "approved" | "published" | "rejected";
  queue_status?:
    | "pending"
    | "scheduled"
    | "publishing"
    | "published"
    | "failed"
    | null;
  scheduled_at?: string | null;
  created_by_ai: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentBatch {
  id: string;
  business: number;
  product: number | null;
  product_name: string | null;
  brief: string;
  kind?: "product" | "organic" | "owner_video";
  organic_theme?: string;
  contents: Content[];
  created_at: string;
}

export interface OrganicTheme {
  key: string;
  label: string;
  description: string;
}

export interface OrganicContentSeed {
  id: string;
  title: string;
  brief: string;
  theme_key: string;
  theme_label: string;
}

export interface ContentCapabilities {
  product_campaigns: boolean;
  organic_campaigns: boolean;
  organic_themes: OrganicTheme[];
  owner_video_upload: boolean;
  video_publish: boolean;
  autopilot: {
    product_posts: boolean;
    organic_posts: boolean;
    owner_videos: boolean;
  };
}

export interface ConnectedChannels {
  connected: boolean;
  accounts: Array<{
    id: number;
    platform: string;
    name: string;
    profile_picture_url?: string;
  }>;
}

export async function getContents(
  businessId: number,
  token: string,
): Promise<Content[]> {
  return authenticatedApiRequest<Content[]>(
    `/content/${businessId}/`,
    token,
  );
}

export async function getContentBatches(
  businessId: number,
  token: string,
): Promise<ContentBatch[]> {
  return authenticatedApiRequest<ContentBatch[]>(
    `/content/${businessId}/batches/`,
    token,
  );
}

export interface ProductContentPlan {
  product_id: number;
  generated: number;
  scheduled: number;
  published: number;
  next_at: string | null;
}

export async function getProductContentPlans(
  businessId: number,
  token: string,
): Promise<ProductContentPlan[]> {
  return authenticatedApiRequest<ProductContentPlan[]>(
    `/content/${businessId}/product-status/`,
    token,
  );
}

export async function getContentCapabilities(
  businessId: number,
  token: string,
): Promise<ContentCapabilities> {
  return authenticatedApiRequest<ContentCapabilities>(
    `/content/${businessId}/capabilities/`,
    token,
  );
}

export async function getOrganicContentSeeds(
  businessId: number,
  token: string,
): Promise<OrganicContentSeed[]> {
  const data = await authenticatedApiRequest<{ seeds: OrganicContentSeed[] }>(
    `/content/${businessId}/organic-seeds/`,
    token,
  );
  return data.seeds ?? [];
}

export async function uploadContentMedia(
  businessId: number,
  token: string,
  file: File,
): Promise<{ id: string; media_type: string; url: string }> {
  const form = new FormData();
  form.append("file", file);
  return authenticatedApiRequest(
    `/content/${businessId}/media/upload/`,
    token,
    { method: "POST", body: form },
  );
}

export async function publishOwnerVideo(
  businessId: number,
  token: string,
  payload: {
    asset_id: string;
    caption?: string;
    schedule?: boolean;
  },
): Promise<{ batch_id: string; pieces: Content[] }> {
  return authenticatedApiRequest(
    `/content/${businessId}/owner-video/`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getConnectedChannels(
  businessId: number,
  token: string,
): Promise<ConnectedChannels> {
  return authenticatedApiRequest<ConnectedChannels>(
    `/content/${businessId}/channels/`,
    token,
  );
}

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */

export interface Lead {
  id: number;
  business: number;
  customer_name: string;
  customer_id: string;
  conversation_id: string;
  source: string;
  interest: string;
  notes: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  created_by_ai: boolean;
  created_at: string;
  updated_at: string;
}

export async function getLeads(
  businessId: number,
  token: string,
): Promise<Lead[]> {
  return authenticatedApiRequest<Lead[]>(
    `/leads/${businessId}/`,
    token,
  );
}

/* ------------------------------------------------------------------ */
/* Kova Agent                                                          */
/* ------------------------------------------------------------------ */

export interface KovaToolCall {
  tool_name: string;
  status: string;
}

export interface KovaAgentResponse {
  message: string;
  model: string | null;
  tool_calls: KovaToolCall[];
}

export async function getKovaStarters(
  businessId: number,
  token: string,
): Promise<string[]> {
  const result = await authenticatedApiRequest<{ prompts: string[] }>(
    `/kova/starters/?business_id=${businessId}`,
    token,
  );
  return result.prompts || [];
}

export interface KovaTurn {
  id: number;
  request: string;
  response: string;
  created_at: string;
}

export async function getKovaExchanges(
  businessId: number,
  token: string,
): Promise<KovaTurn[]> {
  const result = await authenticatedApiRequest<{ turns: KovaTurn[] }>(
    `/kova/exchanges/?business_id=${businessId}`,
    token,
  );
  return result.turns || [];
}

export async function sendKovaMessage(
  businessId: number,
  token: string,
  message: string,
  task: string = "general",
): Promise<KovaAgentResponse> {
  return authenticatedApiRequest<KovaAgentResponse>(
    "/kova/agent/",
    token,
    {
      method: "POST",
      body: JSON.stringify({
        business_id: businessId,
        message,
        task,
      }),
    },
  );
}

/* ------------------------------------------------------------------ */
/* Snap to Sell                                                        */
/* ------------------------------------------------------------------ */

/**
 * Send product images and owner-provided facts to Snap-to-Sell.
 *
 * The browser must not manually set Content-Type here.
 * authenticatedApiRequest() handles FormData correctly so the
 * browser can generate the multipart boundary automatically.
 */
export async function snapToSell(
  businessId: number,
  token: string,
  formData: FormData,
): Promise<Product> {
  return authenticatedApiRequest<Product>(
    `/commerce/${businessId}/snap-to-sell/`,
    token,
    {
      method: "POST",
      body: formData,
    },
  );
}

export interface SnapToSellBatchError {
  index: number;
  filename: string;
  detail: string;
}

export interface SnapToSellBatchResult {
  products: Product[];
  created_count: number;
  errors: SnapToSellBatchError[];
}

/** Parallel Snap-to-Sell: one product draft per uploaded image (up to 10). */
export async function snapToSellBatch(
  businessId: number,
  token: string,
  formData: FormData,
): Promise<SnapToSellBatchResult> {
  return authenticatedApiRequest<SnapToSellBatchResult>(
    `/commerce/${businessId}/snap-to-sell/batch/`,
    token,
    {
      method: "POST",
      body: formData,
    },
  );
}