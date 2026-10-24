"use client";

import { useEffect, useState } from "react";

import { mediaSrc } from "@/lib/media";
import { WhatsAppGlyph } from "@/components/store/store-frame";

export type SpotlightSlide = {
  id: number | string;
  url: string;
  alt_text?: string;
};

export function StoreSpotlight({
  slides,
  lead,
  accent,
  subtitle,
  menuHref,
  menuLabel = "See offerings",
  whatsappHref,
  whatsappLabel,
  phoneLabel = "",
}: {
  slides: SpotlightSlide[];
  lead: string;
  accent: string;
  subtitle: string;
  menuHref: string;
  menuLabel?: string;
  whatsappHref: string;
  whatsappLabel: string;
  phoneLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [count]);

  return (
    <section className="relative min-h-[260px] overflow-hidden sm:min-h-[420px] lg:min-h-[460px]">
      {count > 0 ? (
        slides.map((slide, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.id}
            src={mediaSrc(slide.url)}
            alt={i === index ? slide.alt_text || "" : ""}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0 }}
            decoding={i === 0 ? "sync" : "async"}
            fetchPriority={i === 0 ? "high" : "low"}
          />
        ))
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: "var(--store-secondary)" }} />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, color-mix(in srgb, var(--store-secondary) 92%, black) 0%, color-mix(in srgb, var(--store-secondary) 72%, transparent) 38%, color-mix(in srgb, var(--store-secondary) 28%, transparent) 62%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[260px] max-w-6xl items-center px-4 py-8 sm:min-h-[420px] sm:px-6 sm:py-12 lg:min-h-[460px]">
        <div className="w-full max-w-xl">
        <h1 className="text-[1.7rem] font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
          {lead}
          {accent ? (
            <span className="mt-1 block" style={{ color: "var(--store-accent)" }}>
              {accent}
            </span>
          ) : null}
        </h1>
        {subtitle ? (
          <p className="mt-4 max-w-md text-sm leading-6 text-white/90 sm:text-[15px]">
            {subtitle}
          </p>
        ) : null}
        {phoneLabel ? (
          <p className="mt-3 text-sm font-semibold text-white">{phoneLabel}</p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:flex-wrap">
          <a
            href={menuHref}
            className="inline-flex h-12 w-full items-center justify-center rounded-md px-5 text-sm font-semibold min-[480px]:w-auto"
            style={{ backgroundColor: "var(--store-accent)", color: "var(--store-on-accent)" }}
          >
            {menuLabel} →
          </a>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-center text-sm font-semibold leading-tight text-white min-[480px]:w-auto"
              style={{ backgroundColor: "#1B7A34" }}
            >
              <WhatsAppGlyph />
              {whatsappLabel}
            </a>
          ) : null}
        </div>
        </div>
      </div>
    </section>
  );
}
