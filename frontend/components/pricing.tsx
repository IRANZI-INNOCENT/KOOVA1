const features = [
  "Snap to Sell",
  "Public store and product pages",
  "WhatsApp orders",
  "Talk to Kova",
  "Content and leads",
  "Inbox and analytics",
];

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-kova-border bg-kova-background">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-kova-dark sm:text-4xl">
              One plan. Start with a free week.
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-kova-dark/70">
              Use Kova on a real product before you pay. If it is not earning its place, cancel.
            </p>
          </div>

          <div className="rounded-lg border border-kova-border bg-white p-6 sm:p-8">
            <p className="text-sm font-semibold text-kova-green">Kova</p>
            <p className="mt-3 flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight text-kova-dark">KSh 1,300</span>
              <span className="mb-1 text-sm text-kova-dark/50">/ month</span>
            </p>
            <p className="mt-2 text-sm text-kova-dark/55">After a 7-day free trial.</p>
            <a
              href="/signup"
              className="mt-6 flex h-11 items-center justify-center rounded-md bg-kova-green text-sm font-semibold text-white transition-colors hover:bg-[#12583f]"
            >
              Start 7-day free trial
            </a>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="text-sm text-kova-dark/70">
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
