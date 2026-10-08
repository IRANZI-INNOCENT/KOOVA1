const workspaceAreas = [
  {
    number: "01",
    title: "Content",
    description:
      "Plan, create, organize, and publish the content your business needs.",
  },
  {
    number: "02",
    title: "Inbox",
    description:
      "Bring customer messages and conversations into one workspace.",
  },
  {
    number: "03",
    title: "Leads",
    description:
      "Track people who show interest and turn conversations into opportunities.",
  },
  {
    number: "04",
    title: "Commerce",
    description:
      "Manage products, listings, commerce pages, and the journey to a sale.",
  },
  {
    number: "05",
    title: "Analytics",
    description:
      "Understand what is working and how your social activity is contributing to growth.",
  },
];

export default function ProductShowcase() {
  return (
    <section
      id="workspace"
      className="border-t border-kova-border bg-kova-white"
    >
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        {/* Heading */}
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-end lg:gap-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-green">
              The Kova workspace
            </p>

            <h2 className="mt-5 text-4xl font-bold tracking-tight text-kova-dark sm:text-5xl">
              One place to run
              <span className="block text-kova-green">
                your social operation.
              </span>
            </h2>
          </div>

          <p className="max-w-2xl text-lg leading-8 text-kova-dark/65">
            Kova brings the work behind your social presence into one
            workspace — from content and conversations to leads, commerce,
            and performance.
          </p>
        </div>

        {/* Workspace visual */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-kova-border bg-kova-background">
          <div className="grid min-h-[560px] lg:grid-cols-[220px_1fr]">
            {/* Sidebar */}
            <aside className="border-b border-kova-border bg-kova-white lg:border-b-0 lg:border-r">
              <div className="flex h-16 items-center border-b border-kova-border px-6">
                <span className="text-lg font-bold tracking-tight text-kova-dark">
                  KOVA
                </span>
              </div>

              <div className="p-4">
                <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-kova-dark/35">
                  Workspace
                </p>

                <nav className="mt-2 space-y-1">
                  {[
                    "Overview",
                    "Content",
                    "Inbox",
                    "Leads",
                    "Commerce",
                    "Analytics",
                  ].map((item, index) => (
                    <div
                      key={item}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                        index === 0
                          ? "bg-kova-green text-white"
                          : "text-kova-dark/60"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          index === 0
                            ? "bg-kova-orange"
                            : "bg-kova-dark/15"
                        }`}
                      />

                      {item}
                    </div>
                  ))}
                </nav>
              </div>

              <div className="mt-auto hidden border-t border-kova-border p-4 lg:block">
                <p className="px-3 text-xs text-kova-dark/40">
                  Connected channels
                </p>

                <div className="mt-3 space-y-2 px-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-kova-dark/60">
                      Instagram
                    </span>

                    <span className="text-[10px] font-medium text-kova-green">
                      Connected
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-kova-dark/60">
                      Facebook
                    </span>

                    <span className="text-[10px] font-medium text-kova-green">
                      Connected
                    </span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main workspace */}
            <div className="p-5 sm:p-8">
              {/* Header */}
              <div className="flex flex-col gap-4 border-b border-kova-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-kova-dark/40">
                    Business workspace
                  </p>

                  <h3 className="mt-1 text-xl font-semibold text-kova-dark">
                    Overview
                  </h3>
                </div>

                <button className="h-10 rounded-lg bg-kova-green px-5 text-xs font-semibold text-white">
                  Create content
                </button>
              </div>

              {/* Workspace content */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-kova-border bg-kova-white p-5">
                  <p className="text-xs text-kova-dark/45">
                    Content
                  </p>

                  <p className="mt-3 text-2xl font-bold text-kova-dark">
                    Planned
                  </p>

                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-kova-border">
                    <div className="h-full w-3/4 rounded-full bg-kova-green" />
                  </div>

                  <p className="mt-3 text-xs text-kova-dark/40">
                    Content workflow
                  </p>
                </div>

                <div className="rounded-xl border border-kova-border bg-kova-white p-5">
                  <p className="text-xs text-kova-dark/45">
                    Conversations
                  </p>

                  <p className="mt-3 text-2xl font-bold text-kova-dark">
                    Inbox
                  </p>

                  <div className="mt-5 space-y-2">
                    <div className="h-2 w-full rounded-full bg-kova-border" />
                    <div className="h-2 w-2/3 rounded-full bg-kova-border" />
                  </div>

                  <p className="mt-3 text-xs text-kova-dark/40">
                    Customer activity
                  </p>
                </div>

                <div className="rounded-xl border border-kova-border bg-kova-white p-5 sm:col-span-2 lg:col-span-1">
                  <p className="text-xs text-kova-dark/45">
                    Commerce
                  </p>

                  <p className="mt-3 text-2xl font-bold text-kova-dark">
                    Products
                  </p>

                  <div className="mt-5 flex gap-2">
                    <span className="h-8 flex-1 rounded-lg bg-kova-orange/30" />
                    <span className="h-8 flex-1 rounded-lg bg-kova-green/15" />
                    <span className="h-8 flex-1 rounded-lg bg-kova-dark/10" />
                  </div>

                  <p className="mt-3 text-xs text-kova-dark/40">
                    Products and sales
                  </p>
                </div>
              </div>

              {/* Main activity area */}
              <div className="mt-4 rounded-xl border border-kova-border bg-kova-white">
                <div className="flex items-center justify-between border-b border-kova-border px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-kova-dark">
                      Business activity
                    </p>

                    <p className="mt-1 text-xs text-kova-dark/40">
                      Your social and commerce workflow
                    </p>
                  </div>

                  <span className="text-xs font-medium text-kova-green">
                    This week
                  </span>
                </div>

                <div className="divide-y divide-kova-border">
                  {[
                    {
                      title: "Content scheduled",
                      detail: "Social publishing",
                      status: "Scheduled",
                    },
                    {
                      title: "Customer conversation",
                      detail: "New inquiry",
                      status: "New",
                    },
                    {
                      title: "Product activity",
                      detail: "Commerce",
                      status: "Active",
                    },
                    {
                      title: "Performance review",
                      detail: "Analytics",
                      status: "Ready",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center gap-4 px-5 py-4"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-kova-background">
                        <span className="h-2 w-2 rounded-full bg-kova-green" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-kova-dark">
                          {item.title}
                        </p>

                        <p className="mt-1 text-xs text-kova-dark/40">
                          {item.detail}
                        </p>
                      </div>

                      <span className="text-xs font-medium text-kova-dark/45">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace areas */}
        <div className="mt-16">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-kova-border bg-kova-border sm:grid-cols-2 lg:grid-cols-5">
            {workspaceAreas.map((area) => (
              <div
                key={area.number}
                className="bg-kova-white p-6"
              >
                <span className="text-xs font-semibold text-kova-orange">
                  {area.number}
                </span>

                <h3 className="mt-5 text-lg font-semibold text-kova-dark">
                  {area.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-kova-dark/55">
                  {area.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom statement */}
        <div className="mt-16 border-t border-kova-border pt-8">
          <p className="max-w-3xl text-xl leading-8 text-kova-dark/65">
            Kova is designed around the way a business actually operates:
            create attention, manage conversations, identify opportunities,
            sell, and learn from what happens next.
          </p>
        </div>
      </div>
    </section>
  );
}