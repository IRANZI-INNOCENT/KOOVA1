const questions = [
  {
    question: "What is Kova?",
    answer:
      "Kova is an AI social media manager for small businesses. It helps you plan, create, publish, engage with customers, manage leads, and connect your social activity to commerce.",
  },
  {
    question: "What can Kova manage?",
    answer:
      "Kova is designed around the complete social-media workflow: planning, content creation, publishing, customer conversations, leads, analytics, and repeatable automation.",
  },
  {
    question: "What is Kova Commerce?",
    answer:
      "Kova Commerce connects your products to your social presence. With Snap to Sell, a product can become a structured listing, content, a customer conversation, and eventually a sale.",
  },
  {
    question: "Can I control what Kova does?",
    answer:
      "Yes. Kova is designed to work with business-defined rules and permissions. You remain in control of important decisions while Kova handles the work you allow it to handle.",
  },
  {
    question: "Which social platforms will Kova support?",
    answer:
      "Kova is being built around major social and messaging platforms, starting with Meta platforms and WhatsApp. More integrations can be added as the product grows.",
  },
  {
    question: "Is Kova only for online businesses?",
    answer:
      "No. Kova is designed for small businesses that use social media to reach customers, whether they sell physical products, services, or both.",
  },
];

export default function FAQ() {
  return (
    <section className="border-t border-kova-border bg-kova-white">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-green">
              FAQ
            </p>

            <h2 className="mt-5 text-4xl font-bold tracking-tight text-kova-dark sm:text-5xl">
              Questions,
              <span className="block text-kova-green">
                answered.
              </span>
            </h2>

            <p className="mt-6 max-w-md text-base leading-7 text-kova-dark/55">
              A few things businesses usually want to know before getting
              started with Kova.
            </p>
          </div>

          <div className="border-t border-kova-border">
            {questions.map((item, index) => (
              <details
                key={item.question}
                className="group border-b border-kova-border"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6">
                  <div className="flex items-start gap-5">
                    <span className="pt-1 text-xs font-semibold text-kova-orange">
                      0{index + 1}
                    </span>

                    <span className="text-base font-semibold text-kova-dark">
                      {item.question}
                    </span>
                  </div>

                  <span className="text-xl font-light text-kova-dark/40 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>

                <div className="pb-6 pl-10 pr-10">
                  <p className="max-w-2xl text-sm leading-7 text-kova-dark/55">
                    {item.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}