"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/workspace/app-shell";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  getBusiness,
  getCommercePage,
  getProducts,
  type Business,
  type CommercePage,
  type Product,
} from "@/lib/commerce";
import { useAuth } from "@/lib/auth-context";

function ProductCard({ product }: { product: Product }) {
  const image = product.images.find((item) => item.is_primary) ?? product.images[0];

  return (
    <Link
      href={`/workspace/commerce/products/${product.id}`}
      className="overflow-hidden border border-kova-border bg-white transition hover:border-kova-green"
    >
      <div className="aspect-square bg-kova-background">
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
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-kova-dark">{product.name}</h3>
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {product.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{product.category || "Uncategorized"}</p>
        {product.price && (
          <p className="mt-3 font-semibold text-kova-green">
            {product.currency} {product.price}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function CommercePage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState<CommercePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !accessToken || !isAuthenticated) return;

    const token = accessToken;

    async function load() {
      try {
        const currentBusiness = await getBusiness(token);
        const [currentProducts, currentPage] = await Promise.all([
          getProducts(currentBusiness.id, token),
          getCommercePage(currentBusiness.id, token),
        ]);
        setBusiness(currentBusiness);
        setProducts(currentProducts);
        setPage(currentPage);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "We couldn't load Commerce.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, accessToken, isAuthenticated]);

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-kova-background">
        <p className="text-sm text-gray-500">Loading Commerce...</p>
      </main>
    );
  }

  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
                Commerce
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
                Turn your products into a digital storefront.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                Add products with Snap to Sell, let Kova understand them, and publish
                a commerce page for your customers.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/workspace/commerce/snap-to-sell">
                <Button>Snap to Sell</Button>
              </Link>
              <Link href="/workspace/commerce/commerce-page">
                <Button variant="secondary">Commerce Page</Button>
              </Link>
            </div>
          </header>

          {error && (
            <div className="mt-8 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="border border-kova-border bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Products</p>
              <p className="mt-2 text-3xl font-semibold text-kova-dark">{products.length}</p>
            </div>
            <div className="border border-kova-border bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Active</p>
              <p className="mt-2 text-3xl font-semibold text-kova-dark">
                {products.filter((product) => product.status === "active").length}
              </p>
            </div>
            <div className="border border-kova-border bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Commerce Page
              </p>
              <p className="mt-2 text-lg font-semibold text-kova-dark">
                {page?.is_published ? "Published" : "Draft"}
              </p>
            </div>
          </section>

          <section className="mt-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-kova-dark">Products</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {business?.name} business assets available to Kova.
                </p>
              </div>
              <Link
                href="/workspace/commerce/products"
                className="text-sm font-semibold text-kova-green"
              >
                View all →
              </Link>
            </div>

            {products.length ? (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {products.slice(0, 8).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="mt-5 border border-dashed border-kova-border bg-white p-12 text-center">
                <h3 className="font-semibold text-kova-dark">Your catalog is empty.</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Upload a product photo and let Kova build the first product asset for you.
                </p>
                <Link href="/workspace/commerce/snap-to-sell" className="mt-5 inline-block">
                  <Button>Start with Snap to Sell</Button>
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
