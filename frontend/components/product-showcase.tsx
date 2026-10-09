const areas = [
  { title: "Content", description: "Plan and keep the posts Kova writes for your products." },
  { title: "Inbox", description: "See customer questions in one place instead of scattered chats." },
  { title: "Leads", description: "Keep the people who asked, and what they asked about." },
  { title: "Analytics", description: "See what is live, what sold interest, and what to do next." },
];

export default function ProductShowcase() {
  return (
    <section className="border-t border-kova-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
            Workspace
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-kova-dark sm:text-4xl">
            Selling is only one part of the day.
          </h2>
          <p className="mt-4 text-base leading-7 text-kova-dark/70">
            The store, the chat, and the follow-up live together, so a product does not disappear after you post it.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {areas.map((area) => (
            <div key={area.title} className="rounded-lg border border-kova-border bg-kova-background p-5">
              <h3 className="text-base font-semibold text-kova-dark">{area.title}</h3>
              <p className="mt-2 text-sm leading-6 text-kova-dark/65">{area.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
