import { apiRequest } from "@/lib/api";

export type StorefrontEventKind =
  | "store_view"
  | "product_view"
  | "whatsapp_header"
  | "whatsapp_product"
  | "search"
  | "filter";

export function trackStorefrontEvent(
  slug: string,
  kind: StorefrontEventKind,
  payload?: {
    productSlug?: string;
    path?: string;
    meta?: Record<string, string | number | boolean>;
  },
) {
  const body = {
    kind,
    product_slug: payload?.productSlug,
    path:
      payload?.path ||
      (typeof window !== "undefined" ? window.location.pathname : ""),
    meta: payload?.meta || {},
  };
  void apiRequest(`/commerce/public/${encodeURIComponent(slug)}/events/`, {
    method: "POST",
    body: JSON.stringify(body),
  }).catch(() => undefined);
}
