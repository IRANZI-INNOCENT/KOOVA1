export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-kova-green">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <a
          href="/"
          className="text-2xl font-bold tracking-tight text-white"
        >
          KOVA
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#product"
            className="text-sm font-medium text-white/90 transition-colors hover:text-kova-orange"
          >
            Product
          </a>

          <a
            href="#social"
            className="text-sm font-medium text-white/90 transition-colors hover:text-kova-orange"
          >
            Social
          </a>

          <a
            href="#commerce"
            className="text-sm font-medium text-white/90 transition-colors hover:text-kova-orange"
          >
            Commerce
          </a>

          <a
            href="#pricing"
            className="text-sm font-medium text-white/90 transition-colors hover:text-kova-orange"
          >
            Pricing
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <a
            href="/login"
            className="hidden text-sm font-medium text-white transition-colors hover:text-kova-orange sm:block"
          >
            Log in
          </a>

          <a
            href="/signup"
            className="rounded-lg bg-kova-orange px-5 py-2.5 text-sm font-semibold text-kova-dark transition-colors hover:bg-[#f0a46e]"
          >
            Start free
          </a>
        </div>
      </div>
    </header>
  );
}