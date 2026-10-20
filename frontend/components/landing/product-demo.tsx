import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

export default function ProductDemoSection() {
  return (
    <section className="border-t border-kova-border bg-kova-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeader
          eyebrow="Product to post"
          title="Got a product to sell? Start with a photo."
          lead="Take a photo. KCOVA helps you build a listing and prepare it for your store and social media."
        />

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="relative min-h-[280px] overflow-hidden sm:min-h-[360px] lg:min-h-[420px]">
            <Image
              src="/landing/sofa.jpg"
              alt="Sofa product photograph ready to list and share"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 560px"
            />
          </div>

          <div className="flex flex-col justify-center border border-kova-border bg-white p-6 sm:p-8">
            <p className="text-sm font-medium text-gray-500">Talk to Kova</p>

            <div className="mt-6 space-y-4">
              <div className="ml-auto max-w-[90%] bg-kova-green px-4 py-3 text-sm leading-6 text-white">
                Help me post this sofa tonight.
              </div>

              <div className="max-w-[95%] border border-kova-border bg-kova-background px-4 py-4">
                <p className="text-sm font-semibold text-kova-dark">
                  Your caption is ready.
                </p>
                <p className="mt-2 text-sm leading-6 text-kova-dark/70">
                  I&apos;ve used the sofa&apos;s product details and kept the
                  price at KES 23,000.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
