import { SectionHeader } from "@/components/landing/section-header";

const benefits = [
  {
    label: "01 — SOCIAL MEDIA",
    heading: "Keep your pages moving.",
    description:
      "Prepare posts, plan what to publish, and keep up with comments and messages without constantly jumping between apps.",
  },
  {
    label: "02 — YOUR PRODUCTS",
    heading: "List it once. Use it everywhere.",
    description:
      "Add your products to your catalog and give customers a page to browse. KCOVA can use your product details and prices when preparing posts and replies.",
  },
  {
    label: "03 — CUSTOMER ENQUIRIES",
    heading: "Don't lose track of interested customers.",
    description:
      "Keep up with buying questions, save potential customers as leads, and make it easier to follow up when someone is interested in a product.",
  },
  {
    label: "04 — AUTOPILOT",
    heading: "Let KCOVA handle the repeat work.",
    description:
      "Set your rules and choose how much KCOVA can do on its own. Depending on your settings, it can help with content, replies, product listings, and daily updates.",
  },
];

export default function WhyKcovaSection() {
  return (
    <section id="why-kcova" className="border-t border-kova-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeader
          eyebrow="WHY KCOVA"
          title="Less time switching between apps. More time running your business."
          lead="Your customers are on social media. Your products are in your catalog. Your orders come through chats. KCOVA brings these everyday tasks together, so you spend less time keeping track of everything."
        />

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <article
              key={benefit.label}
              className="border-t border-kova-border pt-6"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-kova-green">
                {benefit.label}
              </p>
              <h3 className="font-display mt-3 text-xl font-semibold tracking-tight text-kova-dark sm:text-2xl">
                {benefit.heading}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-7 text-kova-dark/68">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
