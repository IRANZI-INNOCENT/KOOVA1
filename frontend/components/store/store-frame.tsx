import type { ReactNode } from "react";
import Link from "next/link";

import type { CommercePage } from "@/lib/commerce";
import { resolveStoreImage } from "@/lib/store-theme";
import { whatsappLink } from "@/lib/storefront";

interface StoreFrameProps {
  page: CommercePage;
  slug: string;
  children: ReactNode;
}

/** Public shop palette taken from the Nyawira-style store template. */
const CREAM = "#FFF8EE";
const BROWN = "#6B3E16";
const GOLD = "#C9973A";
const GREEN = "#1B7A34";
const INK = "#3F3A34";

export function StoreFrame({ page, slug, children }: StoreFrameProps) {
  const shopHref = `/store/${slug}`;
  const logoSrc = resolveStoreImage(page.logo_url);
  const name = page.title?.trim() || page.business_name;

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: CREAM,
        color: INK,
        ["--store-cream" as string]: CREAM,
        ["--store-brown" as string]: BROWN,
        ["--store-gold" as string]: GOLD,
        ["--store-green" as string]: GREEN,
        ["--store-ink" as string]: INK,
        fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <header
        className="sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)]"
        style={{ backgroundColor: CREAM, borderColor: "rgba(107,62,22,0.08)" }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5 sm:px-6 lg:h-[76px] lg:flex-nowrap lg:py-0">
          <Link
            href={shopHref}
            className="flex min-w-0 items-center gap-2.5"
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md object-cover"
              />
            ) : (
              <StoreMark />
            )}
            <span
              className="truncate text-[1.35rem] font-bold tracking-tight"
              style={{ color: BROWN }}
            >
              {name}
            </span>
          </Link>

          {page.whatsapp ? (
            <a
              href={whatsappLink(page.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex h-11 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white"
              style={{ backgroundColor: GREEN }}
            >
              <WhatsAppGlyph />
              WhatsApp
            </a>
          ) : null}
        </div>
      </header>

      {children}

      <footer
        id="contact"
        className="border-t"
        style={{ borderColor: "rgba(107,62,22,0.1)", backgroundColor: CREAM }}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-lg font-bold" style={{ color: BROWN }}>
              {name}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm" style={{ color: INK }}>
              {page.location ? <span>{page.location}</span> : null}
              {page.phone ? (
                <a href={`tel:${page.phone}`} className="hover:underline">
                  {page.phone}
                </a>
              ) : null}
              {page.email ? (
                <a href={`mailto:${page.email}`} className="hover:underline">
                  {page.email}
                </a>
              ) : null}
            </div>
          </div>
          <p className="text-xs" style={{ color: "rgba(63,58,52,0.55)" }}>
            Powered by KCOVA
          </p>
        </div>
      </footer>
    </div>
  );
}

function StoreMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden className="shrink-0">
      <rect x="4" y="8" width="28" height="20" rx="6" fill="#6B3E16" />
      <path
        d="M10 14h16M12 18h12M14 22h8"
        stroke="#FFF8EE"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function WhatsAppGlyph({ light = true }: { light?: boolean }) {
  const fill = light ? "#FFFFFF" : "#1B7A34";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill={fill}
        d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 004.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 13.92c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.42-.14-.95-.31-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.27.64-.39 1.02-.39.12 0 .23 0 .33.01.3.01.45.03.65.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.13-.28.28-.12.54.16.27.71 1.17 1.53 1.89 1.05.93 1.94 1.22 2.21 1.36.27.14.43.12.59-.07.16-.19.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.54.73 1.8.86.27.13.44.2.51.31.06.11.06.65-.18 1.33z"
      />
    </svg>
  );
}
