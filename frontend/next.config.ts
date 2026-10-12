import type { NextConfig } from "next";

const apiProxyTarget = (
  process.env.API_PROXY_TARGET || ""
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Django API routes use trailing slashes (APPEND_SLASH). Without this, Next
  // 308-strips the slash and Django 301-adds it → redirect loop on /api/* proxy.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
