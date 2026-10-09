const questions = [
  {
    question: "Do I need another online shop?",
    answer:
      "No. When you add a product, Kova publishes a public store for the catalog and a page for that product. Customers can open it and order on WhatsApp.",
  },
  {
    question: "What do I have to prepare?",
    answer:
      "A photo and a price. Kova writes the listing from the photo and what it knows about your business. You can edit anything before you rely on it.",
  },
  {
    question: "How do customers pay or order?",
    answer:
      "The product page includes an order button that opens WhatsApp with your business number, so the conversation continues where you already sell.",
  },
  {
    question: "What else can I ask Kova to do?",
    answer:
      "Write posts, answer from your products, and keep track of people who ask. You stay in control of what gets published and what Kova is allowed to do.",
  },
  {
    question: "Which businesses is this for?",
    answer:
      "Small businesses that sell products or services and already talk to customers on social and WhatsApp. It is not only for online-only shops.",
  },
  {
    question: "What does the trial include?",
    answer:
      "The full workspace for 7 days. After that the plan is KSh 1,300 a month, and you can cancel anytime.",
  },
];

export default function FAQ() {
  return (
    <section className="border-t border-kova-border bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
        <h2 className="text-3xl font-bold tracking-tight text-kova-dark sm:text-4xl">
          Before you start
        </h2>
        <div className="mt-8 divide-y divide-kova-border border-y border-kova-border">
          {questions.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-semibold text-kova-dark">
                {item.question}
                <span className="text-xl font-light text-kova-dark/40 group-open:rotate-45">+</span>
              </summary>
              <p className="max-w-2xl pt-2 text-sm leading-7 text-kova-dark/65">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
