import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreOrderButton } from "@/components/store/order-button";
import { ProductGallery } from "@/components/store/product-gallery";
import { StoreFrame } from "@/components/store/store-frame";
import { JsonLd } from "@/components/seo/json-ld";
import { mediaSrc } from "@/lib/media";
import { fetchPublicProduct } from "@/lib/public-store-api";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { formatPrice } from "@/lib/storefront";

type Params = { slug: string; productSlug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const data = await fetchPublicProduct(slug, productSlug);
  if (!data) {
    return { title: "Product not found", robots: { index: false } };
  }
  const { page, product } = data;
  const title =
    product.seo_title?.trim() ||
    `${product.name} | ${page.business_name}`;
  const description =
    product.seo_description?.trim() ||
    product.short_description?.trim() ||
    `Buy ${product.name} from ${page.business_name}. Order on WhatsApp.`;
  const primary =
    product.images.find((i) => i.is_primary)?.url ||
    product.images[0]?.url ||
    undefined;

  return buildPageMetadata({
    title,
    description,
    path: `/store/${slug}/${productSlug}`,
    images: primary ? [mediaSrc(primary)] : undefined,
  });
}

export default async function PublicProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug, productSlug } = await params;
  const data = await fetchPublicProduct(slug, productSlug);
  if (!data) notFound();

  const { page, product, related_products: related } = data;
  const facts = [
    product.brand && ["Brand", product.brand],
    product.material && ["Material", product.material],
    product.size && ["Size", product.size],
    product.color && ["Color", product.color],
    product.condition && ["Condition", product.condition],
    product.sku && ["SKU", product.sku],
  ].filter(Boolean) as [string, string][];

  const productUrl = absoluteUrl(`/store/${slug}/${productSlug}`);
  const availability =
    product.stock != null && product.stock <= 0
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock";

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description:
      product.seo_description ||
      product.short_description ||
      product.description ||
      undefined,
    image: product.images
      .map((img) => (img.url ? mediaSrc(img.url) : ""))
      .filter(Boolean),
    sku: product.sku || undefined,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : { "@type": "Brand", name: page.business_name },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: product.currency || "KES",
      price: product.price || undefined,
      availability,
      seller: {
        "@type": "Organization",
        name: page.business_name,
      },
    },
  };

  return (
    <StoreFrame page={page} slug={slug}>
      <JsonLd data={productLd} />
      <div className="border-b" style={{ borderColor: "rgba(107,62,22,0.1)" }}>
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <Link
            href={`/store/${slug}`}
            className="text-sm font-semibold hover:underline"
            style={{ color: "#6B3E16" }}
          >
            ← All products
          </Link>
        </div>
      </div>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          {product.category && (
            <p
              className="text-xs font-bold uppercase tracking-[0.16em]"
            style={{ color: "#C9973A" }}
          >
            {product.category}
          </p>
          )}
          <h1
            className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: "#6B3E16" }}
          >
            {product.name}
          </h1>
          <p
            className="mt-4 text-2xl font-bold"
            style={{ color: "#6B3E16" }}
          >
            {formatPrice(product.currency, product.price)}
          </p>
          {product.offering_kind !== "service" && product.stock != null && (
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

          {page.whatsapp && (
            <StoreOrderButton
              slug={slug}
              productSlug={productSlug}
              productName={product.name}
              whatsapp={page.whatsapp}
              className="mt-6 inline-flex h-12 items-center justify-center rounded-md px-6 text-sm font-semibold text-white disabled:opacity-70"
              style={{ backgroundColor: "#1B7A34" }}
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
              {product.offering_kind === "service"
                ? "Book on WhatsApp"
                : "Order on WhatsApp"}
            </StoreOrderButton>
          )}

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

      {related.length > 0 && (
        <section className="border-t border-kova-border bg-white">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <h2 className="text-xl font-bold text-kova-dark">
              More from {page.business_name}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((item) => {
                const thumb =
                  item.images.find((img) => img.is_primary) ?? item.images[0];
                return (
                  <Link
                    key={item.id}
                    href={`/store/${slug}/${item.slug}`}
                    className="group overflow-hidden rounded-lg border border-kova-border bg-white transition hover:border-kova-orange/50 hover:shadow-sm"
                  >
                    <div className="aspect-square overflow-hidden bg-kova-background">
                      {thumb?.url && (
                        <img
                          src={mediaSrc(thumb.url)}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-3.5">
                      <p className="line-clamp-2 text-sm font-semibold text-kova-dark">
                        {item.name}
                      </p>
                      <p
                        className="mt-1.5 text-sm font-bold"
                        style={{ color: "#C9973A" }}
                      >
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
