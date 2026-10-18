"use client";

import type { Product } from "@/lib/commerce";
import { scoreProductSeo } from "@/lib/product-seo-health";

const GRADE_STYLES = {
  strong: "bg-kova-green/10 text-kova-green",
  ok: "bg-kova-orange/20 text-kova-dark",
  weak: "bg-red-50 text-red-700",
} as const;

const GRADE_LABEL = {
  strong: "Strong",
  ok: "Needs work",
  weak: "Weak",
} as const;

export function SeoHealthCard({ product }: { product: Product }) {
  const health = scoreProductSeo(product);

  return (
    <div className="mt-5 rounded-lg border border-kova-border bg-kova-background/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-kova-dark">SEO health</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Readiness for search snippets and link previews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-bold ${GRADE_STYLES[health.grade]}`}
          >
            {GRADE_LABEL[health.grade]}
          </span>
          <span className="text-sm font-bold tabular-nums text-kova-dark">
            {health.percent}%
          </span>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-kova-border">
        <div
          className="h-full rounded-full bg-kova-green transition-all"
          style={{ width: `${health.percent}%` }}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {health.checks.map((check) => (
          <li key={check.id} className="flex gap-2.5 text-sm">
            <span
              className={`mt-0.5 shrink-0 text-xs font-bold ${
                check.passed ? "text-kova-green" : "text-gray-400"
              }`}
              aria-hidden
            >
              {check.passed ? "✓" : "○"}
            </span>
            <span>
              <span
                className={
                  check.passed ? "text-kova-dark" : "font-medium text-kova-dark"
                }
              >
                {check.label}
              </span>
              {!check.passed && (
                <span className="mt-0.5 block text-xs text-gray-500">
                  {check.hint}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
