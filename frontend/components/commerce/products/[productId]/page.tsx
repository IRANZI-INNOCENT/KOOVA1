"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import { apiRequest } from "@/lib/api";

import { Product } from "@/components/commerce/types";
import { ProductForm } from "@/components/commerce/product-form";
import { ProductIntelligence } from "@/components/commerce/product-intelligence";

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  return (
    window.localStorage.getItem("access_token") ||
    window.localStorage.getItem("token")
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [businessId, setBusinessId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProduct();
  }, [productId]);

  async function loadProduct() {
    const token = getAccessToken();

    if (!token) {
      setError("You need to sign in to view this product.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const businesses = await apiRequest<any>("/businesses/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const business = Array.isArray(businesses)
        ? businesses[0]
        : businesses?.results?.[0];

      if (!business) {
        throw new Error("No business found.");
      }

      setBusinessId(business.id);

      const productsResponse = await apiRequest<any>(
        `/commerce/${business.id}/products/${productId}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setProduct(productsResponse);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load this product.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct(data: Partial<Product>) {
    const token = getAccessToken();

    if (!token || !businessId || !product) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const updated = await apiRequest<Product>(
        `/commerce/${businessId}/products/${product.id}/`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      setProduct(updated);
      setMessage("Product saved successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save the product.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <Link
            href="/workspace/commerce"
            className="text-sm font-medium text-[#176B4D] hover:underline"
          >
            ← Back to Commerce
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[#E5E7E5] bg-white p-8 text-sm text-[#69736D]">
            Loading product...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-[#E7C8C8] bg-[#FFF7F7] p-5 text-sm text-[#8C3939]">
            {error}
          </div>
        )}

        {!loading && product && (
          <>
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-medium text-[#176B4D]">
                  Commerce / Product
                </p>

                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#17211D]">
                  {product.name}
                </h1>

                <p className="mt-2 text-sm text-[#69736D]">
                  Manage the facts Kova uses to understand, market and sell
                  this product.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-[#E7F2ED] px-3 py-1.5 text-xs font-medium text-[#176B4D]">
                  {product.status}
                </span>

                {product.ai_generated && (
                  <span className="rounded-full bg-[#FFF2E7] px-3 py-1.5 text-xs font-medium text-[#925D2B]">
                    Kova analyzed
                  </span>
                )}
              </div>
            </div>

            {message && (
              <div className="mb-6 rounded-xl border border-[#BFDCCE] bg-[#F1F9F5] px-4 py-3 text-sm text-[#176B4D]">
                {message}
              </div>
            )}

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ProductForm
                product={product}
                saving={saving}
                onSave={saveProduct}
              />

              <ProductIntelligence product={product} />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}