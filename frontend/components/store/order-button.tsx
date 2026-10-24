"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { placeStoreOrder } from "@/lib/operations";
import { whatsappOrderLink } from "@/lib/storefront";

function publicMediaUrl(imageUrl?: string) {
  const raw = (imageUrl || "").trim();
  if (!raw || typeof window === "undefined") return undefined;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.pathname.startsWith("/media")) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
    return parsed.href;
  } catch {
    return raw;
  }
}

export function StoreOrderButton({
  slug,
  productSlug,
  productName,
  whatsapp,
  imageUrl,
  priceLabel,
  service,
  className,
  style,
  children,
}: {
  slug: string;
  productSlug: string;
  productName: string;
  whatsapp: string;
  imageUrl?: string;
  priceLabel?: string;
  service?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  function onOrder() {
    if (busy) return;
    const productUrl = `${window.location.origin}/store/${slug}/${productSlug}`;
    const url = whatsappOrderLink({
      number: whatsapp,
      productName,
      productUrl,
      imageUrl: publicMediaUrl(imageUrl),
      priceLabel,
      service,
    });
    window.open(url, "_blank", "noopener,noreferrer");
    setBusy(true);
    placeStoreOrder(slug, productSlug)
      .catch(() => undefined)
      .finally(() => setBusy(false));
  }

  return (
    <button
      type="button"
      onClick={onOrder}
      disabled={busy}
      className={className}
      style={style}
    >
      {children}
    </button>
  );
}
