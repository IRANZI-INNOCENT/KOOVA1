"use client";

import { Product } from "./types";

interface ProductIntelligenceProps {
  product: Product;
}

function AttributeList({
  attributes,
}: {
  attributes: Record<string, unknown>;
}) {
  const entries = Object.entries(attributes || {});

  if (!entries.length) {
    return (
      <p className="text-sm text-[#69736D]">
        Kova has not identified additional visual attributes yet.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-[#E5E7E5] bg-[#FAFAF8] p-3"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[#7A837E]">
            {key.replace(/_/g, " ")}
          </p>
          <p className="mt-1 text-sm text-[#17211D]">
            {typeof value === "object"
              ? JSON.stringify(value)
              : String(value)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ProductIntelligence({
  product,
}: ProductIntelligenceProps) {
  const confidence =
    product.ai_confidence === null
      ? null
      : Math.round(Number(product.ai_confidence));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#E5E7E5] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#176B4D]">
              Kova Intelligence
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[#17211D]">
              What Kova understands
            </h2>
          </div>

          {confidence !== null && (
            <div className="rounded-xl bg-[#E7F2ED] px-4 py-3 text-right">
              <p className="text-xs text-[#176B4D]">Confidence</p>
              <p className="text-xl font-semibold text-[#176B4D]">
                {confidence}%
              </p>
            </div>
          )}
        </div>

        {product.ai_summary ? (
          <div className="mt-5 rounded-xl bg-[#FAFAF8] p-4">
            <p className="text-sm leading-6 text-[#46514B]">
              {product.ai_summary}
            </p>
          </div>
        ) : (
          <p className="mt-5 text-sm text-[#69736D]">
            Kova has not generated a product summary yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[#E5E7E5] bg-white p-6">
        <h3 className="font-semibold text-[#17211D]">Selling points</h3>

        {product.selling_points?.length ? (
          <div className="mt-4 space-y-2">
            {product.selling_points.map((point, index) => (
              <div
                key={`${point}-${index}`}
                className="flex gap-3 rounded-xl bg-[#FAFAF8] p-3"
              >
                <span className="mt-0.5 font-semibold text-[#176B4D]">
                  {index + 1}.
                </span>
                <span className="text-sm text-[#46514B]">{point}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#69736D]">
            No selling points generated yet.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[#E5E7E5] bg-white p-6">
        <h3 className="font-semibold text-[#17211D]">Visual attributes</h3>

        <div className="mt-4">
          <AttributeList attributes={product.visual_attributes} />
        </div>
      </section>

      <section className="rounded-2xl border border-[#E5E7E5] bg-white p-6">
        <h3 className="font-semibold text-[#17211D]">
          Attributes requiring review
        </h3>

        {product.uncertain_attributes?.length ? (
          <div className="mt-4 space-y-2">
            {product.uncertain_attributes.map((attribute, index) => (
              <div
                key={`${attribute}-${index}`}
                className="rounded-xl border border-[#F0D4B8] bg-[#FFF8F1] p-3 text-sm text-[#7B542F]"
              >
                {attribute}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#69736D]">
            Kova has not flagged any uncertain attributes.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[#E5E7E5] bg-white p-6">
        <h3 className="font-semibold text-[#17211D]">SEO intelligence</h3>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#7A837E]">
              SEO title
            </p>
            <p className="mt-1 text-sm text-[#46514B]">
              {product.seo_title || "Not generated"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#7A837E]">
              SEO description
            </p>
            <p className="mt-1 text-sm leading-6 text-[#46514B]">
              {product.seo_description || "Not generated"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#7A837E]">
              Keywords
            </p>

            {product.keywords?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {product.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-[#E5E7E5] px-3 py-1 text-xs text-[#46514B]"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-[#69736D]">
                No keywords generated.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}