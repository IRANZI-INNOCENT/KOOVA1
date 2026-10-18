import type { ReactNode } from "react";
import Link from "next/link";

import type { CommercePage } from "@/lib/commerce";
import { resolveStoreImage, storeThemeStyle } from "@/lib/store-theme";
import { whatsappLink } from "@/lib/storefront";

interface StoreFrameProps {
  page: CommercePage;
  slug: string;
  children: ReactNode;
}

export function StoreFrame({ page, slug, children }: StoreFrameProps) {
  const shopHref = `/store/${slug}`;
  const logoSrc = resolveStoreImage(page.logo_url);
  const showAbout = page.show_about !== false;

  return (
    <div
      className="min-h-screen bg-kova-background"
      style={storeThemeStyle(page)}
    >
      <header
        className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] text-[var(--store-on-primary)]"
        style={{ backgroundColor: "var(--store-primary)" }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={shopHref}
            className="flex min-w-0 flex-1 items-center gap-2.5 truncate text-base font-bold tracking-tight"
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-white/25"
              />
            ) : null}
            <span className="truncate">
              {page.title?.trim() || page.business_name}
            </span>
          </Link>

          <nav
            className="hidden items-center gap-6 md:flex"
            aria-label="Store"
          >
            <Link
              href={`${shopHref}#products`}
              className="text-sm font-medium text-white/85 transition hover:opacity-100"
              style={{ color: "color-mix(in srgb, var(--store-on-primary) 85%, transparent)" }}
            >
              Shop
            </Link>
            {showAbout && (
              <Link
                href={`${shopHref}#about`}
                className="text-sm font-medium transition"
                style={{ color: "color-mix(in srgb, var(--store-on-primary) 85%, transparent)" }}
              >
                About
              </Link>
            )}
            {page.location && (
              <span
                className="text-sm"
                style={{ color: "color-mix(in srgb, var(--store-on-primary) 60%, transparent)" }}
              >
                {page.location}
              </span>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {page.phone && (
              <a
                href={`tel:${page.phone}`}
                className="hidden text-sm transition sm:block"
                style={{ color: "color-mix(in srgb, var(--store-on-primary) 75%, transparent)" }}
              >
                {page.phone}
              </a>
            )}
            {page.whatsapp && (
              <a
                href={whatsappLink(page.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 shrink-0 items-center rounded-lg px-4 text-sm font-bold transition hover:brightness-105"
                style={{
                  backgroundColor: "var(--store-accent)",
                  color: "var(--store-on-accent)",
                }}
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>

        <nav
          className="flex gap-5 border-t border-white/10 px-4 py-2 md:hidden sm:px-6"
          aria-label="Store"
        >
          <Link
            href={`${shopHref}#products`}
            className="text-sm font-medium text-white/85"
          >
            Shop
          </Link>
          {showAbout && (
            <Link
              href={`${shopHref}#about`}
              className="text-sm font-medium text-white/85"
            >
              About
            </Link>
          )}
        </nav>
      </header>

      {children}

      <footer
        id="about"
        className="text-[var(--store-on-primary)]"
        style={{ backgroundColor: "var(--store-primary)" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                {logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoSrc}
                    alt=""
                    className="h-10 w-10 rounded-md object-cover ring-1 ring-white/20"
                  />
                ) : null}
                <p className="text-lg font-bold">
                  {page.title?.trim() || page.business_name}
                </p>
              </div>
              {showAbout && page.tagline && (
                <p className="mt-1 text-sm text-white/70">{page.tagline}</p>
              )}
              {showAbout && page.description && (
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/60">
                  {page.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
                {page.location && <span>{page.location}</span>}
                {page.phone && (
                  <a
                    href={`tel:${page.phone}`}
                    className="transition hover:text-[var(--store-accent)]"
                  >
                    {page.phone}
                  </a>
                )}
                {page.email && (
                  <a
                    href={`mailto:${page.email}`}
                    className="transition hover:text-[var(--store-accent)]"
                  >
                    {page.email}
                  </a>
                )}
              </div>
            </div>
            <p className="text-xs text-white/40">Powered by KCOVA</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
