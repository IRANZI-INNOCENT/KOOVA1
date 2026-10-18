import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ContentSection,
  ContentShell,
} from "@/components/marketing/content-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { allIntentPages, getIntentPage } from "@/lib/marketing-content";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";

type Params = { slug: string };

export function generateStaticParams() {
  return allIntentPages().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getIntentPage(slug);
  if (!page) return { title: "Not found", robots: { index: false } };
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
  });
}

export default async function IntentPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const page = getIntentPage(slug);
  if (!page) notFound();

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.title,
    description: page.description,
    url: absoluteUrl(page.path),
    isPartOf: {
      "@type": "WebSite",
      name: "KCOVA",
      url: absoluteUrl("/"),
    },
  };

  return (
    <ContentShell
      eyebrow="For your business"
      title={page.h1}
      support={page.support}
    >
      <JsonLd data={webPageLd} />
      <ul className="space-y-3 rounded-lg border border-kova-border bg-white p-5 sm:p-6">
        {page.bullets.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm leading-6 text-kova-dark"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-kova-orange" />
            {item}
          </li>
        ))}
      </ul>

      {page.sections.map((section) => (
        <ContentSection key={section.heading} heading={section.heading}>
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </ContentSection>
      ))}

      <p className="mt-12 text-sm text-kova-dark/60">
        Also see{" "}
        <Link href="/guides" className="font-semibold text-kova-green underline">
          practical guides
        </Link>{" "}
        for WhatsApp selling, Instagram orders, and product photos.
      </p>
    </ContentShell>
  );
}
