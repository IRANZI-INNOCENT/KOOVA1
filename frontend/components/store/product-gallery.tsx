"use client";

import { useState } from "react";

import type { ProductImage } from "@/lib/commerce";
import { mediaSrc } from "@/lib/media";

export function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const sorted = [...images].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const [activeImage, setActiveImage] = useState(0);
  const image = sorted[activeImage] ?? sorted[0];

  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg border border-kova-border bg-white">
        {image?.url ? (
          <img
            src={mediaSrc(image.url)}
            alt={image.alt_text || productName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}
      </div>
      {sorted.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5 sm:gap-3">
          {sorted.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveImage(index)}
              className={`aspect-square overflow-hidden rounded-lg border bg-white transition ${
                index === activeImage
                  ? "border-kova-orange ring-1 ring-kova-orange/30"
                  : "border-kova-border hover:border-kova-orange/40"
              }`}
            >
              {item.url && (
                <img
                  src={mediaSrc(item.url)}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
