"use client";

import { useState, type ReactNode } from "react";

import { placeStoreOrder } from "@/lib/operations";
import { whatsappLink } from "@/lib/storefront";

export function StoreOrderButton({
  slug,
  productSlug,
  productName,
  whatsapp,
  className,
  children,
}: {
  slug: string;
  productSlug: string;
  productName: string;
  whatsapp: string;
  className?: string;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  function onOrder() {
    if (busy) return;
    const url = whatsappLink(whatsapp, productName);
    window.open(url, "_blank", "noopener,noreferrer");
    setBusy(true);
    placeStoreOrder(slug, productSlug)
      .catch(() => undefined)
      .finally(() => setBusy(false));
  }

  return (
    <button type="button" onClick={onOrder} disabled={busy} className={className}>
      {children}
    </button>
  );
}
