"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { type CommercePage, type Product } from "@/lib/commerce";

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
      .catch((err) => setError(err instanceof Error ? err.message : "Store not found."));
  }, [params.slug]);

  if (error) return <main className="min-h-screen bg-kova-background p-10 text-center text-sm text-gray-600">{error}</main>;
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-kova-background"><p className="text-sm text-gray-500">Loading store...</p></main>;

  return (
    <main className="min-h-screen bg-kova-background">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <header className="border-b border-kova-border pb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">{data.page.business_name}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-kova-dark">{data.page.title || data.page.business_name}</h1>
          {data.page.tagline && <p className="mt-3 max-w-2xl text-lg text-gray-600">{data.page.tagline}</p>}
          {data.page.description && <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-600">{data.page.description}</p>}
          <div className="mt-5 flex flex-wrap gap-4 text-sm text-gray-500">
            {data.page.location && <span>{data.page.location}</span>}
            {data.page.phone && <span>{data.page.phone}</span>}
            {data.page.email && <span>{data.page.email}</span>}
          </div>
        </header>

        <section className="py-10">
          <h2 className="text-2xl font-semibold text-kova-dark">Products</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {data.products.map((product) => {
              const image = product.images.find((item) => item.is_primary) ?? product.images[0];
              return (
                <article key={product.id} className="overflow-hidden border border-kova-border bg-white">
                  <div className="aspect-square bg-kova-background">
                    {image?.url && <img src={image.url} alt={image.alt_text || product.name} className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-wide text-gray-400">{product.category}</p>
                    <h3 className="mt-2 font-semibold text-kova-dark">{product.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{product.short_description}</p>
                    {product.price && <p className="mt-4 font-semibold text-kova-green">{product.currency} {product.price}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
