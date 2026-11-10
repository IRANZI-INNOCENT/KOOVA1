"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { CommercePage, Product } from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";
import { trackStorefrontEvent } from "@/lib/storefront-analytics";
import {
  formatPrice,
  listingFacts,
  offeringGridClass,
  sortProducts,
  uniqueCategories,
  type SortKey,
} from "@/lib/storefront";

function productImage(product: Product) {
  return product.images.find((i) => i.is_primary) ?? product.images[0];
}

function ProductCard({
  product,
  slug,
  onWhatsApp,
}: {
  product: Product;
  slug: string;
  onWhatsApp?: () => void;
}) {
  const image = productImage(product);
  const unavailable =
    product.offering_kind !== "service" &&
    product.stock != null &&
    product.stock <= 0;

  return (
    <article className="group flex flex-col">
      <Link href={`/store/${slug}/${product.slug}`} className="block">
        <div className="aspect-[4/5] overflow-hidden rounded-md border border-kova-border bg-[var(--store-secondary-soft)]">
          {image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc(image.url)}
              alt={image.alt_text || product.name}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-kova-muted">
              No photo
            </div>
          )}
        </div>
        <h3
          className="mt-2.5 line-clamp-2 text-sm font-semibold leading-snug"
          style={{ color: "var(--store-secondary)" }}
        >
          {product.name}
        </h3>
        {listingFacts(product) ? (
          <p className="mt-0.5 text-xs text-kova-muted">{listingFacts(product)}</p>
        ) : null}
        <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: "var(--store-accent)" }}>
          {formatPrice(product.currency, product.price)}
        </p>
        {unavailable ? (
          <p className="mt-0.5 text-xs font-medium text-red-700">Unavailable</p>
        ) : product.stock != null && product.stock <= 3 ? (
          <p className="mt-0.5 text-xs text-kova-muted">{product.stock} left</p>
        ) : null}
      </Link>
      {onWhatsApp ? (
        <button
          type="button"
          onClick={onWhatsApp}
          className="mt-2 text-left text-xs font-semibold text-kova-green hover:underline"
        >
          Quick WhatsApp enquiry
        </button>
      ) : null}
    </article>
  );
}

export function StoreCatalog({
  slug,
  page,
  products,
  sectionId = "catalog",
}: {
  slug: string;
  page: CommercePage;
  products: Product[];
  sectionId?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [maxPrice, setMaxPrice] = useState("");

  const categories = useMemo(() => uniqueCategories(products), [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const max = maxPrice ? Number(maxPrice) : null;
    let rows = products.filter((product) => {
      if (category && (product.category || "").trim() !== category) return false;
      if (max != null && Number.isFinite(max)) {
        const price = Number(product.price);
        if (Number.isFinite(price) && price > max) return false;
      }
      if (!needle) return true;
      const hay = [
        product.name,
        product.category,
        product.brand,
        product.color,
        product.short_description,
        product.description,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
    rows = sortProducts(rows, sort);
    return rows;
  }, [products, query, category, sort, maxPrice]);

  const gridClass = offeringGridClass(page.layout_preset);

  function onSearchChange(value: string) {
    setQuery(value);
    if (value.trim().length >= 2) {
      trackStorefrontEvent(slug, "search", {
        meta: { q: value.trim().slice(0, 80) },
      });
    }
  }

  return (
    <section id={sectionId} className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: "var(--store-secondary)" }}>
            Shop products
          </h2>
          <p className="mt-1 text-sm text-kova-muted">
            {products.length} listing{products.length === 1 ? "" : "s"}
            {filtered.length !== products.length
              ? ` · showing ${filtered.length}`
              : ""}
          </p>
        </div>
        <label className="w-full sm:max-w-xs">
          <span className="sr-only">Search products</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or category…"
            className="h-11 w-full rounded-lg border border-kova-border bg-white px-3 text-sm"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            if (e.target.value) {
              trackStorefrontEvent(slug, "filter", { meta: { category: e.target.value } });
            }
          }}
          className="h-10 rounded-lg border border-kova-border bg-white px-3 text-sm"
          aria-label="Category"
        >
          <option value="">All categories</option>
          {categories.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="h-10 rounded-lg border border-kova-border bg-white px-3 text-sm"
          aria-label="Sort"
        >
          <option value="featured">Featured</option>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="name_asc">Name: A–Z</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-kova-muted">
          <span className="whitespace-nowrap">Max price</span>
          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-10 w-28 rounded-lg border border-kova-border px-2 text-sm"
            placeholder="KES"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-kova-muted">
          {products.length === 0
            ? "Nothing is listed yet. Check back soon."
            : "No products match your search. Try clearing filters."}
        </p>
      ) : (
        <div className={`mt-6 grid gap-x-3 gap-y-8 sm:gap-x-5 ${gridClass}`}>
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} slug={slug} />
          ))}
        </div>
      )}
    </section>
  );
}
