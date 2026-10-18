import { LANDING_FAQ } from "@/lib/landing-faq";

export default function FAQSection() {
  return (
    <section
      className="border-t border-kova-border bg-kova-background"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <h2
          id="faq-heading"
          className="font-display text-center text-[1.75rem] font-semibold tracking-tight text-kova-dark sm:text-4xl"
        >
          FAQ
        </h2>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-kova-border rounded-lg border border-kova-border bg-white px-5 sm:px-6">
          {LANDING_FAQ.map((item) => (
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
