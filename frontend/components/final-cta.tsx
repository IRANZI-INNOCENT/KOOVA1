export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-kova-green">
      <img
        src="/landing/shop.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
      />
      <div className="absolute inset-0 bg-kova-green/82" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 sm:flex-row sm:items-center lg:px-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Put the first product on sale.
          </h2>
          <p className="mt-3 max-w-lg text-base leading-7 text-white/75">
            Start the free week, snap one product, and send a customer the page.
          </p>
        </div>
        <a
          href="/signup"
          className="inline-flex h-11 shrink-0 items-center rounded-md bg-kova-orange px-6 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e]"
        >
          Start free trial
        </a>
      </div>
    </section>
  );
}
