import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kova",
    short_name: "Kova",
    description:
      "Social media, customer replies, and commerce for your business.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFAF8",
    theme_color: "#176B4D",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
