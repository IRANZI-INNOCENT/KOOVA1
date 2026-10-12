import { getBrowserApiBaseUrl } from "@/lib/api-config";

/** Where the browser should load product photos (same-origin /media proxy). */
export function getMediaBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000";
  return site.replace(/\/$/, "");
}

/** Django host that stores uploaded files (API service). */
export function getUpstreamMediaBaseUrl(): string {
  const apiPublic = process.env.NEXT_PUBLIC_API_PUBLIC_URL?.trim();
  if (apiPublic) {
    return apiPublic.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  const proxy = process.env.API_PROXY_TARGET?.trim();
  if (proxy) {
    return proxy.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
  return getBrowserApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
}

function normalizeMediaPath(raw: string): string {
  let path = raw.startsWith("/") ? raw : `/${raw}`;
  if (!path.startsWith("/media/") && path !== "/media") {
    path = `/media/${path.replace(/^\/+/, "")}`;
  }
  return path;
}

/**
 * Resolve product/content image URLs for <img src>.
 * Works with NEXT_PUBLIC_API_URL=/api by serving via /media on the site host.
 */
export function mediaSrc(url: string): string {
  const raw = (url || "").trim();
  if (!raw) {
    return "";
  }

  const toSiteMedia = (pathname: string) =>
    `${getMediaBaseUrl()}${normalizeMediaPath(pathname)}`;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1"
      ) {
        return toSiteMedia(parsed.pathname);
      }
      const upstream = getUpstreamMediaBaseUrl();
      if (upstream && parsed.pathname.startsWith("/media")) {
        try {
          const upstreamHost = new URL(upstream).host;
          if (parsed.host === upstreamHost) {
            return toSiteMedia(parsed.pathname);
          }
        } catch {
          /* keep absolute URL */
        }
      }
      return raw;
    } catch {
      return raw;
    }
  }

  return toSiteMedia(raw);
}
