"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { StoreOrderButton } from "@/components/store/order-button";
import { StoreFrame } from "@/components/store/store-frame";
import { type CommercePage, type Product } from "@/lib/commerce";
import { formatPrice } from "@/lib/storefront";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface PublicResponse {
  page: CommercePage;
  products: Product[];
}

export default function PublicStorePage() {
  const params = useParams<{ slug: string }>();
  const [data, setData] = useState<PublicResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/commerce/public/${params.slug}/`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Store not found.");
        return response.json();
      })
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Store not found."),
      );
  }, [params.slug]);

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-kova-background p-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-kova-orange/15">
          <span className="text-xl text-kova-orange">?</span>
        </div>
        <p className="mt-4 text-lg font-semibold text-kova-dark">
          Store not found
        </p>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
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

  const { page, products } = data;
  const hasWhatsApp = !!page.whatsapp;

  return (
    <StoreFrame page={page} slug={params.slug}>
      {/* ──── Products ──── */}
      <section
        id="products"
        className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
      >
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-bold tracking-tight text-kova-dark">
            Products
          </h2>
          <span className="text-sm font-medium text-gray-400">
            {products.length} item{products.length !== 1 ? "s" : ""}
          </span>
        </div>

        {products.length === 0 ? (
          <div className="mt-6 rounded-lg border-2 border-dashed border-kova-border bg-white p-10 text-center">
            <p className="text-sm text-gray-500">
              No products listed yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const image =
                product.images.find((i) => i.is_primary) ??
                product.images[0];
              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-lg border border-kova-border bg-white transition hover:border-kova-orange/50 hover:shadow-sm"
                >
                  <Link
                    href={`/store/${params.slug}/${product.slug}`}
                    className="block"
                  >
                    <div className="aspect-square overflow-hidden bg-kova-background">
                      {image?.url ? (
                        <img
                          src={image.url}
                          alt={image.alt_text || product.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-gray-400">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="px-3.5 pt-3">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-kova-dark">
                        {product.name}
                      </h3>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between gap-2 px-3.5 pb-3.5 pt-2">
                    <p className="truncate text-sm font-bold text-kova-orange">
                      {formatPrice(product.currency, product.price)}
                    </p>
                    {hasWhatsApp && (
                      <StoreOrderButton
                        slug={params.slug}
                        productSlug={product.slug}
                        productName={product.name}
                        whatsapp={page.whatsapp}
                        className="inline-flex shrink-0 items-center rounded-md bg-kova-orange/10 px-2.5 py-1 text-xs font-bold text-kova-orange transition hover:bg-kova-orange/20 disabled:opacity-70"
                      >
                        Order
                      </StoreOrderButton>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </StoreFrame>
  );
}
