const questions = [
  {
    question: "Do I need my own website to use KCOVA?",
    answer:
      "No. KCOVA's commerce page brings your products together in one place, so customers can browse what you sell without you having to build a separate online store. You can share your page or individual products with customers. Orders can continue through WhatsApp.",
  },
  {
    question: "Which social media accounts can I connect?",
    answer:
      "KCOVA is designed to work with Facebook and Instagram. Connect the accounts supported by your setup to manage social content and customer interactions from one workspace. The accounts and permissions available depend on your connection setup.",
  },
  {
    question: "What happens when I turn on Autopilot?",
    answer:
      "You choose what KCOVA is allowed to do. Depending on your settings and the features available, it can handle approved routine tasks while following your business rules. You remain in control of the permissions you grant.",
  },
  {
    question: "Who handles orders on WhatsApp?",
    answer:
      "Your customer continues the conversation with your business on WhatsApp. KCOVA helps customers find your products and get to the conversation, while you handle the order with them. The exact steps depend on your ordering process.",
  },
  {
    question: "Can KCOVA make up prices or stock information?",
    answer:
      "KCOVA should use the product details, prices, and business information you provide. It shouldn't invent prices or claim that an item is in stock without reliable information. Review product details and confirm stock information before making promises to customers.",
  },
  {
    question: "What's included in the seven-day free trial?",
    answer:
      "The trial lets you try KCOVA before committing to a paid plan. Check the signup page for the current trial terms, available features, and what happens when the seven days end. You can cancel according to the terms shown when you sign up.",
  },
];

export default function FAQSection() {
  return (
    <section className="border-t border-kova-border bg-kova-background" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <h2
          id="faq-heading"
          className="font-display text-center text-[1.75rem] font-semibold tracking-tight text-kova-dark sm:text-4xl"
        >
          FAQ
        </h2>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-kova-border rounded-lg border border-kova-border bg-white px-5 sm:px-6">
          {questions.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-base font-semibold text-kova-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kova-green focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  className="shrink-0 text-xl font-light text-kova-dark/35 transition-transform group-open:rotate-45 motion-reduce:transition-none"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="pt-3 text-sm leading-7 text-kova-dark/65">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
