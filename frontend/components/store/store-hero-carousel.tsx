"use client";

import { useEffect, useState } from "react";

import { mediaSrc } from "@/lib/media";

export type HeroSlide = {
  id: number | string;
  url: string;
  alt_text?: string;
};

/**
 * Auto-advancing storefront hero for promo / flash-sale creatives.
 */
export function StoreHeroCarousel({
  slides,
  tall,
}: {
  slides: HeroSlide[];
  tall?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const slideKey = slides.map((s) => String(s.id)).join("|");

  useEffect(() => {
    setIndex(0);
  }, [slideKey]);

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const aspect = tall
    ? "aspect-[21/9] max-h-[420px]"
    : "aspect-[2.4/1] max-h-[320px]";

  return (
    <div className={`relative w-full overflow-hidden bg-kova-background ${aspect}`}>
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          className="absolute inset-0 transition-opacity duration-500 ease-out"
          style={{ opacity: i === index ? 1 : 0 }}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mediaSrc(slide.url)}
            alt={slide.alt_text || ""}
            className="h-full w-full object-cover"
          />
        </div>
      ))}

      {count > 1 && (
        <>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Show slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-5 bg-white shadow-sm"
                    : "w-1.5 bg-white/55 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() =>
              setIndex((current) => (current - 1 + count) % count)
            }
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((current) => (current + 1) % count)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}
