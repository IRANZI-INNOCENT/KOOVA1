"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/workspace/app-shell";
import SnapToSellModal from "@/components/commerce/snap-to-sell-modal";
import { useAuth } from "@/lib/auth-context";
import { getBusiness, getProducts, Product } from "@/lib/commerce";

export default function SnapToSellPage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isLoading: authLoading } = useAuth();

  const [businessId, setBusinessId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !accessToken) {
      router.replace("/login");
      return;
    }

    async function load() {
      try {
        const business = await getBusiness(accessToken!);
        setBusinessId(business.id);
        setProducts(await getProducts(business.id, accessToken!));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [accessToken, authLoading, isAuthenticated, router]);

  if (loading || !businessId) {
    return (
      <AppShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm text-gray-500">Loading Snap to Sell...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 sm:p-8">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => router.push("/workspace/commerce")}
            className="text-sm font-semibold text-kova-green hover:underline"
          >
            ← Back to Commerce
          </button>

          <div className="mt-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-kova-green">
              Snap to Sell
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-kova-dark sm:text-4xl">
              Photograph it. Kova prepares it for selling.
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-600">
              Take a photo or upload your product. Give Kova the price and let
              it use your Business Brain to prepare the product draft.
            </p>
          </div>

          <div className="mt-10 border border-kova-border bg-white p-6 sm:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-kova-border p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-kova-green">
                  01
                </p>
                <h2 className="mt-2 text-lg font-semibold text-kova-dark">
                  Snap your stock
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Use your phone camera or upload up to five photos.
                </p>
              </div>

              <div className="border border-kova-border p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-kova-green">
                  02
                </p>
                <h2 className="mt-2 text-lg font-semibold text-kova-dark">
                  Give Kova the price
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  Everything else is optional. Kova handles the product
                  understanding.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const element = document.getElementById("snap-modal-trigger");
                element?.click();
              }}
              className="mt-7 w-full bg-kova-green px-6 py-4 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Start Snap to Sell
            </button>
          </div>

          {products.length > 0 && (
            <section className="mt-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-kova-dark">
                  Recent product drafts
                </h2>
                <span className="text-sm text-gray-500">
                  {products.length} product{products.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {products.slice(0, 6).map((product) => (
                  <div
                    key={product.id}
                    className="border border-kova-border bg-white p-4"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-kova-background">
                      {product.images?.[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.images[0].url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    <h3 className="mt-4 font-semibold text-kova-dark">
                      {product.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {product.currency} {product.price}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.12em] text-kova-green">
                      {product.status}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <button
        id="snap-modal-trigger"
        type="button"
        className="hidden"
        aria-hidden="true"
        onClick={() => {}}
      />

      <SnapToSellModal
        businessId={businessId}
        accessToken={accessToken!}
        open={true}
        onClose={() => router.push("/workspace/commerce")}
        onCreated={(product) => {
          setProducts((current) => [product, ...current]);
        }}
      />
    </AppShell>
  );
}
