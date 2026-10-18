"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { mediaSrc } from "@/lib/media";

export type HeroSlide = {
  id: number | string;
  url: string;
  alt_text?: string;
  href?: string | null;
  product_name?: string | null;
};

/**
 * Storefront hero — product-first ecommerce layout.
 * Mobile: full-bleed cover photo with offer strip.
 * Desktop: image + offer panel (no letterboxed grey bars).
 */
export function StoreHeroCarousel({
  slides,
  tall,
}: {
  slides: HeroSlide[];
  tall?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const touchX = useRef<number | null>(null);
  const dragged = useRef(false);
  const regionRef = useRef<HTMLDivElement>(null);

  const slideKey = slides.map((s) => String(s.id)).join("|");

  useEffect(() => {
    setIndex(0);
  }, [slideKey]);

  const go = useCallback(
    (next: number) => {
      if (count <= 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    const node = regionRef.current;
    if (!node) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "ArrowRight") go(index + 1);
    }
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [go, index]);

  if (count === 0) return null;

  const active = slides[index];
  const activeHref = active?.href?.trim() || "";
  const headline =
    active?.alt_text?.trim() ||
    active?.product_name?.trim() ||
    "Featured pick";
  const subline = active?.product_name?.trim()
    ? active.product_name.trim() !== headline
      ? active.product_name.trim()
      : null
    : null;

  function onPointerDown(event: ReactPointerEvent) {
    touchX.current = event.clientX;
    dragged.current = false;
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (touchX.current == null) return;
    if (Math.abs(event.clientX - touchX.current) > 12) {
      dragged.current = true;
    }
  }

  function onPointerUp(event: ReactPointerEvent) {
    if (touchX.current == null) return;
    const delta = event.clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(delta) < 48) return;
    dragged.current = true;
    go(delta < 0 ? index + 1 : index - 1);
  }

  function preventNavIfDragged(
    event: React.MouseEvent | React.PointerEvent,
  ) {
    if (dragged.current) {
      event.preventDefault();
    }
  }

  const stageHeight = tall
    ? "min-h-[320px] sm:min-h-[360px] lg:min-h-[400px]"
    : "min-h-[300px] sm:min-h-[340px] lg:min-h-[380px]";

  return (
    <div
      ref={regionRef}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Store promotions"
      className="relative w-full outline-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        touchX.current = null;
      }}
    >
      <div
        className={`relative grid w-full overflow-hidden bg-[var(--store-secondary)] ${stageHeight} sm:grid-cols-12`}
      >
        {/* Photo column — full bleed on mobile, ~58% on desktop */}
        <div className="relative min-h-[260px] sm:col-span-7 sm:min-h-0 lg:col-span-8">
          {slides.map((slide, i) => {
            const src = mediaSrc(slide.url);
            const visible = i === index;
            return (
              <div
                key={slide.id}
                className="absolute inset-0 transition-opacity duration-500 ease-out"
                style={{
                  opacity: visible ? 1 : 0,
                  pointerEvents: visible ? "auto" : "none",
                }}
                aria-hidden={!visible}
              >
                {/* Soft fill so cover crops never feel empty */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl"
                  decoding="async"
                  loading="lazy"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={slide.alt_text || slide.product_name || "Promotion"}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  decoding={i === 0 ? "sync" : "async"}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "low"}
                  sizes="(max-width: 640px) 100vw, 66vw"
                />
              </div>
            );
          })}

          {/* Mobile offer strip over the photo */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/80 via-black/45 to-transparent px-4 pb-12 pt-20 sm:hidden">
            <p className="text-xl font-bold tracking-tight text-white">
              {headline}
            </p>
            {subline ? (
              <p className="mt-1 line-clamp-1 text-sm text-white/85">
                {subline}
              </p>
            ) : null}
            {activeHref ? (
              <span
                className="mt-3 inline-flex h-10 items-center rounded-lg px-4 text-sm font-bold"
                style={{
                  backgroundColor: "var(--store-accent)",
                  color: "var(--store-on-accent)",
                }}
              >
                Shop now
              </span>
            ) : null}
          </div>

          {activeHref ? (
            <Link
              href={activeHref}
              className="absolute inset-0 z-[1]"
              aria-label={`View: ${headline}`}
              onClick={preventNavIfDragged}
            >
              <span className="sr-only">Open offer</span>
            </Link>
          ) : null}

          {count > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous slide"
                onClick={() => go(index - 1)}
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white backdrop-blur-sm transition hover:bg-black/55 sm:h-11 sm:w-11"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next slide"
                onClick={() => go(index + 1)}
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-xl text-white backdrop-blur-sm transition hover:bg-black/55 sm:h-11 sm:w-11"
              >
                ›
              </button>
            </>
          ) : null}

          {count > 1 ? (
            <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2 sm:hidden">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show slide ${i + 1}${
                    slide.alt_text ? `: ${slide.alt_text}` : ""
                  }`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index
                      ? "w-6 bg-white shadow"
                      : "w-2 bg-white/55 hover:bg-white/85"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        {/* Desktop offer panel */}
        <div
          className="relative z-[2] hidden flex-col justify-center px-6 py-8 sm:col-span-5 sm:flex lg:col-span-4 lg:px-10"
          style={{
            background:
              "linear-gradient(165deg, var(--store-secondary) 0%, color-mix(in srgb, var(--store-secondary) 82%, var(--store-primary)) 100%)",
            color: "var(--store-on-secondary)",
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{
              color:
                "color-mix(in srgb, var(--store-on-secondary) 65%, transparent)",
            }}
          >
            {activeHref ? "Featured offer" : "In store now"}
          </p>
          <p className="mt-3 text-2xl font-bold leading-tight tracking-tight lg:text-3xl">
            {headline}
          </p>
          {subline ? (
            <p
              className="mt-2 line-clamp-2 text-sm leading-6"
              style={{
                color:
                  "color-mix(in srgb, var(--store-on-secondary) 78%, transparent)",
              }}
            >
              {subline}
            </p>
          ) : (
            <p
              className="mt-2 text-sm leading-6"
              style={{
                color:
                  "color-mix(in srgb, var(--store-on-secondary) 70%, transparent)",
              }}
            >
              {activeHref
                ? "Tap through to see details, price, and order on WhatsApp."
                : "Swipe to browse what’s featured today."}
            </p>
          )}

          {activeHref ? (
            <Link
              href={activeHref}
              onClick={preventNavIfDragged}
              className="mt-6 inline-flex h-11 w-fit items-center justify-center rounded-lg px-5 text-sm font-bold transition hover:brightness-105"
              style={{
                backgroundColor: "var(--store-accent)",
                color: "var(--store-on-accent)",
              }}
            >
              Shop this offer →
            </Link>
          ) : null}

          {count > 1 ? (
            <div className="mt-8 flex items-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show slide ${i + 1}${
                    slide.alt_text ? `: ${slide.alt_text}` : ""
                  }`}
                  aria-current={i === index}
                  onClick={() => go(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index
                      ? "w-7 bg-[var(--store-accent)]"
                      : "w-2 bg-white/35 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
