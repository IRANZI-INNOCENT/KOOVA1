"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/workspace/app-shell";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { getBusiness, getProducts, type Product } from "@/lib/commerce";
import { useAuth } from "@/lib/auth-context";

export default function ProductsPage() {
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !accessToken || !isAuthenticated) return;
    const token = accessToken;

    async function load() {
      try {
        const business = await getBusiness(token);
        setProducts(await getProducts(business.id, token));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "We couldn't load products.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, accessToken, isAuthenticated]);

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-kova-background"><p className="text-sm text-gray-500">Loading products...</p></main>;
  }

  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link href="/workspace/commerce" className="text-sm font-semibold text-kova-green">← Commerce</Link>
              <h1 className="mt-5 text-3xl font-semibold text-kova-dark">Products</h1>
              <p className="mt-2 text-sm text-gray-500">Your products are business assets Kova can understand and use.</p>
            </div>
            <Link href="/workspace/commerce/snap-to-sell"><Button>Snap to Sell</Button></Link>
          </div>

          {error && <div className="mt-8 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {products.length ? (
            <div className="mt-8 overflow-hidden border border-kova-border bg-white">
              <div className="grid grid-cols-[1fr_140px_120px_120px] gap-4 border-b border-kova-border bg-kova-background px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <span>Product</span><span>Price</span><span>Status</span><span>AI</span>
              </div>
              {products.map((product) => {
                const image = product.images.find((item) => item.is_primary) ?? product.images[0];
                return (
                  <Link key={product.id} href={`/workspace/commerce/products/${product.id}`} className="grid grid-cols-[1fr_140px_120px_120px] items-center gap-4 border-b border-kova-border px-5 py-4 last:border-b-0 hover:bg-kova-background">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="h-14 w-14 shrink-0 bg-kova-background">
                        {image?.url && <img src={image.url} alt={product.name} className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-kova-dark">{product.name}</p>
                        <p className="truncate text-xs text-gray-500">{product.category || "Uncategorized"}</p>
                      </div>
                    </div>
                    <span className="text-sm text-kova-dark">{product.price ? `${product.currency} ${product.price}` : "—"}</span>
                    <span className="text-xs uppercase tracking-wide text-gray-500">{product.status}</span>
                    <span className="text-xs font-medium text-kova-green">{product.ai_generated ? "Understood" : "Manual"}</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 border border-dashed border-kova-border bg-white p-12 text-center">
              <p className="font-semibold text-kova-dark">No products yet.</p>
              <p className="mt-2 text-sm text-gray-500">Start with a product photo.</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
