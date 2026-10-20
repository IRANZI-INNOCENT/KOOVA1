export default function FinalCTASection() {
  return (
    <section className="bg-kova-green">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
            Give KCOVA one product and see what you can do with it.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-white/78">
            Start with a product photo. Build your commerce page, connect
            Facebook or Instagram when you’re ready, and manage the work around
            selling in one place.
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
              className="inline-flex h-12 w-full items-center justify-center rounded-md border border-white/30 bg-transparent px-8 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-kova-green sm:w-auto"
            >
              Log in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
