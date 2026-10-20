"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  {
    src: "/landing/hero-1.jpg",
    alt: "Kenyan shop owner at her store counter",
    position: "object-[center_20%]",
  },
  {
    src: "/landing/hero-2.jpg",
    alt: "East African business owner using a phone at her market stall",
    position: "object-center",
  },
  {
    src: "/landing/hero-3.jpg",
    alt: "African market vendor with a phone at his fruit stand",
    position: "object-center",
  },
] as const;

const INTERVAL_MS = 5500;

export default function HeroSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return;

    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative isolate min-h-[min(92vh,52rem)] overflow-hidden bg-kova-dark">
      {slides.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          fill
          className={`object-cover transition-opacity duration-1000 ease-out ${slide.position} ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
          sizes="100vw"
          priority={index === 0}
        />
      ))}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-kova-dark via-kova-dark/80 to-kova-dark/45"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kova-dark/90 via-transparent to-kova-dark/30"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[min(92vh,52rem)] max-w-6xl flex-col justify-end px-4 pb-16 pt-[calc(7.5rem+env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pb-24">
        <div className="max-w-2xl">
          <p className="font-display text-5xl font-semibold tracking-tight text-kova-orange sm:text-6xl lg:text-7xl">
            KCOVA
          </p>

          <h1 className="mt-5 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl lg:text-[2.15rem]">
            Automate your business operations
          </h1>

          <p className="mt-4 max-w-lg text-base leading-7 text-white/80 sm:text-lg">
            Social media, commerce and lead generation
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-kova-orange px-7 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-dark"
            >
              Start your free trial
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/35 bg-transparent px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-dark"
            >
              See how it works
            </a>
          </div>

          <p className="mt-5 text-sm text-white/55">
            7-day free trial · Cancel anytime
          </p>
        </div>

        <div
          className="mt-10 flex items-center gap-2"
          role="tablist"
          aria-label="Hero images"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={index === active}
              aria-label={`Show image ${index + 1}`}
              onClick={() => setActive(index)}
              className={`h-1 rounded-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-dark ${
                index === active
                  ? "w-8 bg-kova-orange"
                  : "w-4 bg-white/35 hover:bg-white/55"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
