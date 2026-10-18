import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/components/footer";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import Navbar from "@/components/navbar";
import { GUIDES } from "@/lib/marketing-content";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Guides for selling on WhatsApp, Instagram, and Facebook",
  description:
    "Short practical guides for Kenyan shops: WhatsApp catalogs, Instagram-to-order habits, and turning phone photos into listings with KCOVA.",
  path: "/guides",
});

const SHOP_PATHS = [
  { href: "/for/whatsapp-shops", label: "WhatsApp shops" },
  { href: "/for/instagram-sellers", label: "Instagram sellers" },
  { href: "/for/nairobi-shops", label: "Nairobi shops" },
  { href: "/for/fashion-kenya", label: "Fashion Kenya" },
  { href: "/for/campus-sellers", label: "Campus sellers" },
  { href: "/for/beauty-kenya", label: "Beauty Kenya" },
] as const;

export default function GuidesIndexPage() {
  return (
    <main className="min-h-screen bg-kova-background">
      <Navbar />

      <MarketingHero
        eyebrow="Guides"
        title="Practical selling guides for shops on social and WhatsApp"
        support="Written for owners who may never search “KCOVA” — only for how to sell, list products, and get orders."
        primaryHref="/signup"
        primaryLabel="Start free trial"
        secondaryHref="#guide-list"
        secondaryLabel="Browse guides"
      />

      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        <section id="guide-list" aria-labelledby="guide-list-heading">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="guide-list-heading"
                className="font-display text-2xl font-semibold tracking-tight text-kova-dark"
              >
                Start here
              </h2>
              <p className="mt-1 text-sm text-kova-dark/55">
                {GUIDES.length} short guides — pick the one that matches how you
                sell today.
              </p>
            </div>
          </div>

          <ul className="mt-8 divide-y divide-kova-border border-y border-kova-border">
            {GUIDES.map((guide, index) => (
              <li key={guide.slug}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="group grid gap-3 py-7 transition sm:grid-cols-[3rem_1fr_auto] sm:items-start sm:gap-6 motion-safe:hover:bg-white/60"
                >
                  <span
                    className="font-display text-2xl font-semibold text-kova-green/25 transition group-hover:text-kova-orange sm:pt-0.5"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-kova-green">
                      {guide.eyebrow}
                    </p>
                    <h3 className="font-display mt-2 text-xl font-semibold tracking-tight text-kova-dark transition group-hover:text-kova-green sm:text-[1.35rem]">
                      {guide.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-kova-dark/65">
                      {guide.description}
                    </p>
                    <p className="mt-3 text-xs font-medium text-kova-dark/40">
                      {guide.readMinutes} min read
                    </p>
                  </div>
                  <span className="inline-flex items-center text-sm font-semibold text-kova-green transition group-hover:translate-x-0.5 group-hover:text-kova-dark sm:pt-8">
                    Read
                    <span aria-hidden className="ml-1">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mt-16 border-t border-kova-border pt-12"
          aria-labelledby="shop-paths-heading"
        >
          <h2
            id="shop-paths-heading"
            className="font-display text-xl font-semibold tracking-tight text-kova-dark"
          >
            Built for shops like yours
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-kova-dark/55">
            Prefer a page aimed at your channel or city? Start from one of these
            — then come back to the guides when you need the how-to.
          </p>
          <nav
            className="mt-6 flex flex-wrap gap-x-1 gap-y-2 text-sm font-semibold text-kova-dark"
            aria-label="Shop paths"
          >
            {SHOP_PATHS.map((item, index) => (
              <span key={item.href} className="inline-flex items-center">
                {index > 0 ? (
                  <span className="mx-2 text-kova-orange" aria-hidden>
                    ·
                  </span>
                ) : null}
                <Link
                  href={item.href}
                  className="underline-offset-4 transition hover:text-kova-green hover:underline"
                >
                  {item.label}
                </Link>
              </span>
            ))}
          </nav>
        </section>
      </div>

      <Footer />
    </main>
  );
}
