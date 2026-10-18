import type { CommercePage, Product } from "@/lib/commerce";
import { getServerApiBaseUrl } from "@/lib/site-url";

export interface PublicStoreResponse {
  page: CommercePage;
  products: Product[];
}

export interface PublicProductResponse {
  page: CommercePage;
  product: Product;
  related_products: Product[];
}

export interface SitemapStoreEntry {
  slug: string;
  updated_at: string;
  products: { slug: string; updated_at: string }[];
}

async function fetchJson<T>(path: string): Promise<T | null> {
  const base = getServerApiBaseUrl();
  try {
    const response = await fetch(`${base}${path}`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function fetchPublicStore(slug: string) {
  return fetchJson<PublicStoreResponse>(
    `/commerce/public/${encodeURIComponent(slug)}/`,
  );
}

export function fetchPublicProduct(slug: string, productSlug: string) {
  return fetchJson<PublicProductResponse>(
    `/commerce/public/${encodeURIComponent(slug)}/products/${encodeURIComponent(productSlug)}/`,
  );
}

export function fetchPublicSitemapCatalog() {
  return fetchJson<{ stores: SitemapStoreEntry[] }>(
    `/commerce/public/sitemap/`,
  );
}
