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
}: {
  slides: SpotlightSlide[];
  lead: string;
  accent: string;
  subtitle: string;
  menuHref: string;
  menuLabel?: string;
  whatsappHref: string;
  whatsappLabel: string;
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
    <section className="relative min-h-[340px] overflow-hidden sm:min-h-[420px] lg:min-h-[460px]">
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
        <div className="absolute inset-0" style={{ backgroundColor: "#6B3E16" }} />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(92,46,12,0.94) 0%, rgba(92,46,12,0.82) 34%, rgba(92,46,12,0.45) 58%, rgba(92,46,12,0.12) 100%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[340px] max-w-6xl items-center px-4 py-12 sm:min-h-[420px] sm:px-6 lg:min-h-[460px]">
        <div className="max-w-xl">
        <h1 className="text-[2rem] font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
          {lead}
          {accent ? (
            <>
              {" "}
              <span style={{ color: "#E0B15A" }}>{accent}</span>
            </>
          ) : null}
        </h1>
        {subtitle ? (
          <p className="mt-4 max-w-md text-sm leading-6 text-white/90 sm:text-[15px]">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={menuHref}
            className="inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#C9973A" }}
          >
            {menuLabel} →
          </a>
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-semibold text-white"
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
