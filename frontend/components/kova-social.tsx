const capabilities = [
  {
    number: "01",
    title: "Plan",
    description:
      "Build a content strategy around your business, audience, products, and goals.",
  },
  {
    number: "02",
    title: "Create",
    description:
      "Create posts, captions, campaigns, and offers without starting from a blank page.",
  },
  {
    number: "03",
    title: "Publish",
    description:
      "Organize and publish content across your connected social channels.",
  },
  {
    number: "04",
    title: "Engage",
    description:
      "Bring comments, messages, and customer conversations into one workspace.",
  },
  {
    number: "05",
    title: "Analyze",
    description:
      "Understand what your audience responds to and where your business is gaining traction.",
  },
  {
    number: "06",
    title: "Automate",
    description:
      "Let Kova handle repeatable social-media work while keeping you in control.",
  },
];

export default function KovaSocial() {
  return (
    <section
      id="social"
      className="border-t border-kova-border bg-kova-background"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        {/* Heading */}
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-end lg:gap-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-green">
              Kova Social
            </p>

            <h2 className="mt-5 text-4xl font-bold tracking-tight text-kova-dark sm:text-5xl">
              Your social media manager,
              <span className="block text-kova-green">
                built into your business.
              </span>
            </h2>
          </div>

          <div>
            <p className="max-w-2xl text-lg leading-8 text-kova-dark/65">
              Kova helps you manage the work behind your social presence —
              from planning and content creation to publishing, customer
              engagement, analytics, and automation.
            </p>

            <a
              href="/signup"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-kova-green px-7 text-sm font-semibold text-white transition-colors hover:bg-[#0f4f3a]"
            >
              Start for free
            </a>
          </div>
        </div>

        {/* Capabilities */}
        <div className="mt-20">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-kova-border bg-kova-border sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((item) => (
              <div
                key={item.number}
                className="bg-kova-white p-7 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-kova-orange">
                    {item.number}
                  </span>

                  <span className="h-2 w-2 rounded-full bg-kova-green" />
                </div>

                <h3 className="mt-10 text-xl font-semibold text-kova-dark">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-kova-dark/60">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Temporary visual */}
        <div
          id="product"
          className="mt-20 overflow-hidden rounded-2xl border border-kova-border bg-kova-white"
        >
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            {/* Text */}
            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-kova-green">
                One workspace
              </p>

              <h3 className="mt-4 text-3xl font-bold tracking-tight text-kova-dark sm:text-4xl">
                Everything behind your social presence, in one place.
              </h3>

              <p className="mt-5 text-base leading-7 text-kova-dark/60">
                Instead of moving between content tools, social platforms,
                spreadsheets, and customer conversations, Kova brings the
                workflow together.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Content planning and creation",
                  "Publishing across connected channels",
                  "Customer conversations",
                  "Leads and opportunities",
                  "Performance and analytics",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-kova-green text-[10px] font-bold text-white">
                      ✓
                    </span>

                    <span className="text-sm font-medium text-kova-dark">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Temporary image area */}
            <div className="min-h-[420px] bg-kova-background p-6 sm:p-8 lg:min-h-full">
              <div className="flex h-full min-h-[380px] items-center justify-center rounded-xl border border-kova-border bg-white">
                <div className="text-center">
                  <div className="mx-auto h-12 w-12 rounded-lg bg-kova-green" />

                  <p className="mt-5 text-sm font-semibold text-kova-dark">
                    Kova Social workspace
                  </p>

                  <p className="mt-2 max-w-xs text-xs leading-5 text-kova-dark/40">
                    Temporary visual — this will be replaced with the actual
                    Kova interface.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workflow */}
        <div className="mt-20">
          <div className="border-y border-kova-border">
            <div className="grid divide-y divide-kova-border sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-6">
              {capabilities.map((item) => (
                <div key={item.number} className="p-5 sm:p-6">
                  <span className="text-xs font-semibold text-kova-orange">
                    {item.number}
                  </span>

                  <p className="mt-3 text-sm font-semibold text-kova-dark">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom statement */}
        <div className="mt-16">
          <p className="max-w-3xl text-xl leading-8 text-kova-dark/65">
            Kova takes the repetitive work out of managing your social
            presence, so you can spend more time running the business.
          </p>
        </div>
      </div>
    </section>
  );
}