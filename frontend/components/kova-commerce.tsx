const journey = [
  {
    number: "01",
    title: "Snap product",
    description:
      "Capture your product with a simple photo and give Kova the starting point.",
  },
  {
    number: "02",
    title: "Kova understands it",
    description:
      "Kova uses the product details and your business context to understand what you are selling.",
  },
  {
    number: "03",
    title: "Create listing",
    description:
      "Turn the product into a structured listing with the information customers need.",
  },
  {
    number: "04",
    title: "Create & publish",
    description:
      "Generate social content from the product and publish it to your connected channels.",
  },
  {
    number: "05",
    title: "Customer inquiry",
    description:
      "Bring customer questions and buying conversations into your Kova workspace.",
  },
  {
    number: "06",
    title: "Sale",
    description:
      "Move from customer interest to orders and build relationships that can lead to repeat business.",
  },
];

export default function KovaCommerce() {
  return (
    <section
      id="commerce"
      className="border-t border-kova-border bg-kova-green"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        {/* Heading */}
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-orange">
            Kova Commerce
          </p>

          <h2 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Turn products into
            <span className="block text-kova-orange">
              opportunities to sell.
            </span>
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/75">
            Kova connects your products to your social presence, customer
            conversations, and sales. Start with a product and take it all the
            way to a customer.
          </p>
        </div>

        {/* Snap to Sell */}
        <div className="mt-16 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Snap to Sell */}
          <div className="rounded-2xl bg-kova-orange p-8 sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-kova-green text-sm font-bold tracking-tight text-white">
              STS
            </div>

            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.15em] text-kova-dark/60">
              Snap to Sell
            </p>

            <h3 className="mt-3 text-3xl font-bold tracking-tight text-kova-dark">
              Your product is the starting point.
            </h3>

            <p className="mt-5 text-sm leading-6 text-kova-dark/65">
              Start with a product photo. Kova turns that starting point into
              the information, content, and customer journey your business
              needs to sell.
            </p>

            <div className="mt-10 rounded-xl border border-kova-dark/10 bg-white/50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-kova-dark/50">
                Starting point
              </p>

              <div className="mt-4 aspect-[4/3] rounded-lg border border-kova-dark/10 bg-white/60">
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-kova-dark/30">
                    Product image
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm font-semibold text-kova-dark">
                One product. Multiple business actions.
              </p>
            </div>
          </div>

          {/* Commerce Page */}
          <div className="rounded-2xl bg-kova-white p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-kova-border pb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-kova-dark/40">
                  Commerce
                </p>

                <p className="mt-1 text-lg font-semibold text-kova-dark">
                  Commerce Page
                </p>
              </div>

              <span className="rounded-lg bg-kova-green px-3 py-2 text-xs font-semibold text-white">
                Ready
              </span>
            </div>

            <div className="mt-7 grid gap-6 sm:grid-cols-[180px_1fr]">
              {/* Temporary product image */}
              <div className="aspect-square overflow-hidden rounded-xl bg-kova-background">
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs font-medium uppercase tracking-wide text-kova-dark/30">
                    Product image
                  </p>
                </div>
              </div>

              {/* Product information */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-kova-dark/40">
                  Product listing
                </p>

                <h3 className="mt-2 text-2xl font-bold text-kova-dark">
                  Your product
                </h3>

                <p className="mt-2 text-lg font-semibold text-kova-green">
                  KSh 2,500
                </p>

                <p className="mt-4 text-sm leading-6 text-kova-dark/55">
                  Product information, pricing, details, and customer-facing
                  content prepared for your business.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="rounded-lg bg-kova-green px-4 py-2 text-xs font-semibold text-white">
                    Order
                  </span>

                  <span className="rounded-lg border border-kova-border px-4 py-2 text-xs font-semibold text-kova-dark">
                    Ask a question
                  </span>
                </div>
              </div>
            </div>

            {/* Commerce connection */}
            <div className="mt-8 border-t border-kova-border pt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-kova-dark/40">
                Connected to your social presence
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-kova-border p-4">
                  <p className="text-xs font-semibold text-kova-dark">
                    Product
                  </p>
                  <p className="mt-1 text-xs text-kova-dark/50">
                    Structured listing
                  </p>
                </div>

                <div className="rounded-lg border border-kova-border p-4">
                  <p className="text-xs font-semibold text-kova-dark">
                    Content
                  </p>
                  <p className="mt-1 text-xs text-kova-dark/50">
                    Ready to publish
                  </p>
                </div>

                <div className="rounded-lg border border-kova-border p-4">
                  <p className="text-xs font-semibold text-kova-dark">
                    Customers
                  </p>
                  <p className="mt-1 text-xs text-kova-dark/50">
                    Ready to engage
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Journey */}
        <div className="mt-16">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-kova-orange">
              From product to sale
            </p>

            <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              One connected commerce journey.
            </h3>
          </div>

          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/15 bg-white/15 sm:grid-cols-2 lg:grid-cols-3">
            {journey.map((step) => (
              <div key={step.number} className="bg-kova-green p-7">
                <span className="text-sm font-semibold text-kova-orange">
                  {step.number}
                </span>

                <h3 className="mt-5 text-lg font-semibold text-white">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-white/60">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom statement */}
        <div className="mt-16 border-t border-white/15 pt-8">
          <p className="max-w-3xl text-lg leading-8 text-white/75">
            Kova Commerce connects the product to the content, the customer
            conversation, and the sale — while Kova Social keeps your business
            visible and engaged.
          </p>
        </div>
      </div>
    </section>
  );
}