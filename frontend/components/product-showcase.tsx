import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const areas = [
  {
    title: "Morning brief",
    description: "Start the day with what sold, what posted, and what is waiting in the inbox.",
  },
  {
    title: "Leads and orders",
    description: "See who asked, what they wanted, and what you recorded when they ordered.",
  },
];

export default function ProductShowcase() {
  return (
    <section className="bg-kova-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="relative min-h-[320px] overflow-hidden rounded-lg lg:min-h-[420px]">
            <Image
              src="/landing/sofa.jpg"
              alt="Product listed on the store and ready to share on social"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 560px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-kova-dark/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-kova-orange">
                Snap to Sell
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                One catalog for posts, replies, and the public store.
              </p>
            </div>
          </div>

          <div>
            <SectionHeader
              eyebrow="One workspace"
              title="Everything after you post lives in one place."
              lead="Store, social, inbox, leads, and orders share the same business brain — so Kova never forgets what you sell or what you promised a customer."
            />
            <div className="mt-8 space-y-4">
              {areas.map((area) => (
                <article
                  key={area.title}
                  className="rounded-lg border border-kova-border bg-white p-5"
                >
                  <h3 className="text-base font-semibold text-kova-dark">{area.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-kova-dark/65">{area.description}</p>
                </article>
              ))}
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-3 text-sm text-kova-dark/75">
              <li className="rounded-md bg-white px-3 py-2 ring-1 ring-kova-border">Content calendar</li>
              <li className="rounded-md bg-white px-3 py-2 ring-1 ring-kova-border">Performance</li>
              <li className="rounded-md bg-white px-3 py-2 ring-1 ring-kova-border">Analytics</li>
              <li className="rounded-md bg-white px-3 py-2 ring-1 ring-kova-border">Storefront</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
