import type { Metadata } from "next";

import { absoluteUrl, getSiteOrigin } from "@/lib/site-url";

export const DEFAULT_OG_IMAGE = "/landing/snap.jpg";

export function defaultOpenGraph(overrides?: {
  title?: string;
  description?: string;
  url?: string;
  images?: string[];
}): NonNullable<Metadata["openGraph"]> {
  const title =
    overrides?.title ||
    "KCOVA — Social Media, Products and WhatsApp Sales in One Place";
  const description =
    overrides?.description ||
    "Manage social content, prepare product listings, bring your products together on one commerce page, and guide customers to WhatsApp with KCOVA.";
  const images = (overrides?.images?.length
    ? overrides.images
    : [DEFAULT_OG_IMAGE]
  ).map((src) => ({
    url: absoluteUrl(src),
    width: 1200,
    height: 630,
    alt: title,
  }));

  return {
    type: "website",
    locale: "en_KE",
    siteName: "KCOVA",
    title,
    description,
    url: overrides?.url || getSiteOrigin(),
    images,
  };
}

export function defaultTwitter(overrides?: {
  title?: string;
  description?: string;
  images?: string[];
}): NonNullable<Metadata["twitter"]> {
  const title =
    overrides?.title ||
    "KCOVA — Social Media, Products and WhatsApp Sales in One Place";
  const description =
    overrides?.description ||
    "Manage social content, prepare product listings, and guide customers to WhatsApp with KCOVA.";
  const images = (overrides?.images?.length
    ? overrides.images
    : [DEFAULT_OG_IMAGE]
  ).map((src) => absoluteUrl(src));

  return {
    card: "summary_large_image",
    title,
    description,
    images,
  };
}

export function buildPageMetadata(input: {
  title: string;
  description: string;
  path: string;
  images?: string[];
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(input.path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
    openGraph: defaultOpenGraph({
      title: input.title,
      description: input.description,
      url,
      images: input.images,
    }),
    twitter: defaultTwitter({
      title: input.title,
      description: input.description,
      images: input.images,
    }),
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export function jsonLdScript(data: Record<string, unknown> | Record<string, unknown>[]) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
