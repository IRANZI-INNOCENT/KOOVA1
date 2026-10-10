import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const steps = [
  {
    number: "01",
    title: "Tell Kova your business",
    description:
      "Profile, products, and how you want to operate. Kova uses this on every post and reply.",
  },
  {
    number: "02",
    title: "Connect Meta and list products",
    description:
      "Link Facebook or Instagram, snap a product with a price, and publish your store page.",
  },
  {
    number: "03",
    title: "Inbox to leads to WhatsApp",
    description:
      "Kova drafts replies, saves buying interest as leads, and sends customers to your product page to order.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="overflow-hidden bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="relative aspect-[4/5] overflow-hidden rounded-lg sm:aspect-[3/4] lg:order-2">
            <Image
              src="/landing/auth.jpg"
              alt="Business owner at work in their shop"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 480px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-kova-dark/40 to-transparent" />
          </div>

          <div className="lg:order-1">
            <SectionHeader
              eyebrow="How it works"
              title="Set up once. Kova carries the daily rhythm."
              lead="You stay in control of prices, approvals, and what goes live. Kova handles the repeat work that eats your evenings."
            />
            <ol className="mt-10 space-y-5">
              {steps.map((step) => (
                <li
                  key={step.number}
                  className="flex gap-5 border-l-2 border-kova-orange/60 pl-5"
                >
                  <span className="font-display shrink-0 text-2xl font-semibold text-kova-green/35">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-kova-dark">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-kova-dark/65">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 rounded-lg bg-kova-green px-6 py-8 sm:flex-row sm:items-center lg:px-10">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-kova-orange">Snap to Sell</p>
            <p className="mt-2 text-lg font-semibold leading-snug text-white">
              Connect social, capture leads from the inbox, and close on WhatsApp from one workspace.
            </p>
          </div>
          <a
            href="/signup"
            className="inline-flex h-11 shrink-0 items-center rounded-md bg-kova-orange px-6 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e]"
          >
            Start free trial
          </a>
        </div>
      </div>
    </section>
  );
}
