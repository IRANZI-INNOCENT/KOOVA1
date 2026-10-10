import { SectionHeader } from "@/components/landing/section-header";

const features = [
  "Snap to Sell and product pages",
  "Public store for your catalog",
  "WhatsApp order buttons",
  "Facebook and Instagram workspace",
  "Talk to Kova and Autopilot",
  "Inbox, leads, analytics, morning brief",
];

export default function Pricing() {
  return (
    <section id="pricing" className="border-t border-kova-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-16">
          <SectionHeader
            eyebrow="Pricing"
            title="One plan. Try it on real work first."
            lead="Use the full workspace for seven days on your products and channels. If Kova is not earning its place in your week, cancel before you pay."
          />

          <div className="rounded-lg border-2 border-kova-green/20 bg-kova-background p-7 shadow-sm lg:sticky lg:top-24">
            <p className="text-sm font-semibold text-kova-green">Kova</p>
            <p className="mt-4 flex items-end gap-2">
              <span className="font-display text-4xl font-semibold tracking-tight text-kova-dark">
                KSh 1,300
              </span>
              <span className="mb-1.5 text-sm text-kova-dark/50">/ month</span>
            </p>
            <p className="mt-2 text-sm text-kova-dark/55">After a 7-day free trial</p>
            <a
              href="/signup"
              className="mt-7 flex h-12 items-center justify-center rounded-md bg-kova-green text-sm font-semibold text-white transition-colors hover:bg-[#12583f]"
            >
              Start free trial
            </a>
            <ul className="mt-7 space-y-2.5 border-t border-kova-border pt-6">
              {features.map((feature) => (
                <li key={feature} className="flex gap-2.5 text-sm text-kova-dark/72">
                  <span className="text-kova-green" aria-hidden>
                    ✓
                  </span>
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
