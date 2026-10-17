import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const steps = [
  {
    number: "01",
    heading: "Tell KCOVA about your business.",
    description:
      "Add your business details, products, prices, and preferences. KCOVA uses this information to help prepare content and customer replies that fit your business.",
  },
  {
    number: "02",
    heading: "Connect your pages and add products.",
    description:
      "Connect Facebook or Instagram where supported, then add products to your catalog. You can create a listing from a product photo and review the details before using them.",
  },
  {
    number: "03",
    heading: "Keep conversations moving towards a sale.",
    description:
      "Prepare replies, keep track of interested customers, and share product pages that lead buyers to WhatsApp to continue their order with you.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 overflow-hidden bg-kova-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-end lg:gap-14">
          <SectionHeader
            eyebrow="HOW IT WORKS"
            title="Get set up once. Make the daily work easier."
            lead="Tell KCOVA about your business, add your products, and connect your social accounts. From there, you can use it to prepare content, keep up with customer questions, and help people find what you sell."
          />
          <div className="relative hidden aspect-[5/4] overflow-hidden rounded-lg lg:block">
            <Image
              src="/landing/auth.jpg"
              alt="Business owner reviewing work in their shop"
              fill
              className="object-cover"
              sizes="420px"
            />
          </div>
        </div>

        <ol className="mt-14 grid gap-6 lg:grid-cols-3 lg:gap-0">
          {steps.map((step, index) => (
            <li
              key={step.number}
              className={`relative rounded-lg border border-kova-border bg-white p-6 sm:p-7 lg:rounded-none lg:border-y lg:border-l-0 lg:border-r lg:bg-transparent lg:p-8 lg:first:border-l lg:first:rounded-l-lg lg:last:rounded-r-lg ${
                index === 1 ? "lg:bg-white" : ""
              }`}
            >
              <span className="font-display text-3xl font-semibold text-kova-green/30">
                {step.number}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-kova-dark">
                {step.heading}
              </h3>
              <p className="mt-3 text-sm leading-7 text-kova-dark/65">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
