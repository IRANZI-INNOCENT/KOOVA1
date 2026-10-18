import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreOrderButton } from "@/components/store/order-button";
import { StoreFrame } from "@/components/store/store-frame";
import { JsonLd } from "@/components/seo/json-ld";
import type { Product } from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";
import { fetchPublicStore } from "@/lib/public-store-api";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { resolveStoreImage } from "@/lib/store-theme";
import { formatPrice, whatsappLink } from "@/lib/storefront";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await fetchPublicStore(slug);
  if (!data) {
    return { title: "Store not found", robots: { index: false } };
  }
  const { page, products } = data;
  const title =
    page.title?.trim() || `${page.business_name} — Shop online`;
  const description =
    page.description?.trim() ||
    page.tagline?.trim() ||
    `Browse products from ${page.business_name}${page.location ? ` in ${page.location}` : ""}. Order on WhatsApp.`;
  const cover = page.cover_url || page.logo_url;
  const primary =
    cover ||
    products[0]?.images.find((i) => i.is_primary)?.url ||
    products[0]?.images[0]?.url ||
    undefined;

  return buildPageMetadata({
    title,
    description,
    path: `/store/${slug}`,
    images: primary ? [mediaSrc(primary)] : undefined,
  });
}

function ProductCard({
  product,
  slug,
  hasWhatsApp,
  whatsapp,
  large,
}: {
  product: Product;
  slug: string;
  hasWhatsApp: boolean;
  whatsapp: string;
  large?: boolean;
}) {
  const image =
    product.images.find((i) => i.is_primary) ?? product.images[0];
  return (
    <article className="group overflow-hidden rounded-lg border border-kova-border bg-white transition hover:shadow-sm">
      <Link href={`/store/${slug}/${product.slug}`} className="block">
        <div
          className={`overflow-hidden bg-kova-background ${
            large ? "aspect-[4/5]" : "aspect-square"
          }`}
        >
          {image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc(image.url)}
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
          <h3
            className={`line-clamp-2 font-semibold leading-5 text-kova-dark ${
              large ? "text-base" : "text-sm"
            }`}
          >
            {product.name}
          </h3>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 px-3.5 pb-3.5 pt-2">
        <p
          className="truncate text-sm font-bold"
          style={{ color: "var(--store-accent)" }}
        >
          {formatPrice(product.currency, product.price)}
        </p>
        {hasWhatsApp && (
          <StoreOrderButton
            slug={slug}
            productSlug={product.slug}
            productName={product.name}
            whatsapp={whatsapp}
            className="inline-flex shrink-0 items-center rounded-md px-2.5 py-1 text-xs font-bold transition disabled:opacity-70"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--store-accent) 18%, white)",
              color: "var(--store-primary)",
            }}
          >
            Order
          </StoreOrderButton>
        )}
      </div>
    </article>
  );
}

export default async function PublicStorePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await fetchPublicStore(slug);
  if (!data) notFound();

  const { page, products } = data;
  const hasWhatsApp = !!page.whatsapp;
  const layout = page.layout_preset || "compact";
  const coverSrc = resolveStoreImage(page.cover_url);
  const showHero = page.show_hero !== false && (coverSrc || page.tagline || page.description);
  const featured =
    page.show_featured && products.length > 0 ? products.slice(0, 4) : [];
  const gridClass =
    layout === "gallery"
      ? "mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
      : layout === "editorial"
        ? "mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2"
        : "mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4";

  const storeLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: page.business_name,
    description: page.description || page.tagline || undefined,
    url: absoluteUrl(`/store/${slug}`),
    telephone: page.phone || undefined,
    email: page.email || undefined,
    image: coverSrc || resolveStoreImage(page.logo_url) || undefined,
    address: page.location
      ? {
          "@type": "PostalAddress",
          addressLocality: page.location,
          addressCountry: "KE",
        }
      : undefined,
  };

  return (
    <StoreFrame page={page} slug={slug}>
      <JsonLd data={storeLd} />

      {showHero && (
        <section className="border-b border-kova-border bg-white">
          {coverSrc && (
            <div
              className={`relative w-full overflow-hidden bg-kova-background ${
                layout === "editorial" ? "aspect-[21/9] max-h-[420px]" : "aspect-[2.4/1] max-h-[320px]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            <h1 className="text-2xl font-bold tracking-tight text-kova-dark sm:text-3xl">
              {page.title?.trim() || page.business_name}
            </h1>
            {(page.tagline || page.description) && (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                {page.tagline || page.description}
              </p>
            )}
            {layout === "whatsapp_first" && page.whatsapp && (
              <a
                href={whatsappLink(page.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex h-12 items-center justify-center rounded-lg px-6 text-sm font-bold transition hover:brightness-105"
                style={{
                  backgroundColor: "var(--store-accent)",
                  color: "var(--store-on-accent)",
                }}
              >
                Chat on WhatsApp to order
              </a>
            )}
          </div>
        </section>
      )}

      {!showHero && (
        <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
          <h1 className="text-2xl font-bold tracking-tight text-kova-dark sm:text-3xl">
            {page.title?.trim() || page.business_name}
          </h1>
          {(page.tagline || page.description) && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {page.tagline || page.description}
            </p>
          )}
        </div>
      )}

      {featured.length > 0 && (
        <section className="border-b border-kova-border bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <h2 className="text-lg font-bold text-kova-dark">Featured</h2>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {featured.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  slug={slug}
                  hasWhatsApp={hasWhatsApp}
                  whatsapp={page.whatsapp}
                  large={layout === "gallery"}
                />
              ))}
            </div>
          </div>
        </section>
      )}

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
          <div className={gridClass}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                slug={slug}
                hasWhatsApp={hasWhatsApp}
                whatsapp={page.whatsapp}
                large={layout === "gallery" || layout === "editorial"}
              />
            ))}
          </div>
        )}
      </section>
    </StoreFrame>
  );
}
