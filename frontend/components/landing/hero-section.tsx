import Image from "next/image";

import { HeroVisual } from "@/components/landing/hero-visual";

const benefits = [
  "Creating Content",
  "Build your Brand",
  "Attract and retain Leads",
  "Showcase your products",
];

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-kova-dark">
      <Image
        src="/landing/shop.jpg"
        alt=""
        fill
        className="object-cover object-center"
        sizes="100vw"
        priority
      />

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(23,33,29,0.96) 0%, rgba(23,33,29,0.9) 40%, rgba(23,33,29,0.55) 70%, rgba(23,33,29,0.4) 100%)",
        }}
        aria-hidden
      />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-kova-background to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:gap-10 lg:px-8 lg:pb-24 lg:pt-[calc(7rem+env(safe-area-inset-top))]">
        <div className="max-w-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
            SOCIAL · STORE · WHATSAPP
          </p>

          <h1 className="font-display mt-5 text-[2.5rem] font-semibold leading-[1.06] tracking-tight text-kova-orange sm:text-[3.2rem] lg:text-[3.5rem]">
            Automate your social media management
          </h1>

          <p className="mt-4 text-lg font-medium leading-snug text-white/90 sm:text-xl">
            You have a business to run. Let KCOVA help with the rest.
          </p>

          <ul
            className="mt-6 hidden flex-wrap items-center gap-x-2 gap-y-2 sm:flex"
            aria-label="What KCOVA helps you automate"
          >
            {benefits.map((label, index) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm font-medium text-white/80"
              >
                {index > 0 ? (
                  <span className="text-kova-orange" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-md bg-kova-orange px-7 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-dark"
            >
              Start your free trial
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-md border border-white/40 bg-transparent px-7 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-dark"
            >
              See how it works
            </a>
          </div>

          <p className="mt-5 text-sm text-white/55">
            7-day free trial · Cancel anytime
          </p>
        </div>

        <div className="hidden md:block">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
