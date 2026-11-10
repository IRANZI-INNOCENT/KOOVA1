import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchasePanel } from "@/components/store/product-purchase-panel";
import { StoreFrame } from "@/components/store/store-frame";
import { JsonLd } from "@/components/seo/json-ld";
import { mediaSrc } from "@/lib/media";
import { fetchPublicProduct } from "@/lib/public-store-api";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { formatPrice, listingFacts } from "@/lib/storefront";

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

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: page.business_name,
        item: absoluteUrl(`/store/${slug}`),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.name,
        item: productUrl,
      },
    ],
  };

  const shortCopy = product.short_description?.trim() || "";
  const longCopy = product.description?.trim() || "";

  return (
    <StoreFrame page={page} slug={slug}>
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      <nav
        className="border-b"
        style={{ borderColor: "var(--store-border)" }}
        aria-label="Breadcrumb"
      >
        <ProductBreadcrumb
          slug={slug}
          businessName={page.business_name}
          productName={product.name}
        />
      </nav>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ProductGallery images={product.images} productName={product.name} />
        <div>
          <ProductPurchasePanel
            slug={slug}
            productSlug={productSlug}
            page={page}
            product={product}
          />
          {shortCopy && longCopy && shortCopy !== longCopy ? (
            <div className="mt-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-kova-muted">
                Full description
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-kova-muted">
                {longCopy}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {related.length > 0 && (
        <section className="border-t border-kova-border">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <h2 className="text-xl font-bold" style={{ color: "var(--store-secondary)" }}>
              More from {page.business_name}
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4">
              {related.map((item) => {
                const thumb =
                  item.images.find((img) => img.is_primary) ?? item.images[0];
                return (
                  <Link key={item.id} href={`/store/${slug}/${item.slug}`} className="block">
                    <div className="aspect-[4/5] overflow-hidden rounded-md bg-[var(--store-secondary-soft)]">
                      {thumb?.url && (
                        <img
                          src={mediaSrc(thumb.url)}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                    <p
                      className="mt-2 line-clamp-2 text-sm font-semibold"
                      style={{ color: "var(--store-secondary)" }}
                    >
                      {item.name}
                    </p>
                    {listingFacts(item) ? (
                      <p className="text-xs text-kova-muted">{listingFacts(item)}</p>
                    ) : null}
                    <p className="text-sm font-bold" style={{ color: "var(--store-accent)" }}>
                      {formatPrice(item.currency, item.price)}
                    </p>
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

function ProductBreadcrumb({
  slug,
  businessName,
  productName,
}: {
  slug: string;
  businessName: string;
  productName: string;
}) {
  return (
    <ol className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 py-3 text-sm sm:px-6">
      <li>
        <Link
          href={`/store/${slug}`}
          className="font-semibold hover:underline"
          style={{ color: "var(--store-secondary)" }}
        >
          {businessName}
        </Link>
      </li>
      <li aria-hidden className="text-kova-muted">
        /
      </li>
      <li className="text-kova-muted">{productName}</li>
    </ol>
  );
}
