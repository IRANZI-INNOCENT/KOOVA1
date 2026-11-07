import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const outcomes = [
  {
    label: "Your store",
    detail: "The photo, name, and price sit on a page a customer can open.",
  },
  {
    label: "A post",
    detail: "The same listing becomes a caption for Facebook or Instagram.",
  },
  {
    label: "WhatsApp",
    detail: "When someone is ready, the order continues in a chat with you.",
  },
];

export default function ProductDemoSection() {
  return (
    <section className="border-t border-kova-border bg-kova-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeader
          eyebrow="Snap to sell"
          title="Snap a photo. KCOVA writes the listing."
          lead="Snap to sell means the photo becomes the product. You take the picture. KCOVA writes the name, the price, and a short description. You check it, then it goes on your store and into a post."
        />

        <ol className="mt-12 grid gap-4 lg:grid-cols-3 lg:gap-5">
          <li className="flex flex-col overflow-hidden border border-kova-border bg-white">
            <div className="border-b border-kova-border px-5 py-4">
              <p className="text-sm font-medium text-gray-500">1 · You snap</p>
              <p className="mt-1 text-base font-semibold text-kova-dark">
                Photograph what you sell.
              </p>
            </div>
            <div className="relative h-64 w-full shrink-0 overflow-hidden sm:h-72">
              <Image
                src="/landing/snap-the-product.jpg"
                alt="Shop owner photographing folded cloth and a bag with a phone"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 360px"
              />
            </div>
            <p className="px-5 py-4 text-sm leading-6 text-kova-dark/65">
              In the shop, or from a photo already on your phone.
            </p>
          </li>

          <li className="flex flex-col border border-kova-border bg-white">
            <div className="border-b border-kova-border px-5 py-4">
              <p className="text-sm font-medium text-gray-500">2 · KCOVA writes</p>
              <p className="mt-1 text-base font-semibold text-kova-dark">
                The listing is filled in.
              </p>
            </div>
            <div className="flex flex-1 flex-col justify-between p-5">
              <div className="border border-kova-border bg-kova-background p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Listing
                </p>
                <p className="mt-3 text-lg font-semibold text-kova-dark">
                  Green patterned cloth
                </p>
                <p className="mt-1 text-sm font-bold text-kova-dark">KES 1,800</p>
                <p className="mt-3 text-sm leading-6 text-kova-dark/70">
                  Folded cotton, photographed in the shop this morning. Ready
                  to sew or wear.
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-kova-dark/65">
                Written from the photo and the price you gave. You can change
                any line before it goes out.
              </p>
            </div>
          </li>

          <li className="flex flex-col border border-kova-border bg-white">
            <div className="border-b border-kova-border px-5 py-4">
              <p className="text-sm font-medium text-gray-500">3 · You sell</p>
              <p className="mt-1 text-base font-semibold text-kova-dark">
                The same listing goes to work.
              </p>
            </div>
            <ul className="flex flex-1 flex-col justify-center divide-y divide-kova-border">
              {outcomes.map((item) => (
                <li key={item.label} className="px-5 py-4">
                  <p className="text-sm font-semibold text-kova-green">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-kova-dark/65">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        </ol>
      </div>
    </section>
  );
}
