import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Full-bleed green hero for marketing content pages.
 * Keeps all copy on dark green — no diagonal cuts through white type.
 */
export function MarketingHero({
  brand = "KCOVA",
  eyebrow,
  title,
  support,
  children,
  primaryHref = "/signup",
  primaryLabel = "Start free trial",
  secondaryHref,
  secondaryLabel,
}: {
  brand?: string;
  eyebrow?: string;
  title: string;
  support: string;
  children?: ReactNode;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-kova-green pt-[calc(4.25rem+env(safe-area-inset-top))]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 15% 20%, rgba(244,177,131,0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 90% 80%, rgba(23,33,29,0.35), transparent 50%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:px-8">
        <div className="max-w-2xl motion-safe:animate-[marketing-rise_0.7s_ease-out_both]">
          <p className="font-display text-2xl font-semibold tracking-tight text-kova-orange sm:text-3xl">
            {brand}
          </p>
          {eyebrow ? (
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-white/65">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-[2.35rem]">
            {title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-white/78 sm:text-[1.05rem]">
            {support}
          </p>

          {(primaryHref || secondaryHref || children) && (
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {primaryHref ? (
                <Link
                  href={primaryHref}
                  className="inline-flex h-11 items-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green"
                >
                  {primaryLabel}
                </Link>
              ) : null}
              {secondaryHref && secondaryLabel ? (
                <Link
                  href={secondaryHref}
                  className="inline-flex h-11 items-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green"
                >
                  {secondaryLabel}
                </Link>
              ) : null}
              {children}
            </div>
          )}
        </div>
      </div>

      <div
        className="pointer-events-none h-10 bg-gradient-to-b from-transparent to-kova-background sm:h-14"
        aria-hidden
      />
    </section>
  );
}
