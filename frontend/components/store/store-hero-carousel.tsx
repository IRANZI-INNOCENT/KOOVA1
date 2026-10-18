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
};

/**
 * Storefront promo carousel — full graphic visible (contain), caption overlay,
 * swipe + keyboard friendly. Slides with href are clickable.
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

  const stageClass = tall
    ? "relative w-full overflow-hidden sm:aspect-[21/9] sm:max-h-[440px]"
    : "relative w-full overflow-hidden sm:aspect-[2.2/1] sm:max-h-[380px]";

  const media = (
    <>
      <div className="relative mx-auto flex h-[min(58vw,300px)] max-h-[340px] w-full items-center justify-center sm:absolute sm:inset-0 sm:h-full sm:max-h-none">
        {slides.map((slide, i) => {
          const src = mediaSrc(slide.url);
          const visible = i === index;
          return (
            <div
              key={slide.id}
              className="absolute inset-0 flex items-center justify-center transition-opacity duration-500 ease-out"
              style={{
                opacity: visible ? 1 : 0,
                pointerEvents: visible ? "auto" : "none",
              }}
              aria-hidden={!visible}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={slide.alt_text || "Promotion"}
                className="max-h-full max-w-full object-contain"
                decoding={i === 0 ? "sync" : "async"}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                sizes="100vw"
              />
            </div>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-4 pb-11 pt-16 sm:px-8 sm:pb-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-center sm:text-left">
            {active?.alt_text?.trim() ? (
              <p className="text-base font-bold tracking-tight text-white drop-shadow sm:text-xl md:text-2xl">
                {active.alt_text.trim()}
              </p>
            ) : null}
            {activeHref ? (
              <p className="mt-1 text-xs font-semibold text-white/85 sm:text-sm">
                Tap to view offer →
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );

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
        className={stageClass}
        style={{
          background:
            "linear-gradient(160deg, var(--store-secondary-soft), var(--store-primary-soft))",
          minHeight: "min(52vw, 280px)",
        }}
      >
        {activeHref ? (
          <Link
            href={activeHref}
            className="absolute inset-0 z-[1] block"
            aria-label={
              active?.alt_text?.trim()
                ? `View: ${active.alt_text.trim()}`
                : "View promoted product"
            }
            onClick={(event) => {
              if (dragged.current) {
                event.preventDefault();
              }
            }}
          >
            <span className="sr-only">Open promotion</span>
          </Link>
        ) : null}

        <div className="relative z-0 sm:absolute sm:inset-0">{media}</div>

        {count > 1 && (
          <>
            <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2">
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
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white shadow-sm backdrop-blur-sm transition hover:bg-black/60 sm:left-4 sm:h-11 sm:w-11"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-xl text-white shadow-sm backdrop-blur-sm transition hover:bg-black/60 sm:right-4 sm:h-11 sm:w-11"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  );
}
