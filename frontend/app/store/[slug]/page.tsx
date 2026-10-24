import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreFrame } from "@/components/store/store-frame";
import { StoreSpotlight } from "@/components/store/store-spotlight";
import { JsonLd } from "@/components/seo/json-ld";
import type { CommercePage, Product } from "@/lib/commerce";
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

function productImage(product: Product) {
  return product.images.find((i) => i.is_primary) ?? product.images[0];
}

function headlineParts(page: CommercePage) {
  const location = page.location?.trim() || "";
  let raw = (page.tagline || page.title || page.business_name).trim();
  if (location && raw.toLowerCase().endsWith(location.toLowerCase())) {
    raw = raw.slice(0, raw.length - location.length).replace(/[,\s]+$/, "");
  }
  return {
    lead: raw || page.business_name,
    accent: location,
  };
}

function heroSubtitle(page: CommercePage) {
  const text = (page.description || page.tagline || "").trim();
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}…` : sentence;
}

function displayPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 12)}`;
  }
  return raw.trim();
}

function OfferingCard({
  product,
  slug,
}: {
  product: Product;
  slug: string;
}) {
  const image = productImage(product);
  return (
    <Link
      href={`/store/${slug}/${product.slug}`}
      className="group block overflow-hidden rounded-xl border bg-white transition hover:shadow-sm"
      style={{ borderColor: "var(--store-border)" }}
    >
      <div className="p-2.5 pb-0">
        <div className="aspect-square overflow-hidden rounded-lg bg-[#F6EFE4]">
          {image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc(image.url)}
              alt={image.alt_text || product.name}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>
      </div>
      <div className="px-3.5 pb-3.5 pt-3">
        <p className="line-clamp-2 text-sm font-semibold" style={{ color: "var(--store-secondary)" }}>
          {product.name}
        </p>
        <p className="mt-1.5 text-sm font-bold" style={{ color: "var(--store-accent)" }}>
          {formatPrice(product.currency, product.price)}
        </p>
      </div>
    </Link>
  );
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

export default async function PublicStorePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const data = await fetchPublicStore(slug);
  if (!data) notFound();

  const { page, products } = data;
  const { lead, accent } = headlineParts(page);
  const subtitle = heroSubtitle(page);
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
  const phoneLabel = page.phone ? displayPhone(page.phone) : "";
  const whatsappLabel = page.whatsapp ? displayPhone(page.whatsapp) : "";
  const offeringGrid =
    layout === "gallery"
      ? "grid-cols-1 sm:grid-cols-2"
      : layout === "editorial"
        ? "grid-cols-2 lg:grid-cols-3"
        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";

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
      <JsonLd data={storeLd} />

      {page.show_hero !== false ? (
        <StoreSpotlight
          slides={bannerSlides}
          lead={lead}
          accent={accent}
          subtitle={subtitle}
          menuHref="#offerings"
          menuLabel="See offerings"
          whatsappHref={page.whatsapp ? whatsappLink(page.whatsapp) : ""}
          whatsappLabel={
            whatsappLabel ? `WhatsApp  ${whatsappLabel}` : "WhatsApp"
          }
          phoneLabel={phoneLabel}
        />
      ) : null}

      {layout === "whatsapp_first" || page.show_hero === false ? (
        <ContactStrip page={page} phoneLabel={phoneLabel} />
      ) : null}

      {showFeatured ? (
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
          <SectionTitle>Popular</SectionTitle>
          {popular.length === 0 ? (
            <p className="mt-6 text-sm" style={{ color: "var(--store-secondary)" }}>
              Offerings will appear here once they are published.
            </p>
          ) : (
            <div className={`mt-6 grid gap-3 sm:gap-4 ${offeringGrid}`}>
              {popular.map((product) => (
                <OfferingCard key={product.id} product={product} slug={slug} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section
        className={`mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:py-12 ${
          page.show_about !== false && layout === "compact"
            ? "lg:grid-cols-[minmax(0,1fr)_280px]"
            : ""
        }`}
      >
        <div id="offerings">
          <h2 className="text-xl font-bold" style={{ color: "var(--store-secondary)" }}>
            Offerings
          </h2>
          {products.length === 0 ? (
            <p className="mt-6 text-sm" style={{ color: "var(--store-secondary)" }}>
              Nothing is listed yet.
            </p>
          ) : (
            <div className={`mt-6 grid gap-3 sm:gap-4 ${offeringGrid}`}>
              {products.map((product) => (
                <OfferingCard key={product.id} product={product} slug={slug} />
              ))}
            </div>
          )}
        </div>

        {page.show_about !== false ? (
          <aside id="about" className={layout === "compact" ? "" : "max-w-2xl"}>
            <SectionTitle>
              About {page.title?.trim() || page.business_name}
            </SectionTitle>
            {aboutCopy ? (
              <p className="mt-5 text-sm leading-6" style={{ color: "var(--store-secondary)" }}>
                {aboutCopy}
              </p>
            ) : null}
            <div className="mt-4 space-y-1 text-sm" style={{ color: "var(--store-secondary)" }}>
              {page.location ? <p>{page.location}</p> : null}
              {page.phone ? (
                <p>
                  <a href={`tel:${page.phone}`} className="hover:underline">
                    {phoneLabel}
                  </a>
                </p>
              ) : null}
              {page.email ? (
                <p>
                  <a href={`mailto:${page.email}`} className="hover:underline">
                    {page.email}
                  </a>
                </p>
              ) : null}
            </div>
            {aboutPhoto && layout !== "gallery" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={aboutPhoto}
                alt=""
                className="mt-6 h-28 w-full rounded-lg object-cover"
              />
            ) : null}
          </aside>
        ) : null}
      </section>
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
        {page.whatsapp ? (
          <a
            href={whatsappLink(page.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            WhatsApp {displayPhone(page.whatsapp)}
          </a>
        ) : null}
      </div>
    </div>
  );
}
