"use client";

import Link from "next/link";
import { Product } from "./types";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage =
    product.images?.find((image) => image.is_primary) ||
    product.images?.[0];

  return (
    <Link
      href={`/workspace/commerce/products/${product.id}`}
      className="group overflow-hidden rounded-2xl border border-[#E5E7E5] bg-white transition hover:-translate-y-0.5 hover:border-[#176B4D]"
    >
      <div className="aspect-square overflow-hidden bg-[#F3F4F1]">
        {primaryImage ? (
          <img
            src={primaryImage.image}
            alt={primaryImage.alt_text || product.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[#6B746F]">
            No image
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="font-semibold text-[#17211D] group-hover:text-[#176B4D]">
            {product.name}
          </h3>

          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              product.status === "active"
                ? "bg-[#E7F2ED] text-[#176B4D]"
                : product.status === "draft"
                  ? "bg-[#FFF2E7] text-[#9A5B22]"
                  : "bg-[#F0F1EF] text-[#68716C]"
            }`}
          >
            {product.status}
          </span>
        </div>

        <p className="line-clamp-2 min-h-[40px] text-sm text-[#69736D]">
          {product.short_description || "No description yet."}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-semibold text-[#17211D]">
            {product.currency} {product.price}
          </span>

          {product.ai_confidence !== null && (
            <span className="text-xs text-[#69736D]">
              AI {Math.round(Number(product.ai_confidence))}%
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}