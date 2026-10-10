import Image from "next/image";

import { HeroConnection } from "@/components/landing/hero-connection";

export default function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md space-y-4 lg:max-w-none lg:justify-self-end">
      <HeroConnection />

      <div className="relative overflow-hidden rounded-lg border border-white/25 shadow-xl">
        <div className="relative aspect-[5/4] w-full sm:aspect-[16/11]">
          <Image
            src="/landing/snap.jpg"
            alt="Business owner photographing products for their store"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 90vw, 440px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-kova-dark/60 via-kova-dark/10 to-transparent" />
          <p className="absolute bottom-3 left-3 right-3 text-sm font-medium leading-snug text-white">
            Snap a product in the shop. Kova lists it and shares it on social.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-white/25 bg-white/95 p-4 shadow-lg backdrop-blur-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-kova-green">
          Talk to Kova
        </p>
        <p className="mt-3 text-right text-xs leading-5 text-kova-green">
          Draft tonight&apos;s post for the sofa.
        </p>
        <p className="mt-2 text-xs leading-5 text-kova-dark/80">
          Caption is ready. I tied it to the live product page and kept your price at KES 23,000.
        </p>
      </div>
    </div>
  );
}
