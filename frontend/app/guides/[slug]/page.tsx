import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ContentSection,
  ContentShell,
} from "@/components/marketing/content-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { GUIDES, getGuide } from "@/lib/marketing-content";
import { buildPageMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site-url";

type Params = { slug: string };

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Not found", robots: { index: false } };
  return buildPageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
  });
}

export default async function GuidePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updated,
    author: { "@type": "Organization", name: "KCOVA" },
    publisher: {
      "@type": "Organization",
      name: "KCOVA",
      url: absoluteUrl("/"),
    },
    mainEntityOfPage: absoluteUrl(`/guides/${guide.slug}`),
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: guide.title,
    description: guide.description,
    step: guide.sections.map((section, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: section.heading,
      text: section.body.join(" "),
    })),
  };

  return (
    <ContentShell
      eyebrow={guide.eyebrow}
      title={guide.title}
      support={guide.description}
      secondaryHref="/guides"
      secondaryLabel="All guides"
    >
      <JsonLd data={[articleLd, howToLd]} />
      <p className="text-xs font-medium tracking-wide text-kova-dark/40">
        Updated {guide.updated} · {guide.readMinutes} min read
      </p>

      {guide.sections.map((section) => (
        <ContentSection key={section.heading} heading={section.heading}>
          {section.body.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </ContentSection>
      ))}

      {guide.ctaNote && (
        <div className="mt-14 border-t border-kova-border pt-10">
          <p className="font-display text-lg font-semibold text-kova-dark">
            Try it in KCOVA
          </p>
          <p className="mt-2 text-sm leading-6 text-kova-dark/70">
            {guide.ctaNote}
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex h-11 items-center rounded-md bg-kova-orange px-5 text-sm font-bold text-kova-dark transition hover:bg-[#f0a46e]"
          >
            Start free trial
          </Link>
        </div>
      )}

      <p className="mt-12 text-sm text-kova-dark/55">
        <Link
          href="/guides"
          className="font-semibold text-kova-green underline-offset-4 hover:underline"
        >
          ← All guides
        </Link>
      </p>
    </ContentShell>
  );
}
