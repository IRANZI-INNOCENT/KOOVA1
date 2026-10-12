import { NextRequest, NextResponse } from "next/server";

/** Django API base, e.g. https://api-host.up.railway.app/api */
export function getApiProxyTarget(): string {
  return (process.env.API_PROXY_TARGET || "").replace(/\/$/, "");
}

function buildUpstreamUrl(
  pathSegments: string[],
  search: string,
): string {
  const base = getApiProxyTarget();
  const subPath = pathSegments.filter(Boolean).join("/");
  const path = subPath ? `${base}/${subPath}/` : `${base}/`;
  return search ? `${path}${search}` : path;
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

/** Node fetch decompresses gzip; forwarding these breaks the browser. */
const STRIP_FROM_RESPONSE = new Set([
  "content-encoding",
  "content-length",
]);

/**
 * Proxy /api/* to Django at runtime (Railway env applies without rebuild).
 * Always uses trailing slashes so APPEND_SLASH does not 301-loop via the site.
 */
export async function proxyApiRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const base = getApiProxyTarget();
  if (!base) {
    return NextResponse.json(
      { detail: "Service unavailable." },
      { status: 503 },
    );
  }

  const upstreamUrl = buildUpstreamUrl(
    pathSegments,
    request.nextUrl.search,
  );

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === "accept-encoding") {
      return;
    }
    headers.set(key, value);
  });
  headers.set("Accept-Encoding", "identity");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (
    request.method !== "GET" &&
    request.method !== "HEAD"
  ) {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, init);
  } catch {
    return NextResponse.json(
      { detail: "Service unavailable." },
      { status: 503 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || STRIP_FROM_RESPONSE.has(lower)) {
      return;
    }
    responseHeaders.append(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
