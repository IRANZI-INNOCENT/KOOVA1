import { NextRequest, NextResponse } from "next/server";

import { getUpstreamMediaBaseUrl } from "@/lib/media";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

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

const STRIP_FROM_RESPONSE = new Set([
  "content-encoding",
  "content-length",
]);

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const base = getUpstreamMediaBaseUrl();
  if (!base) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const { path } = await context.params;
  const subPath = (path ?? []).filter(Boolean).join("/");
  const upstreamUrl = `${base}/media/${subPath}${request.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { "Accept-Encoding": "identity" },
      redirect: "follow",
    });
  } catch {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || STRIP_FROM_RESPONSE.has(lower)) {
      return;
    }
    responseHeaders.append(key, value);
  });

  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set(
      "cache-control",
      "public, max-age=3600, stale-while-revalidate=86400",
    );
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
