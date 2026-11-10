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
 * Always serves KCOVA uploads through the site origin (/media proxy) so
 * workspace and storefront work when the API lives on a different host.
 */
export function mediaSrc(url: string): string {
  const raw = (url || "").trim();
  if (!raw) {
    return "";
  }

  const siteMedia = (pathname: string, search = "") => {
    const path = pathname.startsWith("/media/")
      ? pathname
      : normalizeMediaPath(pathname);
    return `${getMediaBaseUrl()}${path}${search}`;
  };

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      let path = parsed.pathname;
      if (path.startsWith("/api/media/")) {
        path = path.slice("/api".length);
      }
      if (path.startsWith("/media/") || path === "/media") {
        return `${getMediaBaseUrl()}${path}${parsed.search}`;
      }
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1"
      ) {
        return siteMedia(path, parsed.search);
      }
      return raw;
    } catch {
      return raw;
    }
  }

  return siteMedia(raw);
}
