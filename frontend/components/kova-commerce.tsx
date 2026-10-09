const path = [
  "Photo and price",
  "Listing written by Kova",
  "Store and product page live",
  "WhatsApp order",
];

export default function KovaCommerce() {
  return (
    <section id="commerce" className="border-t border-kova-border bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
            Snap to Sell
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-kova-dark sm:text-4xl">
            The photo becomes the product page.
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-kova-dark/70">
            Point your camera at what you sell. Kova prepares the listing and puts the whole catalog on a public store, plus a page for that one product.
          </p>
          <ol className="mt-8 space-y-3">
            {path.map((item, index) => (
              <li key={item} className="flex items-center gap-3 text-sm font-medium text-kova-dark">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-kova-orange text-xs font-semibold text-kova-dark">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
          <a
            href="/signup"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-kova-green px-6 text-sm font-semibold text-white transition-colors hover:bg-[#12583f]"
          >
            Put a product on sale
          </a>
        </div>

        <div id="product" className="overflow-hidden rounded-lg border border-kova-border bg-white">
          <img
            src="/landing/watch.jpg"
            alt="Two-tone analog watch ready to list with Snap to Sell"
            className="aspect-[4/3] w-full object-cover"
          />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-kova-dark/45">
                Snap to Sell
              </p>
              <span className="text-xs font-semibold text-kova-green">Understood</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-kova-dark">Two-tone analog watch</p>
            <p className="mt-1 text-sm font-bold text-kova-orange">KES 2,300</p>
            <p className="mt-2 text-xs leading-5 text-kova-dark/55">
              Active on your store. Customers can open the page and order.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-kova-background px-3 py-2">
                <p className="text-kova-dark/45">Store</p>
                <p className="mt-1 font-semibold text-kova-dark">Live</p>
              </div>
              <div className="rounded-md bg-kova-background px-3 py-2">
                <p className="text-kova-dark/45">Product page</p>
                <p className="mt-1 font-semibold text-kova-dark">Published</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
