import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const path = [
  "Photo and price in Snap to Sell",
  "Listing written from what Kova sees",
  "Store and product page go live",
  "Customer continues on WhatsApp",
];

export default function KovaCommerce() {
  return (
    <section id="commerce" className="border-t border-kova-border bg-kova-background">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div className="order-2 lg:order-1">
          <div
            id="product"
            className="overflow-hidden rounded-lg border border-kova-border bg-white shadow-[0_24px_56px_-32px_rgba(23,33,29,0.35)]"
          >
            <div className="relative aspect-[4/3] w-full">
              <Image
                src="/landing/watch.jpg"
                alt="Product photo used to create a store listing"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 540px"
              />
            </div>
            <div className="border-t border-kova-border p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-kova-orange">
                  Snap to Sell
                </p>
                <span className="rounded-full bg-kova-green/10 px-2 py-0.5 text-[10px] font-bold text-kova-green">
                  Ready
                </span>
              </div>
              <p className="mt-3 text-base font-semibold text-kova-dark">Two-tone analog watch</p>
              <p className="mt-1 text-sm font-bold text-kova-dark">KES 2,300</p>
              <p className="mt-3 text-xs leading-5 text-kova-dark/55">
                Name, description, and selling points from your photo. You confirm before it
                represents you in posts and replies.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-kova-background px-2 py-2.5">
                  <p className="text-[10px] text-kova-dark/45">Post</p>
                  <p className="mt-0.5 text-xs font-semibold text-kova-dark">Linked</p>
                </div>
                <div className="rounded-md bg-kova-background px-2 py-2.5">
                  <p className="text-[10px] text-kova-dark/45">Store</p>
                  <p className="mt-0.5 text-xs font-semibold text-kova-dark">Live</p>
                </div>
                <div className="rounded-md bg-kova-orange/30 px-2 py-2.5">
                  <p className="text-[10px] text-kova-dark/45">Order</p>
                  <p className="mt-0.5 text-xs font-bold text-kova-dark">WhatsApp</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <SectionHeader
            eyebrow="Commerce"
            title="Turn attention into a page people can buy from."
            lead="A comment or DM becomes a lead. A lead gets a product link. The order finishes on WhatsApp with you."
          />
          <ol className="mt-8 space-y-4">
            {path.map((item, index) => (
              <li
                key={item}
                className="flex gap-4 rounded-lg border border-kova-border bg-white px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-kova-orange text-xs font-bold text-kova-dark">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm font-medium leading-6 text-kova-dark">{item}</p>
              </li>
            ))}
          </ol>
          <a
            href="/signup"
            className="mt-9 inline-flex h-11 items-center rounded-md bg-kova-green px-6 text-sm font-semibold text-white transition-colors hover:bg-[#12583f]"
          >
            List your first product
          </a>
        </div>
      </div>
    </section>
  );
}
