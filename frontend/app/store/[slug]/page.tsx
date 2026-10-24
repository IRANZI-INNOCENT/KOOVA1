import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StoreOrderButton } from "@/components/store/order-button";
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
  const raw = (page.tagline || page.title || page.business_name).trim();
  const location = page.location?.trim() || "";
  if (location && raw.toLowerCase().endsWith(location.toLowerCase())) {
    return {
      lead: raw.slice(0, raw.length - location.length).trim(),
      accent: location,
    };
  }
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length > 3) {
    return {
      lead: words.slice(0, -1).join(" "),
      accent: words[words.length - 1],
    };
  }
  if (location && !raw.toLowerCase().includes(location.toLowerCase())) {
    return { lead: raw, accent: location };
  }
  return { lead: raw, accent: "" };
}

function heroSubtitle(page: CommercePage) {
  const text = (page.description || page.tagline || "").trim();
  if (!text) return "";
  const sentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}…` : sentence;
}

function isService(product: Product) {
  return product.offering_kind === "service";
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
  whatsapp,
}: {
  product: Product;
  slug: string;
  whatsapp: string;
}) {
  const image = productImage(product);
  const service = isService(product);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#E7D7C3] bg-white">
      <Link href={`/store/${slug}/${product.slug}`} className="block">
        <div className="aspect-[4/5] overflow-hidden bg-[#F6EFE4]">
          {image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc(image.url)}
              alt={image.alt_text || product.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-wide text-[#6B3E16]/50">
              {service ? "Service" : "Product"}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C9973A]">
          {service ? "Service" : product.category || "Product"}
        </p>
        <h3 className="mt-1 text-[15px] font-semibold leading-5 text-[#3F3A34]">
          <Link href={`/store/${slug}/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="mt-1 text-sm font-medium text-[#6B3E16]">
          {formatPrice(product.currency, product.price)}
        </p>
        {whatsapp ? (
          <div className="mt-auto pt-3">
            <StoreOrderButton
              slug={slug}
              productSlug={product.slug}
              productName={product.name}
              whatsapp={whatsapp}
              className="inline-flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold text-white disabled:opacity-70"
              style={{ backgroundColor: "#C9973A" }}
            >
              {service ? "Book" : "Order"}
            </StoreOrderButton>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-bold" style={{ color: "#6B3E16" }}>
      <span className="border-b-[3px] pb-1" style={{ borderColor: "#C9973A" }}>
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
  const popular = products.slice(0, 4);
  const aboutCopy = (page.description || "").trim();
  const aboutPhoto = resolveStoreImage(page.cover_url || page.logo_url);
  const phoneLabel = page.whatsapp ? displayPhone(page.whatsapp) : "";

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
            phoneLabel ? `WhatsApp  ${phoneLabel}` : "WhatsApp"
          }
        />
      ) : null}

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:py-12">
        <div id="popular">
          <SectionTitle>Popular</SectionTitle>
          {popular.length === 0 ? (
            <p className="mt-6 text-sm text-[#6B3E16]/70">
              Offerings will appear here once they are published.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {popular.map((product) => (
                <OfferingCard
                  key={product.id}
                  product={product}
                  slug={slug}
                  whatsapp={page.whatsapp}
                />
              ))}
            </div>
          )}
        </div>

        {page.show_about !== false ? (
          <aside id="about">
            <SectionTitle>
              About {page.title?.trim() || page.business_name}
            </SectionTitle>
            {aboutCopy ? (
              <p className="mt-5 text-sm leading-6 text-[#3F3A34]">{aboutCopy}</p>
            ) : null}
            <div className="mt-4 space-y-1 text-sm text-[#3F3A34]">
              {page.location ? <p>{page.location}</p> : null}
              {page.phone ? (
                <p>
                  <a href={`tel:${page.phone}`} className="hover:underline">
                    {displayPhone(page.phone)}
                  </a>
                </p>
              ) : null}
            </div>
            {aboutPhoto ? (
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

      <section id="offerings" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <SectionTitle>Offerings</SectionTitle>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#3F3A34]/80">
          Products to order and services to book, in one list.
        </p>
        {products.length === 0 ? (
          <p className="mt-6 text-sm text-[#6B3E16]/70">
            Nothing is listed yet.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-[#E7D7C3] overflow-hidden rounded-2xl border border-[#E7D7C3] bg-white">
            {products.map((product) => {
              const image = productImage(product);
              const service = isService(product);
              const blurb = (product.short_description || product.category || "").trim();
              return (
                <li key={product.id}>
                  <Link
                    href={`/store/${slug}/${product.slug}`}
                    className="flex items-center gap-4 px-4 py-3 transition hover:bg-[#FFF3E4] sm:px-5"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F6EFE4]">
                      {image?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaSrc(image.url)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C9973A]">
                        {service ? "Service" : "Product"}
                      </p>
                      <p className="truncate text-sm font-semibold text-[#3F3A34]">
                        {product.name}
                      </p>
                      {blurb ? (
                        <p className="truncate text-xs text-[#3F3A34]/70">{blurb}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#6B3E16]">
                      {formatPrice(product.currency, product.price)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </StoreFrame>
  );
}
