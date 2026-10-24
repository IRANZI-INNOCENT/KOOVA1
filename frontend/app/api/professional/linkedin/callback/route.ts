import { NextRequest, NextResponse } from "next/server";

/**
 * LinkedIn OAuth lands here on the site host. Proxy to Django and forward
 * redirects (Connect page) — rewrites alone can miss env or redirect handling.
 *
 * `request.url` on Railway is often https://0.0.0.0:8080 because that is the
 * container bind address. Never send the browser there.
 */
const BIND_HOSTS = new Set(["0.0.0.0", "127.0.0.1", "localhost", "::1"]);

function apiBase(): string {
  const raw =
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_PUBLIC_URL ||
    "";
  return raw.replace(/\/$/, "");
}

function hostIsPublic(host: string): boolean {
  const name = host.split(":")[0]?.replace(/^\[|\]$/g, "").toLowerCase();
  return Boolean(name) && !BIND_HOSTS.has(name);
}

function originFrom(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (!hostIsPublic(url.host)) return "";
    return url.origin;
  } catch {
    return "";
  }
}

/** Public site origin the browser can open. */
function publicSiteOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || "";
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  if (hostIsPublic(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host")?.trim() || "";
  if (hostIsPublic(host)) {
    const proto = request.nextUrl.protocol === "http:" ? "http" : "https";
    return `${proto}://${host}`;
  }

  return (
    originFrom(process.env.NEXT_PUBLIC_SITE_URL || "") ||
    originFrom(process.env.FRONTEND_URL || "") ||
    ""
  );
}

function connectUrl(request: NextRequest, search = ""): URL | null {
  const origin = publicSiteOrigin(request);
  if (!origin) return null;
  const url = new URL("/workspace/linkedin/connect", origin);
  if (search) {
    url.search = search.startsWith("?") ? search : `?${search}`;
  }
  return url;
}

export async function GET(request: NextRequest) {
  const base = apiBase();
  const origin = publicSiteOrigin(request);
  if (!base) {
    const connect = connectUrl(request, "?error=proxy");
    if (!connect) {
      return NextResponse.json({ detail: "Site origin is not configured." }, { status: 500 });
    }
    return NextResponse.redirect(connect);
  }

  const target = `${base}/professional/linkedin/callback/${request.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "manual",
      headers: {
        Accept: "text/html,application/json",
        ...(origin ? { "X-Kova-Site-Origin": origin } : {}),
      },
    });
  } catch {
    const connect = connectUrl(request, "?error=api_unreachable");
    if (!connect) {
      return NextResponse.json({ detail: "API is unreachable." }, { status: 502 });
    }
    return NextResponse.redirect(connect);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location");
    if (location) {
      return redirectToConnect(request, location);
    }
  }

  const connect = connectUrl(request, "?error=callback");
  if (!connect) {
    return NextResponse.json({ detail: "Could not finish LinkedIn connect." }, { status: 502 });
  }
  return NextResponse.redirect(connect);
}

/** Send the browser to Connect on a public host, keeping Django's query string. */
function redirectToConnect(request: NextRequest, location: string) {
  const fallback = connectUrl(request, "?error=callback");
  let target: URL;
  try {
    const base = publicSiteOrigin(request) || "https://ai.kcova.com";
    target = new URL(location, base);
  } catch {
    return fallback
      ? NextResponse.redirect(fallback)
      : NextResponse.json({ detail: "Could not finish LinkedIn connect." }, { status: 502 });
  }
  const path = target.pathname.replace(/\/$/, "") || "/";
  if (path !== "/workspace/linkedin/connect") {
    return fallback
      ? NextResponse.redirect(fallback)
      : NextResponse.json({ detail: "Could not finish LinkedIn connect." }, { status: 502 });
  }

  const upstreamOrigin = originFrom(target.origin);
  const origin = upstreamOrigin || publicSiteOrigin(request);
  if (!origin) {
    return NextResponse.json({ detail: "Could not finish LinkedIn connect." }, { status: 502 });
  }
  const local = new URL("/workspace/linkedin/connect", origin);
  local.search = target.search;
  return NextResponse.redirect(local);
}
