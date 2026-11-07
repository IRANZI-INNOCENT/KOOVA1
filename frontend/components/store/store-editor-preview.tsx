"use client";

import type { CommercePage, Product } from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";
import { StoreSpotlight } from "@/components/store/store-spotlight";
import { resolveStoreImage, storeThemeStyle } from "@/lib/store-theme";
import {
  displayStorePhone,
  formatPrice,
  listingFacts,
  offeringGridClass,
  storeHeadline,
  storeHeroSubtitle,
  whatsappLink,
} from "@/lib/storefront";

type Draft = {
  title: string;
  tagline: string;
  description: string;
  whatsapp: string;
  email: string;
  phone: string;
  location: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  layout_preset: CommercePage["layout_preset"];
  font_preset: CommercePage["font_preset"];
  show_hero: boolean;
  show_about: boolean;
  show_featured: boolean;
};

function PreviewCard({ product }: { product: Product }) {
  const image = productImage(product);
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-md border border-kova-orange bg-[var(--store-secondary-soft)]">
        {image?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaSrc(image.url)} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-xs font-semibold" style={{ color: "var(--store-secondary)" }}>
        {product.name}
      </p>
      {listingFacts(product) ? (
        <p className="text-[11px] text-gray-500">{listingFacts(product)}</p>
      ) : null}
      <p className="text-xs font-bold" style={{ color: "var(--store-accent)" }}>
        {formatPrice(product.currency, product.price)}
      </p>
    </div>
  );
}

function productImage(product: Product) {
  return product.images.find((image) => image.is_primary) ?? product.images[0];
}

export function StoreEditorPreview({
  draft,
  page,
  products,
}: {
  draft: Draft;
  page: CommercePage;
  products: Product[];
}) {
  const view = {
    ...page,
    ...draft,
    business_name: page.business_name,
  };
  const { lead, accent } = storeHeadline(view);
  const subtitle = storeHeroSubtitle(view);
  const layout = draft.layout_preset || "compact";
  const phoneLabel = draft.phone.trim() ? displayStorePhone(draft.phone) : "";
  const whatsappLabel = draft.whatsapp.trim()
    ? `WhatsApp  ${displayStorePhone(draft.whatsapp)}`
    : "";
  const bannerSlides =
    page.banners && page.banners.length > 0
      ? page.banners
          .filter((banner) => !!banner.url)
          .map((banner) => ({
            id: banner.id,
            url: banner.url as string,
            alt_text: banner.alt_text || banner.product_name || "",
          }))
      : page.cover_url
        ? [{ id: "cover", url: page.cover_url, alt_text: draft.title || page.business_name }]
        : products[0] && productImage(products[0])?.url
          ? [
              {
                id: "product",
                url: productImage(products[0])!.url as string,
                alt_text: products[0].name,
              },
            ]
          : [];
  const aboutPhoto = resolveStoreImage(page.cover_url || page.logo_url);
  const grid = offeringGridClass(layout);
  const popular = products.slice(0, 4);
  const shown = products.slice(0, 8);

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ ...storeThemeStyle(view), borderColor: "var(--store-border)" }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{ backgroundColor: "var(--store-primary)", color: "var(--store-on-primary)" }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {page.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc(page.logo_url)}
              alt=""
              className="h-8 w-8 rounded object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded bg-white/15 text-xs font-bold">
              {(draft.title || "S").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate text-sm font-bold">
            {draft.title.trim() || page.business_name || "Your shop"}
          </span>
        </div>
        {draft.whatsapp.trim() ? (
          <span
            className="shrink-0 rounded px-2 py-1 text-[10px] font-bold"
            style={{ backgroundColor: "var(--store-accent)", color: "var(--store-on-accent)" }}
          >
            WhatsApp
          </span>
        ) : null}
      </div>

      {draft.show_hero ? (
        <StoreSpotlight
          slides={bannerSlides}
          lead={lead}
          accent={accent}
          subtitle={subtitle}
          menuHref="#store-preview-offerings"
          menuLabel="See offerings"
          whatsappHref={draft.whatsapp.trim() ? whatsappLink(draft.whatsapp) : ""}
          whatsappLabel={whatsappLabel || "WhatsApp"}
          phoneLabel={phoneLabel}
        />
      ) : null}

      {layout === "whatsapp_first" || !draft.show_hero ? (
        <div
          className="flex flex-wrap gap-x-4 gap-y-1 border-b px-4 py-2 text-xs font-medium"
          style={{ borderColor: "var(--store-border)", color: "var(--store-secondary)" }}
        >
          {draft.location.trim() ? <span>{draft.location.trim()}</span> : null}
          {phoneLabel ? <span>{phoneLabel}</span> : null}
          {draft.email.trim() ? <span>{draft.email.trim()}</span> : null}
          {whatsappLabel ? <span>{whatsappLabel}</span> : null}
        </div>
      ) : null}

      <div
        className={`grid gap-8 px-4 py-6 ${
          draft.show_about && layout === "compact" ? "lg:grid-cols-[minmax(0,1fr)_220px]" : ""
        }`}
      >
        <div id="store-preview-offerings">
          {draft.show_featured && popular.length > 0 ? (
            <div className="mb-6">
              <p className="text-sm font-bold" style={{ color: "var(--store-secondary)" }}>
                Popular
              </p>
              <div className={`mt-4 grid gap-3 ${grid}`}>
                {popular.map((product) => (
                  <PreviewCard key={`popular-${product.id}`} product={product} />
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-sm font-bold" style={{ color: "var(--store-secondary)" }}>
            Offerings
          </p>
          {shown.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">
              Listings appear here once you add products.
            </p>
          ) : (
            <div className={`mt-4 grid gap-3 ${grid}`}>
              {shown.map((product) => (
                <PreviewCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {draft.show_about ? (
          <aside>
            <p className="text-sm font-bold" style={{ color: "var(--store-secondary)" }}>
              About {draft.title.trim() || page.business_name}
            </p>
            {draft.description.trim() ? (
              <p className="mt-2 text-xs leading-5" style={{ color: "var(--store-secondary)" }}>
                {draft.description.trim()}
              </p>
            ) : null}
            <div className="mt-2 space-y-1 text-xs" style={{ color: "var(--store-secondary)" }}>
              {draft.location.trim() ? <p>{draft.location.trim()}</p> : null}
              {phoneLabel ? <p>{phoneLabel}</p> : null}
              {draft.email.trim() ? <p>{draft.email.trim()}</p> : null}
            </div>
            {aboutPhoto && layout !== "gallery" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={aboutPhoto}
                alt=""
                className="mt-4 h-24 w-full rounded-md border border-kova-orange object-cover"
              />
            ) : null}
          </aside>
        ) : null}
      </div>

      <div
        className="space-y-1 px-4 py-4 text-xs"
        style={{ backgroundColor: "var(--store-primary)", color: "var(--store-on-primary)" }}
      >
        <p className="font-bold">{draft.title.trim() || page.business_name || "Your shop"}</p>
        {draft.location.trim() ? <p>{draft.location.trim()}</p> : null}
        {phoneLabel ? <p>{phoneLabel}</p> : null}
        {draft.email.trim() ? <p>{draft.email.trim()}</p> : null}
      </div>
    </div>
  );
}
