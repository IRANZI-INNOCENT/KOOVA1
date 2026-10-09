"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { StoreOrderButton } from "@/components/store/order-button";
import { StoreFrame } from "@/components/store/store-frame";
import { type CommercePage, type Product } from "@/lib/commerce";
import { formatPrice } from "@/lib/storefront";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface PublicProductResponse {
  page: CommercePage;
  product: Product;
  related_products: Product[];
}

export default function PublicProductPage() {
  const params = useParams<{ slug: string; productSlug: string }>();
  const [data, setData] = useState<PublicProductResponse | null>(null);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setData(null);
    setError("");
    setActiveImage(0);

    fetch(
      `${API_URL}/commerce/public/${params.slug}/products/${params.productSlug}/`,
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("This product is not available.");
        return response.json();
      })
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "This product is not available.",
        ),
      );
  }, [params.slug, params.productSlug]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-kova-background px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kova-orange/15">
          <span className="text-xl text-kova-orange">!</span>
        </div>
        <p className="mt-4 text-lg font-semibold text-kova-dark">
          Product unavailable
        </p>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
        <Link
          href={`/store/${params.slug}`}
          className="mt-5 text-sm font-bold text-kova-orange hover:underline"
        >
          Back to the store
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kova-background">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-kova-orange border-t-transparent" />
      </main>
    );
  }

  const { page, product, related_products: related } = data;
  const images = [...product.images].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const image = images[activeImage] ?? images[0];
  const facts = [
    product.brand && ["Brand", product.brand],
    product.material && ["Material", product.material],
    product.size && ["Size", product.size],
    product.color && ["Color", product.color],
    product.condition && ["Condition", product.condition],
    product.sku && ["SKU", product.sku],
  ].filter(Boolean) as [string, string][];

  return (
    <StoreFrame page={page} slug={params.slug}>
      {/* Breadcrumb */}
      <div className="border-b border-kova-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <Link
            href={`/store/${params.slug}`}
            className="text-sm font-semibold text-kova-orange hover:underline"
          >
            ← All products
          </Link>
        </div>
      </div>

      {/* ──── Product layout ──── */}
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Images */}
        <div>
          <div className="aspect-square overflow-hidden rounded-lg border border-kova-border bg-white">
            {image?.url ? (
              <img
                src={image.url}
                alt={image.alt_text || product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                No image
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
              {images.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  className={`aspect-square overflow-hidden rounded-lg border bg-white transition ${
                    index === activeImage
                      ? "border-kova-orange ring-1 ring-kova-orange/30"
                      : "border-kova-border hover:border-kova-orange/40"
                  }`}
                >
                  {item.url && (
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.category && (
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
              {product.category}
            </p>
          )}
          <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-kova-dark sm:text-3xl">
            {product.name}
          </h1>
          <p className="mt-4 text-2xl font-bold text-kova-orange">
            {formatPrice(product.currency, product.price)}
          </p>
          {product.stock != null && (
            <p className="mt-2 text-sm text-gray-500">
              {product.stock > 0
                ? `${product.stock} in stock`
                : "Currently unavailable"}
            </p>
          )}
          {product.short_description && (
            <p className="mt-5 text-base leading-7 text-gray-600">
              {product.short_description}
            </p>
          )}

          {/* WhatsApp CTA */}
          {page.whatsapp && (
            <StoreOrderButton
              slug={params.slug}
              productSlug={params.productSlug}
              productName={product.name}
              whatsapp={page.whatsapp}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-kova-orange px-6 text-sm font-bold text-kova-dark shadow-sm transition hover:bg-[#f0a46e] disabled:opacity-70"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
              Order on WhatsApp
            </StoreOrderButton>
          )}

          {/* Selling points */}
          {product.selling_points?.length > 0 && (
            <ul className="mt-8 space-y-2.5">
              {product.selling_points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-kova-dark"
                >
                  <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-kova-orange" />
                  {point}
                </li>
              ))}
            </ul>
          )}

          {/* Full description */}
          {product.description && (
            <div className="mt-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                About this product
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-gray-600">
                {product.description}
              </p>
            </div>
          )}

          {/* Specs table */}
          {facts.length > 0 && (
            <dl className="mt-8 overflow-hidden rounded-lg border border-kova-border bg-white">
              {facts.map(([label, value], i) => (
                <div
                  key={label}
                  className={`grid grid-cols-[120px_1fr] px-4 py-3 ${
                    i < facts.length - 1 ? "border-b border-kova-border" : ""
                  }`}
                >
                  <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    {label}
                  </dt>
                  <dd className="text-sm text-kova-dark">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* ──── Related products ──── */}
      {related.length > 0 && (
        <section className="border-t border-kova-border bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <h2 className="text-xl font-bold text-kova-dark">
              More from {page.business_name}
            </h2>
            <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => {
                const thumb =
                  item.images.find((img) => img.is_primary) ??
                  item.images[0];
                return (
                  <Link
                    key={item.id}
                    href={`/store/${params.slug}/${item.slug}`}
                    className="group overflow-hidden rounded-lg border border-kova-border bg-white transition hover:border-kova-orange/50 hover:shadow-sm"
                  >
                    <div className="aspect-square overflow-hidden bg-kova-background">
                      {thumb?.url && (
                        <img
                          src={thumb.url}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-3.5">
                      <p className="line-clamp-2 text-sm font-semibold text-kova-dark">
                        {item.name}
                      </p>
                      <p className="mt-1.5 text-sm font-bold text-kova-orange">
                        {formatPrice(item.currency, item.price)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </StoreFrame>
  );
}
