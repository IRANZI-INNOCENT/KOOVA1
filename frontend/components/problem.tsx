import { SectionHeader } from "@/components/landing/section-header";

const points = [
  {
    title: "Social that keeps working",
    detail:
      "Plan posts, reply to comments and messages, and see what needs you today in one place.",
  },
  {
    title: "A store from your catalog",
    detail:
      "Every product can have a public page on your store. You set the price Kova uses in posts and replies.",
  },
  {
    title: "WhatsApp where you already sell",
    detail:
      "Order buttons open a chat on your number. The conversation stays yours; Kova records the interest.",
  },
  {
    title: "Autopilot when you want hands-off",
    detail:
      "Turn it on and Kova can run the day’s content, replies, listing polish, and morning report within your rules.",
  },
];

export default function Problem() {
  return (
    <section className="border-t border-kova-border bg-kova-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <SectionHeader
          eyebrow="Why Kova"
          title="Less juggling between feeds, chats, and spreadsheets."
          lead="Kova is for owners who sell on social and WhatsApp and need one workspace that remembers the business while they serve customers."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point, index) => (
            <li
              key={point.title}
              className="rounded-lg border border-kova-border bg-white p-6 shadow-sm lg:p-7"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-kova-green text-xs font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-4 text-sm font-semibold text-kova-dark">{point.title}</h3>
              <p className="mt-2.5 text-sm leading-6 text-kova-dark/62">{point.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
