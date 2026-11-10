"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

import { placeStoreOrder } from "@/lib/operations";
import { orderMessageText, whatsappOrderLink } from "@/lib/storefront";

function absoluteImageUrl(raw?: string) {
  const value = (raw || "").trim();
  if (!value || typeof window === "undefined") return "";
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.pathname.startsWith("/media")) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
    return parsed.href;
  } catch {
    return value;
  }
}

async function shareProductPhoto(imageUrl: string, text: string, fileName: string) {
  if (!imageUrl || typeof navigator === "undefined" || !navigator.share) return false;
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return false;
    const blob = await response.blob();
    const type = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
    const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const file = new File([blob], `${fileName}.${extension}`, { type });
    const payload = { files: [file], text, title: fileName };
    if (navigator.canShare && !navigator.canShare(payload)) return false;
    await navigator.share(payload);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return true;
    return false;
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

  async function onOrder() {
    if (busy) return;
    setBusy(true);
    const productUrl = `${window.location.origin}/store/${slug}/${productSlug}`;
    const photo = absoluteImageUrl(imageUrl);
    const text = orderMessageText({
      productName,
      productUrl,
      priceLabel,
      service,
    });
    const shared = await shareProductPhoto(photo, text, productSlug);
    if (!shared) {
      window.open(
        whatsappOrderLink({
          number: whatsapp,
          productName,
          productUrl,
          priceLabel,
          service,
        }),
        "_blank",
        "noopener,noreferrer",
      );
    }
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
