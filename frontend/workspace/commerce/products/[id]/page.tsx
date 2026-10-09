"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { getBusiness, getProducts, updateProduct, type Product } from "@/lib/commerce";
import { useAuth } from "@/lib/auth-context";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !accessToken || !isAuthenticated) return;
    const token = accessToken;

    async function load() {
      try {
        const business = await getBusiness(token);
        const products = await getProducts(business.id, token);
        const found = products.find((item) => item.id === Number(params.id));
        if (!found) {
          router.replace("/workspace/commerce/products");
          return;
        }
        setBusinessId(business.id);
        setProduct(found);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "We couldn't load the product.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [authLoading, accessToken, isAuthenticated, params.id, router]);

  async function save() {
    if (!product || !businessId || !accessToken) return;
    setSaving(true);
    setError("");

    try {
      const updated = await updateProduct(
        businessId,
        product.id,
        accessToken,
        {
          name: product.name,
          category: product.category,
          price: product.price,
          currency: product.currency,
          stock: product.stock,
          short_description: product.short_description,
          description: product.description,
          seo_title: product.seo_title,
          seo_description: product.seo_description,
          status: product.status,
        },
      );
      setProduct(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't save the product.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading || !product) {
    return <main className="flex min-h-screen items-center justify-center bg-kova-background"><p className="text-sm text-gray-500">Loading product...</p></main>;
  }

  const primary = product.images.find((item) => item.is_primary) ?? product.images[0];

  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <Link href="/workspace/commerce/products" className="text-sm font-semibold text-kova-green">← Products</Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
            <div>
              <div className="aspect-square bg-white">
                {primary?.url && <img src={primary.url} alt={product.name} className="h-full w-full object-cover" />}
              </div>
              <div className="mt-5 border border-kova-border bg-white p-5">
                <p className="text-xs uppercase tracking-wide text-gray-400">Kova intelligence</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">{product.ai_summary || "No AI summary."}</p>
                {product.uncertain_attributes.length > 0 && (
                  <div className="mt-5 border-t border-kova-border pt-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Needs confirmation</p>
                    <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                      {product.uncertain_attributes.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">Business Asset</p>
              <h1 className="mt-3 text-3xl font-semibold text-kova-dark">{product.name}</h1>

              <div className="mt-8 space-y-6">
                <section className="border border-kova-border bg-white p-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Input label="Product name" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
                    <Input label="Category" value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} />
                    <Input label="Price" value={product.price ?? ""} onChange={(e) => setProduct({ ...product, price: e.target.value || null })} />
                    <Input label="Currency" value={product.currency} onChange={(e) => setProduct({ ...product, currency: e.target.value })} />
                    <Input label="Stock" type="number" value={product.stock ?? ""} onChange={(e) => setProduct({ ...product, stock: e.target.value ? Number(e.target.value) : null })} />
                    <Input label="Status" value={product.status} onChange={(e) => setProduct({ ...product, status: e.target.value as Product["status"] })} />
                  </div>
                </section>

                <section className="border border-kova-border bg-white p-6">
                  <h2 className="font-semibold text-kova-dark">Description</h2>
                  <textarea value={product.short_description} onChange={(e) => setProduct({ ...product, short_description: e.target.value })} rows={3} className="mt-4 w-full border border-kova-border px-4 py-3 text-sm" />
                  <textarea value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} rows={8} className="mt-4 w-full border border-kova-border px-4 py-3 text-sm" />
                </section>

                <section className="border border-kova-border bg-white p-6">
                  <h2 className="font-semibold text-kova-dark">SEO</h2>
                  <div className="mt-4 space-y-4">
                    <Input label="SEO title" value={product.seo_title} onChange={(e) => setProduct({ ...product, seo_title: e.target.value })} />
                    <textarea value={product.seo_description} onChange={(e) => setProduct({ ...product, seo_description: e.target.value })} rows={4} className="w-full border border-kova-border px-4 py-3 text-sm" />
                  </div>
                </section>

                {error && <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                <div className="flex justify-end">
                  <Button onClick={save} loading={saving} disabled={saving}>Save Product</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
