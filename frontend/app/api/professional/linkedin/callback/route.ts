import { NextRequest, NextResponse } from "next/server";

/**
 * LinkedIn OAuth lands here on the site host. Proxy to Django and forward
 * redirects (Connect page) — rewrites alone can miss env or redirect handling.
 */
function apiBase(): string {
  const raw =
    process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_API_PUBLIC_URL ||
    "";
  return raw.replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  const base = apiBase();
  if (!base) {
    const connect = new URL("/workspace/linkedin/connect", request.url);
    connect.searchParams.set("error", "proxy");
    return NextResponse.redirect(connect);
  }

  const target = `${base}/professional/linkedin/callback/${request.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "manual",
      headers: {
        Accept: "text/html,application/json",
      },
    });
  } catch {
    const connect = new URL("/workspace/linkedin/connect", request.url);
    connect.searchParams.set("error", "api_unreachable");
    return NextResponse.redirect(connect);
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get("location");
    if (location) {
      return NextResponse.redirect(location);
    }
  }

  const connect = new URL("/workspace/linkedin/connect", request.url);
  connect.searchParams.set("error", "callback");
  return NextResponse.redirect(connect);
}
