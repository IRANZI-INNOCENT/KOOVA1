const points = [
  { title: "A store of your own", detail: "Every product gets a public page. You do not need another shop." },
  { title: "A listing from the photo", detail: "Kova writes the name, description, and selling points. You set the price." },
  { title: "Orders on WhatsApp", detail: "Customers tap Order and message you on the number you already use." },
  { title: "One agent for the rest", detail: "Posts, replies, leads, and follow-up stay in the same workspace." },
];

export default function Problem() {
  return (
    <section className="border-y border-kova-border bg-white">
      <div className="mx-auto grid max-w-6xl gap-px bg-kova-border sm:grid-cols-2 lg:grid-cols-4">
        {points.map((point) => (
          <div key={point.title} className="bg-white px-5 py-6 lg:px-6">
            <h2 className="text-sm font-semibold text-kova-dark">{point.title}</h2>
            <p className="mt-2 text-sm leading-6 text-kova-dark/60">{point.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
