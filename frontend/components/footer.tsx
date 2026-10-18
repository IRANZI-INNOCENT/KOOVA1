import { Logo } from "@/components/ui/logo";

const productLinks = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Social", href: "/#social" },
  { label: "Commerce", href: "/#commerce" },
  { label: "WhatsApp shops", href: "/for/whatsapp-shops" },
  { label: "Instagram sellers", href: "/for/instagram-sellers" },
  { label: "Nairobi shops", href: "/for/nairobi-shops" },
  { label: "Fashion Kenya", href: "/for/fashion-kenya" },
];

const companyLinks = [
  { label: "Guides", href: "/guides" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "AI usage", href: "/ai" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-kova-dark text-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="[&_span]:text-white [&_span_span]:text-kova-orange">
              <Logo href="/" tone="light" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/52">
              Social media, customer replies, and a WhatsApp-ready store for
              small businesses. KCOVA keeps the daily work in one place.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-kova-orange">
              Product
            </p>
            <nav className="mt-5 space-y-3" aria-label="Product">
              {productLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kova-orange focus-visible:ring-offset-2 focus-visible:ring-offset-kova-dark"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-kova-orange">
              Company
            </p>
            <nav className="mt-5 space-y-3" aria-label="Company">
              {companyLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kova-orange focus-visible:ring-offset-2 focus-visible:ring-offset-kova-dark"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">© 2026 KCOVA</p>
          <p className="text-xs text-white/35">
            Built for businesses that sell on social and WhatsApp.
          </p>
        </div>
      </div>
    </footer>
  );
}
