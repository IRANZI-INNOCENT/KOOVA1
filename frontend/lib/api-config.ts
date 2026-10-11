/**
 * Browser API base URL.
 *
 * In production, prefer `/api` on the site host so HttpOnly refresh cookies
 * are first-party (Railway site proxies to the API via next.config rewrites).
 */
export function getBrowserApiBaseUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api";

  const normalized = configured.replace(/\/$/, "");

  if (normalized.startsWith("/")) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${normalized}`;
    }

    const siteOrigin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";

    return `${siteOrigin.replace(/\/$/, "")}${normalized}`;
  }

  return normalized;
}

/**
 * Public API origin for Meta OAuth redirect URIs (must stay on the API host).
 */
export function getPublicApiBaseUrl(): string {
  const publicBase =
    process.env.NEXT_PUBLIC_API_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api";

  const normalized = publicBase.replace(/\/$/, "");

  if (normalized.startsWith("/")) {
    throw new Error(
      "NEXT_PUBLIC_API_PUBLIC_URL must be an absolute API URL for Meta OAuth.",
    );
  }

  return normalized;
}
