import { SectionHeader } from "@/components/landing/section-header";

const benefits = [
  {
    label: "Social media",
    heading: "Keep your pages moving.",
    description:
      "Prepare posts, plan what to publish, and keep up with comments and messages without constantly jumping between apps.",
  },
  {
    label: "Your products",
    heading: "List it once. Use it everywhere.",
    description:
      "Add products to your catalog and give customers a page to browse. KCOVA uses those details when preparing posts and replies.",
  },
  {
    label: "Customer enquiries",
    heading: "Don't lose track of interested customers.",
    description:
      "Keep up with buying questions, save leads, and follow up when someone is interested in a product.",
  },
  {
    label: "Autopilot",
    heading: "Let KCOVA handle the repeat work.",
    description:
      "Set your rules and choose how much KCOVA can do on its own — content, replies, listings, and daily updates.",
  },
];

export default function WhyKcovaSection() {
  return (
    <section id="why-kcova" className="border-t border-kova-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeader
          eyebrow="Why KCOVA"
          title="Less time switching apps. More time running your business."
          lead="Customers on social. Products in your catalog. Orders in chat. KCOVA brings the everyday work together."
        />

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <article
              key={benefit.label}
              className="border-t border-kova-border pt-6"
            >
              <p className="text-sm font-medium text-gray-500">
                {benefit.label}
              </p>
              <h3 className="font-display mt-2 text-xl font-semibold tracking-tight text-kova-dark sm:text-2xl">
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
