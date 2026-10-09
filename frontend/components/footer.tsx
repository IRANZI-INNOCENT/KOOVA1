const productLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Snap to Sell", href: "/#commerce" },
  { label: "Talk to Kova", href: "/#social" },
  { label: "Pricing", href: "/#pricing" },
];

const companyLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "AI usage", href: "/ai" },
];

export default function Footer() {
  return (
    <footer className="border-t border-kova-border bg-kova-dark text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <a
              href="/"
              className="text-2xl font-bold tracking-tight"
            >
              KOVA
            </a>

            <p className="mt-5 max-w-sm text-sm leading-6 text-white/50">
              Photograph a product, publish the store, and take the order on WhatsApp.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-kova-orange">
              Product
            </p>

            <nav className="mt-5 space-y-3">
              {productLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-white/55 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-kova-orange">
              Company
            </p>

            <nav className="mt-5 space-y-3">
              {companyLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-white/55 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">
            © {new Date().getFullYear()} Kova. All rights reserved.
          </p>

          <p className="text-xs text-white/35">
            From content to commerce.
          </p>
        </div>
      </div>
    </footer>
  );
}