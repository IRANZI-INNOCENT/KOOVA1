import { NextResponse } from "next/server";

/**
 * IndexNow key file. Must match INDEXNOW_KEY on the API service.
 * https://www.indexnow.org/documentation
 */
export async function GET() {
  const key = (process.env.INDEXNOW_KEY || "").trim();
  if (!key) {
    return new NextResponse("IndexNow is not configured.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new NextResponse(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
