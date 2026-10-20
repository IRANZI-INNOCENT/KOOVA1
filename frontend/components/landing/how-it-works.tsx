import Image from "next/image";

import { SectionHeader } from "@/components/landing/section-header";

const steps = [
  {
    number: "1",
    heading: "Tell KCOVA about your business.",
    description:
      "Add your details, products, prices, and preferences so content and replies fit your shop.",
  },
  {
    number: "2",
    heading: "Connect your pages and add products.",
    description:
      "Connect Facebook or Instagram, add products from photos, and review listings before you use them.",
  },
  {
    number: "3",
    heading: "Keep conversations moving towards a sale.",
    description:
      "Prepare replies, track interested customers, and share product pages that lead buyers to WhatsApp.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 overflow-hidden bg-kova-background"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.9fr] lg:items-end lg:gap-14">
          <SectionHeader
            eyebrow="How it works"
            title="Get set up once. Make the daily work easier."
            lead="Tell KCOVA about your business, add products, and connect your accounts. Then prepare content, answer questions, and help people find what you sell."
          />
          <div className="relative hidden aspect-[5/4] overflow-hidden lg:block">
            <Image
              src="/landing/auth.jpg"
              alt="Business owner reviewing work in their shop"
              fill
              className="object-cover"
              sizes="420px"
            />
          </div>
        </div>

        <ol className="mt-14 grid gap-8 border-t border-kova-border pt-10 lg:grid-cols-3 lg:gap-10">
          {steps.map((step) => (
            <li key={step.number}>
              <span className="text-sm font-medium text-gray-500">
                Step {step.number}
              </span>
              <h3 className="mt-2 text-lg font-semibold text-kova-dark">
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
