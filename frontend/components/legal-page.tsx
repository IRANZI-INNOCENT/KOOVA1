import type { ReactNode } from "react";
import Link from "next/link";

import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

const related = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/ai", label: "AI usage" },
];

export const LEGAL_UPDATED = "9 October 2026";

export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-kova-background">
      <Navbar />
      <article className="mx-auto max-w-3xl px-4 pb-20 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-kova-dark sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-gray-500">Last updated {LEGAL_UPDATED}</p>
        <div className="mt-8 space-y-8 text-sm leading-7 text-kova-dark/80">{children}</div>
        <nav className="mt-12 flex flex-wrap gap-2 border-t border-kova-border pt-6">
          {related.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-8 items-center rounded-md border border-kova-border bg-white px-3 text-xs font-semibold text-kova-dark transition hover:border-kova-orange"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </article>
      <Footer />
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-base font-bold text-kova-dark">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
