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

const ABOUT_ICONS = ["fork", "tag", "pin", "people", "star"] as const;

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

function aboutPoints(page: CommercePage): string[] {
  const description = page.description?.trim() || "";
  const sentences = description
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 2 && line.length < 90);
  if (sentences.length >= 2) return sentences.slice(0, 5);

  const points: string[] = [];
  if (page.tagline?.trim()) points.push(page.tagline.trim());
  if (description && description.length < 90) points.push(description);
  if (page.location?.trim()) points.push(page.location.trim());
  if (page.phone?.trim()) points.push(page.phone.trim());
  if (page.whatsapp?.trim()) points.push("Order on WhatsApp");
  return points.slice(0, 5);
}

function displayPhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) {
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 12)}`;
  }
  return raw.trim();
}

function DishCard({
  product,
  slug,
  whatsapp,
}: {
  product: Product;
  slug: string;
  whatsapp: string;
}) {
  const image = productImage(product);
  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(107,62,22,0.08)]">
      <Link href={`/store/${slug}/${product.slug}`} className="block px-3 pt-3">
        <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[#F3E6D4]">
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
        <h3
          className="px-1 pb-3 pt-3 text-center text-sm font-semibold"
          style={{ color: "#3F3A34" }}
        >
          {product.name}
        </h3>
      </Link>
      {whatsapp ? (
        <div className="mt-auto flex justify-center px-3 pb-4">
          <StoreOrderButton
            slug={slug}
            productSlug={product.slug}
            productName={product.name}
            whatsapp={whatsapp}
            className="inline-flex h-9 min-w-[7.5rem] items-center justify-center rounded-md px-4 text-xs font-semibold text-white disabled:opacity-70"
            style={{ backgroundColor: "#C9973A" }}
          >
            Order Now
          </StoreOrderButton>
        </div>
      ) : (
        <div className="px-3 pb-4 text-center text-xs font-semibold" style={{ color: "#C9973A" }}>
          {formatPrice(product.currency, product.price)}
        </div>
      )}
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
  const subtitle = (page.description || "").trim();
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
  const points = page.show_about === false ? [] : aboutPoints(page);
  const aboutPhoto =
    resolveStoreImage(
      products[1] ? productImage(products[1])?.url : page.cover_url,
    ) || resolveStoreImage(page.cover_url || page.logo_url);
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
          menuHref="#menu"
          whatsappHref={page.whatsapp ? whatsappLink(page.whatsapp) : ""}
          whatsappLabel={
            phoneLabel ? `Order on WhatsApp  ${phoneLabel}` : "Order on WhatsApp"
          }
        />
      ) : null}

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:py-12">
        <div id="menu">
          <SectionTitle>Popular</SectionTitle>
          {popular.length === 0 ? (
            <p className="mt-6 text-sm text-[#6B3E16]/70">
              No products listed yet. Check back soon.
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {popular.map((product) => (
                <DishCard
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
            {points.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {points.map((point, index) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-[#3F3A34]">
                    <AboutIcon name={ABOUT_ICONS[index % ABOUT_ICONS.length]} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : null}
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

      <section id="gallery" className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <SectionTitle>Gallery</SectionTitle>
        {products.length === 0 ? (
          <p className="mt-6 text-sm text-[#6B3E16]/70">Photos will appear here.</p>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const image = productImage(product);
              return (
                <Link
                  key={product.id}
                  href={`/store/${slug}/${product.slug}`}
                  className="group overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(107,62,22,0.06)]"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#F3E6D4]">
                    {image?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaSrc(image.url)}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <p className="px-3 py-3 text-center text-sm font-semibold text-[#3F3A34]">
                    {product.name}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </StoreFrame>
  );
}

function AboutIcon({ name }: { name: (typeof ABOUT_ICONS)[number] }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#C9973A",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center">
      {name === "fork" ? (
        <svg {...common}>
          <path d="M8 3v8M12 3v8M10 11v10M16 3c2 3 2 6 0 8v10" />
        </svg>
      ) : name === "tag" ? (
        <svg {...common}>
          <path d="M20 12l-8 8-9-9V4h7l10 8z" />
          <circle cx="7.5" cy="7.5" r="1" fill="#C9973A" />
        </svg>
      ) : name === "pin" ? (
        <svg {...common}>
          <path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" />
          <circle cx="12" cy="10" r="2" />
        </svg>
      ) : name === "people" ? (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19c1-3 3.5-4.5 6-4.5S14 16 15 19" />
          <circle cx="17" cy="9" r="2" />
          <path d="M16 14.5c2.2.3 4 1.8 5 4.5" />
        </svg>
      ) : (
        <svg {...common}>
          <path d="M12 3l2.4 5.2L20 9l-4 3.8.9 5.7L12 16.8 7.1 18.5 8 12.8 4 9l5.6-.8L12 3z" />
        </svg>
      )}
    </span>
  );
}
