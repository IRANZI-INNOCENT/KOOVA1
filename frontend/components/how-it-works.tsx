const steps = [
  {
    number: "01",
    title: "Strategy",
    description:
      "Kova understands your business, your audience, your products, and what you want to achieve.",
  },
  {
    number: "02",
    title: "Create",
    description:
      "Turn your ideas, products, and offers into useful social content for your audience.",
  },
  {
    number: "03",
    title: "Publish",
    description:
      "Plan and publish content across your connected social channels without jumping between platforms.",
  },
  {
    number: "04",
    title: "Engage",
    description:
      "Keep track of comments, messages, questions, and conversations with potential customers.",
  },
  {
    number: "05",
    title: "Sell",
    description:
      "Turn conversations into leads, products, orders, and customers.",
  },
  {
    number: "06",
    title: "Analyze",
    description:
      "Understand what is working and use those insights to make better decisions.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="border-t border-kova-border bg-kova-background"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-green">
            How Kova works
          </p>

          <h2 className="mt-5 text-4xl font-bold tracking-tight text-kova-dark sm:text-5xl">
            One system for the work behind your social presence.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-kova-dark/65">
            Kova connects the activities that usually live across different
            tools and turns them into one continuous workflow.
          </p>
        </div>

        <div className="mt-16 grid gap-x-12 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="border-t border-kova-border pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-kova-orange">
                  {step.number}
                </span>

                <span className="h-2 w-2 rounded-full bg-kova-green" />
              </div>

              <h3 className="mt-6 text-xl font-semibold text-kova-dark">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-kova-dark/60">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}