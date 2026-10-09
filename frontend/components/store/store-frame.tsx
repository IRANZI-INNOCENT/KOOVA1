import type { ReactNode } from "react";
import Link from "next/link";

import type { CommercePage } from "@/lib/commerce";
import { whatsappLink } from "@/lib/storefront";

interface StoreFrameProps {
  page: CommercePage;
  slug: string;
  children: ReactNode;
}

export function StoreFrame({ page, slug, children }: StoreFrameProps) {
  const shopHref = `/store/${slug}`;

  return (
    <div className="min-h-screen bg-kova-background">
      {/* ──── Green branded header ──── */}
      <header className="sticky top-0 z-40 bg-kova-green pt-[env(safe-area-inset-top)] text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href={shopHref}
            className="min-w-0 flex-1 truncate text-base font-bold tracking-tight"
          >
            {page.business_name}
          </Link>

          <nav
            className="hidden items-center gap-6 md:flex"
            aria-label="Store"
          >
            <Link
              href={`${shopHref}#products`}
              className="text-sm font-medium text-white/85 transition hover:text-kova-orange"
            >
              Shop
            </Link>
            <Link
              href={`${shopHref}#about`}
              className="text-sm font-medium text-white/85 transition hover:text-kova-orange"
            >
              About
            </Link>
            {page.location && (
              <span className="text-sm text-white/60">{page.location}</span>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {page.phone && (
              <a
                href={`tel:${page.phone}`}
                className="hidden text-sm text-white/75 transition hover:text-white sm:block"
              >
                {page.phone}
              </a>
            )}
            {page.whatsapp && (
              <a
                href={whatsappLink(page.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 shrink-0 items-center rounded-lg bg-kova-orange px-4 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Mobile nav */}
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
          <Link
            href={`${shopHref}#about`}
            className="text-sm font-medium text-white/85"
          >
            About
          </Link>
        </nav>
      </header>

      {children}

      {/* ──── Footer ──── */}
      <footer id="about" className="bg-kova-green text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-lg font-bold">{page.business_name}</p>
              {page.tagline && (
                <p className="mt-1 text-sm text-white/70">{page.tagline}</p>
              )}
              {page.description && (
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/60">
                  {page.description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
                {page.location && <span>{page.location}</span>}
                {page.phone && (
                  <a
                    href={`tel:${page.phone}`}
                    className="transition hover:text-kova-orange"
                  >
                    {page.phone}
                  </a>
                )}
                {page.email && (
                  <a
                    href={`mailto:${page.email}`}
                    className="transition hover:text-kova-orange"
                  >
                    {page.email}
                  </a>
                )}
              </div>
            </div>
            <p className="text-xs text-white/40">Powered by Kova</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
