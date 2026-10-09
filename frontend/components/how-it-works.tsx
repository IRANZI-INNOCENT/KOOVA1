const steps = [
  {
    number: "1",
    title: "Snap the product",
    description: "Take a photo and enter the price. That is the only setup.",
  },
  {
    number: "2",
    title: "Kova publishes the store",
    description: "The listing, the catalog, and the product page go live together.",
  },
  {
    number: "3",
    title: "Customers order",
    description: "They open the page and continue the order on WhatsApp.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
      <div className="max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
          How it works
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-kova-dark sm:text-4xl">
          Three steps from a photo to an order.
        </h2>
      </div>
      <div className="mt-10 grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-lg">
          <img
            src="/landing/snap.jpg"
            alt="A shop owner photographing clothes and a bag to list them on Kova"
            className="aspect-[4/3] w-full object-cover"
          />
          <span className="absolute bottom-3 left-3 rounded-md bg-white/95 px-2.5 py-1 text-xs font-bold text-kova-dark">
            One photo. One price.
          </span>
        </div>
      <ol className="grid gap-4">
        {steps.map((step) => (
          <li key={step.number} className="rounded-lg border border-kova-border bg-white p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-kova-green text-sm font-semibold text-white">
              {step.number}
            </span>
            <h3 className="mt-4 text-lg font-semibold text-kova-dark">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-kova-dark/65">{step.description}</p>
          </li>
        ))}
      </ol>
      </div>
    </section>
  );
}
