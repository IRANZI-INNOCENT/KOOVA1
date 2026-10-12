import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid 308 on /api/.../ before the route handler proxies to Django.
  skipTrailingSlashRedirect: true,
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
