"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { SeoHealthCard } from "@/components/commerce/seo-health-card";
import { WORKSPACE_PAGE } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  getBusiness,
  getProducts,
  getProductContentPlans,
  polishProduct,
  updateProduct,
  type Product,
  type ProductContentPlan,
} from "@/lib/commerce";
import { useAuth } from "@/lib/auth-context";

const STATUS_LABELS: Record<Product["status"], string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

const STATUS_COLORS: Record<Product["status"], string> = {
  draft: "text-gray-500",
  active: "text-kova-green",
  archived: "text-gray-400",
};

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, accessToken } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [businessId, setBusinessId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [statusAction, setStatusAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [contentPlan, setContentPlan] = useState<ProductContentPlan | null>(
    null,
  );

  useEffect(() => {
    if (authLoading || !accessToken || !isAuthenticated) return;
    const token = accessToken;

    async function load() {
      try {
        const business = await getBusiness(token);
        const [products, plans] = await Promise.all([
          getProducts(business.id, token),
          getProductContentPlans(business.id, token).catch(
            () => [] as ProductContentPlan[],
          ),
        ]);
        const found = products.find((item) => item.id === Number(params.id));
        if (!found) {
          router.replace("/workspace/commerce/products");
          return;
        }
        setBusinessId(business.id);
        setProduct(found);
        setContentPlan(
          plans.find((plan) => plan.product_id === found.id) ?? null,
        );
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load the product.",
        );
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
    setSuccess("");
    try {
      const updated = await updateProduct(businessId, product.id, accessToken, {
        name: product.name,
        category: product.category,
        price: product.price,
        currency: product.currency,
        stock: product.stock,
        brand: product.brand,
        material: product.material,
        size: product.size,
        color: product.color,
        condition: product.condition,
        short_description: product.short_description,
        description: product.description,
        seo_title: product.seo_title,
        seo_description: product.seo_description,
        status: product.status,
      });
      setProduct(updated);
      setSuccess("Product saved.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not save the product.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function polish() {
    if (!product || !businessId || !accessToken) return;
    setPolishing(true);
    setError("");
    setSuccess("");
    try {
      const updated = await polishProduct(businessId, product.id, accessToken);
      setProduct(updated);
      setSuccess(
        "Kova polished this listing. The public page now uses the new name, description, and selling points.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Kova could not polish this product.",
      );
    } finally {
      setPolishing(false);
    }
  }

  async function changeStatus(newStatus: Product["status"]) {
    if (!product || !businessId || !accessToken) return;
    setStatusAction(newStatus);
    setError("");
    setSuccess("");
    try {
      const updated = await updateProduct(businessId, product.id, accessToken, {
        status: newStatus,
      });
      setProduct(updated);
      setSuccess(
        newStatus === "active"
          ? "Product is now active and visible on your storefront."
          : newStatus === "archived"
            ? "Product has been archived."
            : "Product moved to draft.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Status change failed.",
      );
    } finally {
      setStatusAction(null);
    }
  }

  if (authLoading || loading || !product) {
    return (
      <div className={`${WORKSPACE_PAGE} flex min-h-[50vh] items-center justify-center`}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-kova-green border-t-transparent" />
      </div>
    );
  }

  const primary =
    product.images.find((item) => item.is_primary) ?? product.images[0];

  return (
    <div className={WORKSPACE_PAGE}>
      <div className="space-y-6">
          {/* Back */}
          <Link
            href="/workspace/commerce/products"
            className="text-sm font-semibold text-kova-green hover:underline"
          >
            Products
          </Link>

          {/* ──── Header ──── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="min-w-0 break-words text-2xl font-semibold text-kova-dark sm:text-3xl">
                  {product.name}
                </h1>
                <span
                  className={`text-xs font-medium ${STATUS_COLORS[product.status]}`}
                >
                  {STATUS_LABELS[product.status]}
                </span>
                {contentPlan && contentPlan.scheduled > 0 ? (
                  <span className="text-xs font-medium text-kova-green">
                    Scheduled
                    {contentPlan.next_at
                      ? ` · ${new Date(contentPlan.next_at).toLocaleString()}`
                      : ""}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {product.ai_generated ? "Created by Kova AI · " : ""}
                {product.category || "Uncategorized"}
                {product.price
                  ? ` · ${product.currency} ${product.price}`
                  : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={polish}
                loading={polishing}
                disabled={polishing || saving}
              >
                Polish with Kova
              </Button>
              {product.product_path && (
                <a
                  href={product.product_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center rounded-lg border border-kova-border bg-white px-4 text-sm font-semibold text-kova-dark transition hover:border-kova-orange/50"
                >
                  View public page
                </a>
              )}
              {product.status === "draft" && (
                <Button
                  onClick={() => changeStatus("active")}
                  loading={statusAction === "active"}
                  disabled={!!statusAction}
                >
                  Activate Product
                </Button>
              )}
              {product.status === "active" && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => changeStatus("draft")}
                    loading={statusAction === "draft"}
                    disabled={!!statusAction}
                  >
                    Move to Draft
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => changeStatus("archived")}
                    loading={statusAction === "archived"}
                    disabled={!!statusAction}
                  >
                    Archive
                  </Button>
                </>
              )}
              {product.status === "archived" && (
                <Button
                  variant="outline"
                  onClick={() => changeStatus("draft")}
                  loading={statusAction === "draft"}
                  disabled={!!statusAction}
                >
                  Restore to Draft
                </Button>
              )}
            </div>
          </div>

          <div className="h-px bg-kova-border" />

          {/* ──── Two columns ──── */}
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            {/* Left: images + AI */}
            <div className="space-y-5">
              <div className="aspect-square overflow-hidden rounded-lg border border-kova-border bg-white">
                {primary?.url ? (
                  <img
                    src={primary.url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">
                    No image
                  </div>
                )}
              </div>

              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.slice(0, 4).map((img) => (
                    <div
                      key={img.id}
                      className={`aspect-square overflow-hidden rounded-md border bg-white ${
                        img.is_primary
                          ? "border-kova-dark"
                          : "border-kova-border"
                      }`}
                    >
                      {img.url && (
                        <img
                          src={img.url}
                          alt={img.alt_text || product.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-kova-border bg-white p-5">
                <p className="text-sm font-semibold text-kova-dark">
                  From Kova
                </p>

                {product.ai_summary ? (
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {product.ai_summary}
                  </p>
                ) : null}

                {product.ai_confidence ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Confidence{" "}
                    {Math.round(Number(product.ai_confidence) * 100)}%
                  </p>
                ) : null}

                {product.selling_points.length > 0 ? (
                  <div className="mt-4 border-t border-kova-border pt-4">
                    <p className="text-xs font-medium text-gray-500">
                      Selling points
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-gray-600">
                      {product.selling_points.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {product.keywords.length > 0 ? (
                  <div className="mt-4 border-t border-kova-border pt-4">
                    <p className="text-xs font-medium text-gray-500">Keywords</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {product.keywords.join(" · ")}
                    </p>
                  </div>
                ) : null}

                {product.uncertain_attributes.length > 0 ? (
                  <div className="mt-4 border-t border-kova-border pt-4">
                    <p className="text-xs font-medium text-amber-800">
                      Needs confirmation
                    </p>
                    <ul className="mt-2 list-disc pl-4 text-sm text-amber-900">
                      {product.uncertain_attributes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right: editable fields */}
            <div className="space-y-5">
              <section className="rounded-lg border border-kova-border bg-white p-6">
                <h2 className="font-bold text-kova-dark">Product Details</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Owner-provided facts. These are authoritative.
                </p>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                  <Input
                    label="Product name"
                    value={product.name}
                    onChange={(e) =>
                      setProduct({ ...product, name: e.target.value })
                    }
                  />
                  </div>
                  <Input
                    label="Category"
                    value={product.category}
                    onChange={(e) =>
                      setProduct({ ...product, category: e.target.value })
                    }
                  />
                  <Input
                    label="Price"
                    value={product.price ?? ""}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        price: e.target.value || null,
                      })
                    }
                  />
                  <Input
                    label="Currency"
                    value={product.currency}
                    onChange={(e) =>
                      setProduct({ ...product, currency: e.target.value })
                    }
                  />
                  <Input
                    label="Stock"
                    type="number"
                    value={product.stock ?? ""}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        stock: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                  <Input
                    label="SKU"
                    value={product.sku}
                    onChange={(e) =>
                      setProduct({ ...product, sku: e.target.value })
                    }
                  />
                </div>
              </section>

              <section className="rounded-lg border border-kova-border bg-white p-6">
                <h2 className="font-bold text-kova-dark">
                  Physical Attributes
                </h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Correct anything the AI got wrong.
                </p>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Input
                    label="Brand"
                    value={product.brand}
                    onChange={(e) =>
                      setProduct({ ...product, brand: e.target.value })
                    }
                  />
                  <Input
                    label="Material"
                    value={product.material}
                    onChange={(e) =>
                      setProduct({ ...product, material: e.target.value })
                    }
                  />
                  <Input
                    label="Size"
                    value={product.size}
                    onChange={(e) =>
                      setProduct({ ...product, size: e.target.value })
                    }
                  />
                  <Input
                    label="Color"
                    value={product.color}
                    onChange={(e) =>
                      setProduct({ ...product, color: e.target.value })
                    }
                  />
                  <Input
                    label="Condition"
                    value={product.condition}
                    onChange={(e) =>
                      setProduct({ ...product, condition: e.target.value })
                    }
                  />
                </div>
              </section>

              <section className="rounded-lg border border-kova-border bg-white p-6">
                <h2 className="font-bold text-kova-dark">Description</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  This is what visitors read on the public page. Polish with Kova rewrites it from the photos.
                </p>
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-kova-dark">
                    Short description
                  </label>
                  <textarea
                    value={product.short_description}
                    onChange={(e) =>
                      setProduct({
                        ...product,
                        short_description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full rounded-md border border-kova-border px-4 py-3 text-sm transition focus:border-kova-orange focus:outline-none focus:ring-1 focus:ring-kova-orange"
                  />
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-kova-dark">
                    Full description
                  </label>
                  <textarea
                    value={product.description}
                    onChange={(e) =>
                      setProduct({ ...product, description: e.target.value })
                    }
                    rows={8}
                    className="w-full rounded-md border border-kova-border px-4 py-3 text-sm transition focus:border-kova-orange focus:outline-none focus:ring-1 focus:ring-kova-orange"
                  />
                </div>
              </section>

              <section className="rounded-lg border border-kova-border bg-white p-6">
                <h2 className="font-bold text-kova-dark">SEO</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Metadata for search engines and link previews on your public
                  product page.
                </p>
                <SeoHealthCard product={product} />
                <div className="mt-4 space-y-4">
                  <Input
                    label="SEO title"
                    value={product.seo_title}
                    onChange={(e) =>
                      setProduct({ ...product, seo_title: e.target.value })
                    }
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-kova-dark">
                      SEO description
                    </label>
                    <textarea
                      value={product.seo_description}
                      onChange={(e) =>
                        setProduct({
                          ...product,
                          seo_description: e.target.value,
                        })
                      }
                      rows={4}
                      className="w-full rounded-md border border-kova-border px-4 py-3 text-sm transition focus:border-kova-orange focus:outline-none focus:ring-1 focus:ring-kova-orange"
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      {(product.seo_description || "").trim().length}/160
                      characters (aim 50–160)
                    </p>
                  </div>
                </div>
              </section>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg border border-kova-green/20 bg-kova-green/5 px-4 py-3 text-sm text-kova-green">
                  {success}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Created{" "}
                  {new Date(product.created_at).toLocaleDateString()} · Updated{" "}
                  {new Date(product.updated_at).toLocaleDateString()}
                </p>
                <Button onClick={save} loading={saving} disabled={saving}>
                  Save Product
                </Button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
