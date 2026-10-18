import type { Product } from "@/lib/commerce";

export type SeoCheckId =
  | "name"
  | "price"
  | "photo"
  | "photos_multi"
  | "short_description"
  | "seo_title"
  | "seo_description"
  | "alt_text"
  | "active"
  | "keywords";

export type SeoCheck = {
  id: SeoCheckId;
  label: string;
  passed: boolean;
  weight: number;
  hint: string;
};

export type SeoHealth = {
  score: number;
  max: number;
  percent: number;
  grade: "strong" | "ok" | "weak";
  checks: SeoCheck[];
  passedCount: number;
};

function gradeFor(percent: number): SeoHealth["grade"] {
  if (percent >= 80) return "strong";
  if (percent >= 55) return "ok";
  return "weak";
}

/** Score a product for public search + share readiness. */
export function scoreProductSeo(product: Product): SeoHealth {
  const images = product.images || [];
  const primary = images.find((i) => i.is_primary) ?? images[0];
  const hasAlt = images.some((i) => (i.alt_text || "").trim().length >= 3);

  const checks: SeoCheck[] = [
    {
      id: "name",
      label: "Clear product name",
      passed: (product.name || "").trim().length >= 4,
      weight: 15,
      hint: "Use the name customers would search or ask for.",
    },
    {
      id: "price",
      label: "Price set",
      passed: product.price != null && String(product.price).trim() !== "",
      weight: 15,
      hint: "Public pages and posts need a real KES price.",
    },
    {
      id: "photo",
      label: "At least one photo",
      passed: images.length >= 1 && !!primary?.url,
      weight: 15,
      hint: "Search and WhatsApp previews need an image.",
    },
    {
      id: "photos_multi",
      label: "2+ photos (carousel-ready)",
      passed: images.length >= 2,
      weight: 10,
      hint: "Extra angles unlock real multi-image posts.",
    },
    {
      id: "short_description",
      label: "Short description",
      passed: (product.short_description || "").trim().length >= 40,
      weight: 10,
      hint: "One or two sentences buyers see under the title.",
    },
    {
      id: "seo_title",
      label: "SEO title",
      passed:
        (product.seo_title || "").trim().length >= 15 &&
        (product.seo_title || "").trim().length <= 70,
      weight: 10,
      hint: "Aim for about 15–70 characters.",
    },
    {
      id: "seo_description",
      label: "SEO description",
      passed:
        (product.seo_description || "").trim().length >= 50 &&
        (product.seo_description || "").trim().length <= 160,
      weight: 10,
      hint: "About 50–160 characters for search snippets.",
    },
    {
      id: "alt_text",
      label: "Image alt text",
      passed: hasAlt,
      weight: 5,
      hint: "Describe the photo for accessibility and image search.",
    },
    {
      id: "keywords",
      label: "Keywords",
      passed: (product.keywords || []).filter(Boolean).length >= 2,
      weight: 5,
      hint: "Add a few terms buyers use (optional but helpful).",
    },
    {
      id: "active",
      label: "Listed as active",
      passed: product.status === "active",
      weight: 5,
      hint: "Only active products appear on the public store.",
    },
  ];

  const max = checks.reduce((sum, c) => sum + c.weight, 0);
  const score = checks.reduce(
    (sum, c) => sum + (c.passed ? c.weight : 0),
    0,
  );
  const percent = max ? Math.round((score / max) * 100) : 0;

  return {
    score,
    max,
    percent,
    grade: gradeFor(percent),
    checks,
    passedCount: checks.filter((c) => c.passed).length,
  };
}
