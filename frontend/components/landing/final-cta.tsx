export default function FinalCTASection() {
  return (
    <section className="relative overflow-hidden bg-kova-green">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,177,131,0.18),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-kova-orange">
            READY TO GET STARTED?
          </p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
            Give KCOVA one product and see what you can do with it.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-white/78">
            Start with a product photo. Build your commerce page, connect
            Facebook or Instagram if you&apos;re ready, and see how KCOVA can
            help you manage the work around selling.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-kova-orange px-8 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green sm:w-auto"
            >
              Start your free trial
            </a>
            <a
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-md border border-white/30 bg-white/10 px-8 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green sm:w-auto"
            >
              Log in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
