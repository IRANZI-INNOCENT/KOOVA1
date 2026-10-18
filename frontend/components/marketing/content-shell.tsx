import type { ReactNode } from "react";

import Footer from "@/components/footer";
import { MarketingHero } from "@/components/marketing/marketing-hero";
import Navbar from "@/components/navbar";

export function ContentShell({
  eyebrow,
  title,
  support,
  children,
  ctaHref = "/signup",
  ctaLabel = "Start free trial",
  secondaryHref = "/guides",
  secondaryLabel = "Read guides",
}: {
  eyebrow: string;
  title: string;
  support: string;
  children: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-kova-background">
      <Navbar />
      <MarketingHero
        eyebrow={eyebrow}
        title={title}
        support={support}
        primaryHref={ctaHref}
        primaryLabel={ctaLabel}
        secondaryHref={secondaryHref}
        secondaryLabel={secondaryLabel}
      />
      <article className="mx-auto max-w-3xl px-4 pb-16 pt-2 sm:px-6 sm:pb-20">
        {children}
      </article>
      <Footer />
    </main>
  );
}

export function ContentSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="font-display text-xl font-semibold tracking-tight text-kova-dark sm:text-2xl">
        {heading}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-kova-dark/70">
        {children}
      </div>
    </section>
  );
}
