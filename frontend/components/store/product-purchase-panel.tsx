"use client";

import { useEffect, useMemo, useState } from "react";

import type { CommercePage, Product } from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";
import { placeStoreOrder } from "@/lib/operations";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import {
  buildWhatsAppOrderMessage,
  formatPrice,
  productAttributeFacts,
  whatsappNumberForLink,
} from "@/lib/storefront";

function parseOptions(value?: string): string[] {
  const raw = (value || "").trim();
  if (!raw) return [];
  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [raw];
}

export function ProductPurchasePanel({
  slug,
  productSlug,
  page,
  product,
}: {
  slug: string;
  productSlug: string;
  page: CommercePage;
  product: Product;
}) {
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const colors = useMemo(() => parseOptions(product.color), [product.color]);
  const sizes = useMemo(() => parseOptions(product.size), [product.size]);
  const [color, setColor] = useState(colors[0] || "");
  const [size, setSize] = useState(sizes[0] || "");

  const unavailable =
    product.offering_kind !== "service" &&
    product.stock != null &&
    product.stock <= 0;

  const maxQty =
    product.stock != null && product.stock > 0
      ? Math.min(product.stock, 99)
      : 99;

  useEffect(() => {
    trackStorefrontEvent(slug, "product_view", { productSlug });
  }, [slug, productSlug]);

  const facts = productAttributeFacts(product);
  const priceLabel = formatPrice(product.currency, product.price);

  async function onWhatsAppOrder() {
    if (!page.whatsapp || busy || unavailable) return;
    setBusy(true);
    const productUrl = `${window.location.origin}/store/${slug}/${productSlug}`;
    const text = buildWhatsAppOrderMessage({
      businessName: page.business_name || page.title,
      productName: product.name,
      productUrl,
      currency: product.currency,
      unitPrice: product.price,
      quantity,
      size: sizes.length > 1 ? size : product.size,
      color: colors.length > 1 ? color : product.color,
      service: product.offering_kind === "service",
    });

    trackStorefrontEvent(slug, "whatsapp_product", {
      productSlug,
      meta: { quantity },
    });

    const imageUrl = mediaSrc(
      product.images.find((i) => i.is_primary)?.url ||
        product.images[0]?.url ||
        "",
    );
    const wa = `https://wa.me/${whatsappNumberForLink(page.whatsapp)}?text=${encodeURIComponent(text)}`;
    window.open(wa, "_blank", "noopener,noreferrer");

    const noteParts = [
      size ? `Size: ${size}` : "",
      color ? `Colour: ${color}` : "",
      `Qty: ${quantity}`,
    ].filter(Boolean);
    void placeStoreOrder(slug, productSlug, "", quantity, noteParts.join(" · "))
      .catch(() => undefined)
      .finally(() => setBusy(false));
  }

  return (
    <div>
      {product.category ? (
        <p
          className="text-xs font-bold uppercase tracking-[0.16em]"
          style={{ color: "var(--store-accent)" }}
        >
          {product.category}
        </p>
      ) : null}
      <h1
        className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl"
        style={{ color: "var(--store-secondary)" }}
      >
        {product.name}
      </h1>
      <p className="mt-4 text-2xl font-bold tabular-nums" style={{ color: "var(--store-accent)" }}>
        {priceLabel}
      </p>
      {product.offering_kind !== "service" && product.stock != null ? (
        <p className="mt-1 text-sm text-kova-muted">
          {product.stock > 0 ? `${product.stock} available` : "Currently unavailable"}
        </p>
      ) : null}

      {colors.length > 1 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-kova-muted">Colour</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setColor(option)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  color === option
                    ? "border-kova-green bg-kova-green text-white"
                    : "border-kova-border bg-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sizes.length > 1 ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-kova-muted">Size</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sizes.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSize(option)}
                className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${
                  size === option
                    ? "border-kova-green bg-kova-green text-white"
                    : "border-kova-border bg-white"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {product.offering_kind !== "service" ? (
        <label className="mt-5 flex items-center gap-3 text-sm">
          <span className="font-medium text-kova-dark">Quantity</span>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Math.min(maxQty, Number(e.target.value) || 1)))
            }
            className="h-10 w-20 rounded-lg border border-kova-border px-2 text-center"
          />
        </label>
      ) : null}

      {page.whatsapp ? (
        <button
          type="button"
          disabled={busy || unavailable}
          onClick={() => void onWhatsAppOrder()}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md px-6 text-sm font-semibold disabled:opacity-60 sm:w-auto"
          style={{ backgroundColor: "var(--store-accent)", color: "var(--store-on-accent)" }}
        >
          {product.offering_kind === "service"
            ? "Message on WhatsApp"
            : "Order on WhatsApp"}
        </button>
      ) : (
        <p className="mt-6 text-sm text-kova-muted">
          WhatsApp ordering is not set up for this shop yet.
        </p>
      )}

      <p className="mt-2 text-xs text-kova-muted">
        Opens WhatsApp with your selections. The merchant confirms availability — this is not a
        payment.
      </p>

      {product.selling_points?.length > 0 ? (
        <ul className="mt-8 space-y-2.5">
          {product.selling_points.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-kova-dark">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kova-orange" />
              {point}
            </li>
          ))}
        </ul>
      ) : null}

      {facts.length > 0 ? (
        <dl className="mt-8 overflow-hidden rounded-lg border border-kova-border bg-white">
          {facts.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-1 gap-0.5 px-4 py-3 sm:grid-cols-[120px_1fr] ${
                i < facts.length - 1 ? "border-b border-kova-border" : ""
              }`}
            >
              <dt className="text-xs font-bold uppercase tracking-wide text-kova-muted">
                {row.label}
              </dt>
              <dd className="text-sm text-kova-dark">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
