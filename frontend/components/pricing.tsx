const features = [
  "Social media planning",
  "Content creation",
  "Publishing",
  "Customer engagement",
  "Lead management",
  "Commerce tools",
  "Analytics",
];

export default function Pricing() {
  return (
    <section
      id="pricing"
      className="border-t border-kova-border bg-kova-background"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-green">
            Pricing
          </p>

          <h2 className="mt-5 text-4xl font-bold tracking-tight text-kova-dark sm:text-5xl">
            Start small. Grow with Kova.
          </h2>

          <p className="mt-6 text-lg leading-8 text-kova-dark/60">
            One simple plan for small businesses that want a better way to
            manage social media and turn attention into customers.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl">
          <div className="overflow-hidden rounded-2xl border border-kova-border bg-kova-white">
            <div className="border-b border-kova-border p-8 sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-kova-green">
                Kova
              </p>

              <div className="mt-6 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tight text-kova-dark">
                  KSh 1,300
                </span>

                <span className="mb-1 text-sm text-kova-dark/45">
                  / month
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-kova-dark/55">
                Everything you need to manage your social presence and connect
                it to your business.
              </p>

              <a
                href="/signup"
                className="mt-8 flex h-12 items-center justify-center rounded-lg bg-kova-green text-sm font-semibold text-white transition-colors hover:bg-[#0f4f3a]"
              >
                Start 7-day free trial
              </a>
            </div>

            <div className="p-8 sm:p-10">
              <p className="text-sm font-semibold text-kova-dark">
                What's included
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-kova-green text-[10px] font-bold text-white">
                      ✓
                    </span>

                    <span className="text-sm text-kova-dark/65">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-kova-dark/40">
            No long-term commitment. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}