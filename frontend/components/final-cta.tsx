export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-kova-green">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,177,131,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.06),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
            Connect social. Capture leads. Close on WhatsApp.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-white/78">
            Give Kova one product and one week — list it, wire up Facebook or Instagram if you are
            ready, and see the full flow before you commit.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/signup"
              className="inline-flex h-12 w-full items-center justify-center rounded-md bg-kova-orange px-8 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e] sm:w-auto"
            >
              Start free trial
            </a>
            <a
              href="/login"
              className="inline-flex h-12 w-full items-center justify-center rounded-md border border-white/30 bg-white/10 px-8 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:w-auto"
            >
              Log in
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
