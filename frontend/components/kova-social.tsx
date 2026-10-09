export default function KovaSocial() {
  return (
    <section id="social" className="border-t border-kova-border bg-kova-background">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-24">
        <div className="rounded-lg border border-kova-border bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2 border-b border-kova-border pb-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-kova-green text-xs font-bold text-white">
              K
            </span>
            <p className="text-sm font-semibold text-kova-dark">Talk to Kova</p>
          </div>
          <div className="space-y-3 py-4">
            <p className="ml-auto w-fit max-w-[80%] rounded-md bg-kova-green px-3 py-2 text-sm leading-6 text-white">
              Write a caption for the sofa and tell me who asked about delivery.
            </p>
            <div className="max-w-[88%] rounded-md border border-kova-orange/40 bg-kova-orange/25 px-3 py-3 text-sm leading-6 text-kova-dark">
              <p className="font-semibold">Caption</p>
              <p className="mt-1">A sofa that holds the whole evening. Now on the store, with delivery in Nairobi.</p>
              <p className="mt-3 font-semibold">Lead</p>
              <p>Amina asked about delivery this morning. She is saved under Leads.</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
            Talk to Kova
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-kova-dark sm:text-4xl">
            Ask for the post, the reply, or the next customer.
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-kova-dark/70">
            Kova already knows your products and your business. Use the chat for content, customer questions, and leads instead of starting from a blank page.
          </p>
          <a
            href="/signup"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-kova-green px-6 text-sm font-semibold text-white transition-colors hover:bg-[#12583f]"
          >
            Talk to Kova
          </a>
        </div>
      </div>
    </section>
  );
}
