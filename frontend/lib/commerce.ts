import { authenticatedApiRequest } from "@/lib/api";

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
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: number;
  name: string;
  description: string;
  industry?: string;
  location: string;
  email: string;
  phone: string;
}

/**
 * Get the first business owned by the authenticated user.
 *
 * Kova currently operates on the first business associated with
 * the account. Multi-business switching can be added later without
 * changing the rest of the commerce API.
 */
export async function getBusiness(
  token: string,
): Promise<Business> {
  const businesses = await authenticatedApiRequest<Business[]>(
    "/businesses/",
    token,
  );

  if (!businesses.length) {
    throw new Error("No business is configured.");
  }

  return businesses[0];
}

/**
 * Get all products belonging to a business.
 */
export async function getProducts(
  businessId: number,
  token: string,
): Promise<Product[]> {
  return authenticatedApiRequest<Product[]>(
    `/commerce/${businessId}/products/`,
    token,
  );
}

/**
 * Get the business Commerce Page.
 */
export async function getCommercePage(
  businessId: number,
  token: string,
): Promise<CommercePage> {
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/`,
    token,
  );
}

/**
 * Update Commerce Page information.
 */
export async function saveCommercePage(
  businessId: number,
  token: string,
  payload: Partial<CommercePage>,
): Promise<CommercePage> {
  return authenticatedApiRequest<CommercePage>(
    `/commerce/${businessId}/page/`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
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

export function mediaSrc(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
  const origin = apiUrl.replace(/\/api\/?$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${origin}${path}`;
}

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
  contents: Content[];
  created_at: string;
}

export interface ConnectedChannels {
  connected: boolean;
  accounts: Array<{ id: number; platform: string; name: string }>;
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