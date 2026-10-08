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

      {/* Hero */}
<section className="mx-auto max-w-7xl px-6 pb-24 pt-36 lg:px-8 lg:pb-32 lg:pt-44">
  <div className="grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
    
    {/* Content */}
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-kova-green">
        AI social media + commerce
      </p>

      <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight text-kova-dark sm:text-6xl lg:text-7xl">
        From content to customers.
        <span className="block text-kova-green">
          One system.
        </span>
      </h1>

      <p className="mt-8 max-w-xl text-lg leading-8 text-kova-dark/70 sm:text-xl">
        Kova helps small businesses plan, create, publish, engage with
        customers, generate leads, and sell from one place.
      </p>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        <a
          href="/signup"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-kova-green px-7 text-sm font-semibold text-white transition-colors hover:bg-[#0f4f3a]"
        >
          Start for free
        </a>

        <a
          href="#product"
          className="inline-flex h-12 items-center justify-center rounded-lg border border-kova-border bg-kova-white px-7 text-sm font-semibold text-kova-dark transition-colors hover:border-kova-green hover:text-kova-green"
        >
          See how it works
        </a>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-kova-dark/55">
        <span>Plan</span>
        <span>•</span>
        <span>Create</span>
        <span>•</span>
        <span>Publish</span>
        <span>•</span>
        <span>Engage</span>
        <span>•</span>
        <span>Sell</span>
        <span>•</span>
        <span>Analyze</span>
      </div>
    </div>

    {/* Temporary visual */}
    <HeroVisual />
  </div>
</section>

      {/* Problem */}
      <Problem />

      {/* How Kova Works */}
      <HowItWorks />

      {/* Product */}
      <ProductShowcase />

      {/* Kova Social */}
      <KovaSocial />

      {/* Kova Commerce */}
      <KovaCommerce />

      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}