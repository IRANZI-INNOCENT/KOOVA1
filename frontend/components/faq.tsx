import { SectionHeader } from "@/components/landing/section-header";

const questions = [
  {
    question: "Do I need a separate online shop?",
    answer:
      "Kova publishes a store and a page for each product you list. Customers open the link and order on WhatsApp with your number.",
  },
  {
    question: "Which social accounts can I connect?",
    answer:
      "Facebook Page and Instagram through Meta. Comments and direct messages can flow into your Kova inbox when permissions are granted.",
  },
  {
    question: "How does Autopilot work?",
    answer:
      "When you turn it on, Kova can plan posts, reply in the inbox, polish thin listings, schedule content, and file the daily report according to your operating mode. You can switch back to assist or approval anytime.",
  },
  {
    question: "Who sends the WhatsApp message when someone orders?",
    answer:
      "The customer messages you on WhatsApp. Kova prepares the page and records the lead or order in your workspace.",
  },
  {
    question: "Can Kova invent prices or stock?",
    answer:
      "No. Kova uses the prices and details you record. If something is missing, it asks you rather than guessing in a customer reply.",
  },
  {
    question: "What is included in the trial?",
    answer:
      "The full workspace for seven days, including social, store, inbox, and Talk to Kova. You can cancel before the trial ends if it is not the right fit.",
  },
];

export default function FAQ() {
  return (
    <section className="border-t border-kova-border bg-kova-background">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeader eyebrow="Questions" title="Before you start" align="center" />
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-kova-border rounded-lg border border-kova-border bg-white px-5 shadow-sm sm:px-6">
          {questions.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-kova-dark">
                {item.question}
                <span className="text-xl font-light text-kova-dark/35 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pt-3 text-sm leading-7 text-kova-dark/65">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
