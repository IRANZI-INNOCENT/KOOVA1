import type { MetadataRoute } from "next";

const ICONS = [
  {
    src: "/icons/icon-192.png",
    sizes: "192x192",
    type: "image/png",
  },
];

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/workspace",
    name: "KCOVA",
    short_name: "KCOVA",
    description:
      "Social media, customer replies, and a WhatsApp-ready store for small businesses.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
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
    shortcuts: [
      { name: "Home", url: "/workspace", icons: ICONS },
      { name: "Post", url: "/workspace/social", icons: ICONS },
      { name: "Snap", url: "/workspace/commerce/snap-to-sell", icons: ICONS },
      { name: "Shop", url: "/workspace/commerce/products", icons: ICONS },
    ],
  };
}
