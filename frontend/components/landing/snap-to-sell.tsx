import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const steps = [
  {
    title: "Snap your products.",
    description: "Take photos and provide the prices and other details.",
  },
  {
    title: "Build your catalog.",
    description:
      "KCOVA helps prepare individual product listings that you can review.",
  },
  {
    title: "Bring everything together.",
    description:
      "Your products appear on one commerce page customers can browse.",
  },
  {
    title: "Share and sell.",
    description:
      "Share your page or individual products on social media, and let customers continue their orders with you on WhatsApp.",
  },
];

const catalogItems = [
  {
    image: "/landing/sofa.jpg",
    name: "Living room sofa",
    price: "KES 23,000",
  },
  {
    image: "/landing/watch.jpg",
    name: "Analog watch",
    price: "KES 2,300",
  },
  {
    image: "/landing/snap.jpg",
    name: "More products",
    price: "On your page",
  },
];

export default function SnapToSellSection() {
  return (
    <section id="commerce" className="scroll-mt-24 border-t border-kova-border bg-kova-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeader
          eyebrow="SNAP TO SELL · YOUR ONLINE STORE"
          title="Turn your products into a store customers can browse."
          lead="Take photos of your products, add your prices, and let KCOVA help prepare the listings. Snap to Sell brings your products together on one commerce page, giving customers one place to discover what you sell and choose what they want to buy."
        />

        <div className="mt-12 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start lg:gap-14">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-kova-dark">
              From individual products to your own commerce page.
            </h3>
            <ol className="mt-8 space-y-5">
              {steps.map((step, index) => (
                <li key={step.title} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-kova-green text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-kova-dark">
                      {step.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-kova-dark/65">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <a
              href="/signup"
              className="mt-9 inline-flex h-11 items-center rounded-md bg-kova-green px-6 text-sm font-semibold text-white transition-colors hover:bg-[#12583f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kova-green focus-visible:ring-offset-2"
            >
              Create your commerce page
            </a>
          </div>

          <div className="overflow-hidden rounded-lg border border-kova-border bg-white shadow-[0_24px_56px_-36px_rgba(23,33,29,0.4)]">
            <div className="border-b border-kova-border px-5 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-kova-orange">
                Commerce page
              </p>
              <p className="mt-1 text-base font-semibold text-kova-dark">
                Your products, all in one place.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px bg-kova-border sm:grid-cols-3">
              {catalogItems.map((item) => (
                <article key={item.name} className="bg-white">
                  <div className="relative aspect-[4/3]">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 200px"
                    />
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-semibold text-kova-dark">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs font-medium text-kova-dark/60">
                      {item.price}
                    </p>
                    <p className="mt-3 text-[11px] font-semibold text-kova-green">
                      Continue on WhatsApp
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-8 border-t border-kova-border pt-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <h3 className="font-display text-2xl font-semibold tracking-tight text-kova-dark">
              Your products, all in one place.
            </h3>
            <p className="mt-4 max-w-lg text-base leading-7 text-kova-dark/68">
              Add products individually, bring them together on one commerce
              page, and use the same product information when preparing social
              posts and customer replies.
            </p>
          </div>
          <div className="grid grid-cols-[0.9fr_1.1fr] gap-3 sm:gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
              <Image
                src="/landing/watch.jpg"
                alt="Individual product photo for a listing"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 40vw, 220px"
              />
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-kova-border bg-white p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-kova-orange">
                  Product listing
                </p>
                <p className="mt-3 text-base font-semibold text-kova-dark">
                  Two-tone analog watch
                </p>
                <p className="mt-1 text-sm font-bold text-kova-dark">
                  KES 2,300
                </p>
                <p className="mt-3 text-xs leading-5 text-kova-dark/55">
                  Review the details before they appear on your commerce page
                  and in social posts.
                </p>
              </div>
              <div className="mt-6 border-t border-kova-border pt-4">
                <p className="text-xs font-medium text-kova-dark/55">
                  Customer next step
                </p>
                <p className="mt-1 text-sm font-semibold text-kova-green">
                  Order continues on WhatsApp
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
