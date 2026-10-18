/** Canonical public site origin (no trailing slash). */
export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.FRONTEND_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

/**
 * Absolute API base for server-side fetches (Node).
 * Prefer the Django host directly so sitemap/SSR work without the Next proxy.
 */
export function getServerApiBaseUrl(): string {
  const direct =
    process.env.NEXT_PUBLIC_API_PUBLIC_URL ||
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api";

  const normalized = direct.replace(/\/$/, "");
  if (normalized.startsWith("/")) {
    return `${getSiteOrigin()}${normalized}`;
  }
  return normalized;
}

export function absoluteUrl(path: string): string {
  const origin = getSiteOrigin();
  if (!path) return origin;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
