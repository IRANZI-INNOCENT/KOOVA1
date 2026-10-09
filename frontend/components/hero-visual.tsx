export default function HeroVisual() {
  return (
    <div className="drop-shadow-md">
      <div className="overflow-hidden rounded-lg border border-white/70 bg-white shadow-sm">
        <div className="relative">
          <img
            src="/landing/sofa.jpg"
            alt="Teal upholstered sofa listed on a Kova store"
            className="aspect-[4/3] w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded-md bg-kova-green px-2 py-1 text-xs font-semibold text-white">
            Live on your store
          </span>
        </div>
        <div className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-kova-orange">
              From one photo
            </p>
            <h3 className="mt-1 text-base font-semibold text-kova-dark">
              Upholstered living room sofa
            </h3>
            <p className="mt-1 text-sm font-bold text-kova-orange">KES 23,000</p>
          </div>
          <span className="inline-flex h-9 shrink-0 items-center rounded-md bg-kova-orange px-3 text-xs font-bold text-kova-dark">
            Order on WhatsApp
          </span>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-kova-border bg-white p-3 shadow-sm">
        <p className="px-1 text-xs font-semibold uppercase tracking-[0.14em] text-kova-green">
          Talk to Kova
        </p>
        <p className="mt-2 ml-auto w-fit max-w-[85%] rounded-md bg-kova-green px-3 py-2 text-xs leading-5 text-white">
          List this sofa and write a post.
        </p>
        <p className="mt-2 max-w-[90%] rounded-md border border-kova-orange/40 bg-kova-orange/25 px-3 py-2 text-xs leading-5 text-kova-dark">
          It is live. Customers can order on WhatsApp, and the post is ready to publish.
        </p>
      </div>
    </div>
  );
}
