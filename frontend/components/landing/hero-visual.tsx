import Image from "next/image";

import {
  FacebookIcon,
  HERO_SOCIAL_ICONS,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/landing/social-icons";

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none lg:justify-self-end">
      <div className="relative overflow-hidden rounded-xl border border-white/15 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.65)]">
        <div className="relative aspect-[4/5] w-full">
          <Image
            src="/landing/snap.jpg"
            alt="Business owner managing products and social posts on her phone in her shop"
            fill
            className="object-cover object-[50%_18%]"
            sizes="(max-width: 1024px) 50vw, 420px"
            priority
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-kova-dark/70 via-transparent to-transparent"
            aria-hidden
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="rounded-lg border border-white/15 bg-kova-dark/75 p-3.5 backdrop-blur-sm">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                <WhatsAppIcon className="h-3.5 w-3.5" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-kova-orange">
                WhatsApp
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="rounded-md rounded-tl-sm bg-white/15 px-2.5 py-1.5 text-xs leading-snug text-white/90">
                Hi, is this bag available?
              </p>
              <p className="ml-4 rounded-md rounded-tr-sm bg-kova-green/90 px-2.5 py-1.5 text-xs leading-snug text-white">
                Yes, it&apos;s available. Here&apos;s the product page.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ul
        className="mt-4 flex flex-wrap items-center justify-center gap-2"
        aria-label="Social and messaging channels"
      >
        {HERO_SOCIAL_ICONS.map(({ name, Icon }) => (
          <li key={name}>
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md ring-1 ring-black/5"
              title={name}
            >
              {name === "Instagram" ? (
                <InstagramIcon
                  className="h-4 w-4"
                  title={name}
                  gradientId="ig-row"
                />
              ) : name === "Facebook" ? (
                <FacebookIcon className="h-4 w-4" title={name} />
              ) : (
                <Icon className="h-4 w-4" title={name} />
              )}
            </span>
            <span className="sr-only">{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
