import Navbar from "@/components/navbar";
import HeroVisual from "@/components/hero-visual";
import Problem from "@/components/problem";
import HowItWorks from "@/components/how-it-works";
import ProductShowcase from "@/components/product-showcase";
import KovaSocial from "@/components/kova-social";
import KovaCommerce from "@/components/kova-commerce";
import Pricing from "@/components/pricing";
import FAQ from "@/components/faq";
import FinalCTA from "@/components/final-cta";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-kova-background">
      <Navbar />

      <section className="relative overflow-hidden">
        <img
          src="/landing/shop.jpg"
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#fafaf8]/90 lg:bg-transparent lg:bg-gradient-to-r lg:from-[#fafaf8] lg:via-[#fafaf8]/88 lg:via-42% lg:to-[#fafaf8]/15" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-[calc(7rem+env(safe-area-inset-top))] sm:px-5 sm:pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-[calc(8rem+env(safe-area-inset-top))]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-kova-orange">
              AI social media + commerce
            </p>
            <h1 className="mt-3 max-w-xl text-[2rem] font-bold leading-[1.05] tracking-tight text-kova-dark sm:text-5xl lg:text-6xl">
              Photograph a product.
              <span className="mt-1 block text-kova-green">Sell it today.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-kova-dark/70 sm:text-lg">
              Kova reads the photo, writes the listing, and publishes a public store with a WhatsApp order button. Ask Kova for the post, the reply, and the follow-up.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-md bg-kova-green px-6 text-sm font-semibold text-white transition-colors hover:bg-[#12583f]"
              >
                Start free trial
              </a>
              <a
                href="#commerce"
                className="inline-flex h-11 items-center justify-center rounded-md border border-kova-border bg-white px-6 text-sm font-semibold text-kova-dark transition-colors hover:border-kova-orange"
              >
                See Snap to Sell
              </a>
            </div>
            <p className="mt-5 text-sm text-kova-dark/50">
              7 days free. Then KSh 1,300 a month. Cancel anytime.
            </p>
          </div>

          <HeroVisual />
        </div>
      </section>

      <Problem />
      <HowItWorks />
      <KovaCommerce />
      <KovaSocial />
      <ProductShowcase />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
