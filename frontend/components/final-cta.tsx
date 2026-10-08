export default function FinalCTA() {
  return (
    <section className="border-t border-kova-border bg-kova-green">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-orange">
            Get started with Kova
          </p>

          <h2 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Run your social media.
            <span className="block text-kova-orange">
              Grow your business.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/70">
            Bring your content, customers, products, and sales into one
            connected system.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-kova-orange px-7 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e]"
            >
              Start for free
            </a>

            <a
              href="#product"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-7 text-sm font-semibold text-white transition-colors hover:border-white/40"
            >
              Explore Kova
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}