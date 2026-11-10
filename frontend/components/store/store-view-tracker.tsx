"use client";

import { useEffect } from "react";

import { trackStorefrontEvent } from "@/lib/storefront-analytics";

export function StoreViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackStorefrontEvent(slug, "store_view");
  }, [slug]);
  return null;
}
