import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreCatalog } from "@/components/store/store-catalog";
import { StoreFrame } from "@/components/store/store-frame";
import { StoreSpotlight } from "@/components/store/store-spotlight";
import { StoreViewTracker } from "@/components/store/store-view-tracker";
import { JsonLd } from "@/components/seo/json-ld";
import type { CommercePage, Product } from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";
import { fetchPublicStore } from "@/lib/public-store-api";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";
import { resolveStoreImage } from "@/lib/store-theme";
import {
  displayStorePhone,
  formatPrice,
  listingFacts,
  offeringGridClass,
  storeHeadline,
  storeHeroSubtitle,
  whatsappLink,
  buildStoreWhatsAppMessage,
} from "@/lib/storefront";

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
  const location = page.location?.trim();
  const title = page.title?.trim() || page.business_name;
  const seoTitle = location
    ? `${title} | Shop in ${location}`
    : `${title} | Online shop`;
  const description =
    page.description?.trim() ||
    page.tagline?.trim() ||
    `Browse products from ${page.business_name}${location ? ` in ${location}` : ""}. Order on WhatsApp.`;
  const cover = page.cover_url || page.logo_url;
  const primary =
    cover ||
    products[0]?.images.find((i) => i.is_primary)?.url ||
    products[0]?.images[0]?.url ||
    undefined;

  return buildPageMetadata({
    title: seoTitle,
    description,
    path: `/store/${slug}`,
    images: primary ? [mediaSrc(primary)] : undefined,
  });
}

function productImage(product: Product) {
  return product.images.find((i) => i.is_primary) ?? product.images[0];
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-bold" style={{ color: "var(--store-secondary)" }}>
      <span className="border-b-[3px] pb-1" style={{ borderColor: "var(--store-accent)" }}>
        {children}
      </span>
    </h2>
  );
}

function OfferingCard({ product, slug }: { product: Product; slug: string }) {
  const image = productImage(product);
  return (
    <Link href={`/store/${slug}/${product.slug}`} className="group block">
      <div className="aspect-[4/5] overflow-hidden rounded-md border border-kova-border bg-[var(--store-secondary-soft)]">
        {image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc(image.url)}
            alt={image.alt_text || product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold" style={{ color: "var(--store-secondary)" }}>
        {product.name}
      </p>
      {listingFacts(product) ? (
        <p className="text-xs text-kova-muted">{listingFacts(product)}</p>
      ) : null}
      <p className="text-sm font-bold tabular-nums" style={{ color: "var(--store-accent)" }}>
        {formatPrice(product.currency, product.price)}
      </p>
    </Link>
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
  const name = page.title?.trim() || page.business_name;
  const { lead, accent } = storeHeadline(page);
  const subtitle = storeHeroSubtitle(page);
  const bannerSlides =
    page.banners && page.banners.length > 0
      ? page.banners
          .filter((b) => !!b.url)
          .map((b) => ({
            id: b.id,
            url: b.url as string,
            alt_text: b.alt_text || b.product_name || "",
          }))
      : page.cover_url
        ? [{ id: "cover", url: page.cover_url, alt_text: page.business_name }]
        : products[0] && productImage(products[0])?.url
          ? [
              {
                id: "product",
                url: productImage(products[0])!.url as string,
                alt_text: products[0].name,
              },
            ]
          : [];

  const layout = page.layout_preset || "compact";
  const showFeatured = page.show_featured === true;
  const popular = products.slice(0, 4);
  const aboutCopy = (page.description || "").trim();
  const aboutPhoto = resolveStoreImage(page.cover_url || page.logo_url);
  const phoneLabel = page.phone ? displayStorePhone(page.phone) : "";
  const whatsappLabel = page.whatsapp ? displayStorePhone(page.whatsapp) : "";
  const offeringGrid = offeringGridClass(layout);
  const waHref = page.whatsapp
    ? whatsappLink(page.whatsapp, buildStoreWhatsAppMessage(name))
    : "";

  const storeLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: page.business_name,
    description: page.description || page.tagline || undefined,
    url: absoluteUrl(`/store/${slug}`),
    telephone: page.phone || undefined,
    email: page.email || undefined,
    image: bannerSlides[0]?.url
      ? resolveStoreImage(bannerSlides[0].url)
      : undefined,
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
      <StoreViewTracker slug={slug} />
      <JsonLd data={storeLd} />

      {page.show_hero !== false ? (
        <StoreSpotlight
          slides={bannerSlides}
          lead={lead}
          accent={accent}
          subtitle={subtitle}
          menuHref="#catalog"
          whatsappHref={waHref}
          whatsappLabel={
            whatsappLabel ? `Chat on WhatsApp · ${whatsappLabel}` : "Chat on WhatsApp"
          }
          phoneLabel={phoneLabel}
        />
      ) : null}

      {layout === "whatsapp_first" || page.show_hero === false ? (
        <ContactStrip page={page} phoneLabel={phoneLabel} />
      ) : null}

      {showFeatured && popular.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <SectionTitle>Popular</SectionTitle>
          <div className={`mt-6 grid gap-x-3 gap-y-8 sm:gap-x-5 ${offeringGrid}`}>
            {popular.map((product) => (
              <OfferingCard key={product.id} product={product} slug={slug} />
            ))}
          </div>
        </section>
      ) : null}

      <StoreCatalog slug={slug} page={page} products={products} />

      {page.show_about !== false && aboutCopy ? (
        <section
          id="about"
          className="mx-auto max-w-6xl border-t border-kova-border px-4 py-10 sm:px-6"
        >
          <SectionTitle>About {name}</SectionTitle>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-kova-muted">{aboutCopy}</p>
          {aboutPhoto && layout !== "gallery" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={aboutPhoto}
              alt=""
              className="mt-6 h-40 w-full max-w-md rounded-md border border-kova-border object-cover"
              loading="lazy"
            />
          ) : null}
        </section>
      ) : null}
    </StoreFrame>
  );
}

function ContactStrip({
  page,
  phoneLabel,
}: {
  page: CommercePage;
  phoneLabel: string;
}) {
  if (!page.location && !page.phone && !page.email && !page.whatsapp) return null;
  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--store-border)", backgroundColor: "var(--store-accent-soft)" }}
    >
      <div
        className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-1 px-4 py-3 text-sm font-medium sm:px-6"
        style={{ color: "var(--store-secondary)" }}
      >
        {page.location ? <span>{page.location}</span> : null}
        {page.phone ? (
          <a href={`tel:${page.phone}`} className="hover:underline">
            {phoneLabel}
          </a>
        ) : null}
        {page.email ? (
          <a href={`mailto:${page.email}`} className="hover:underline">
            {page.email}
          </a>
        ) : null}
      </div>
    </div>
  );
}
