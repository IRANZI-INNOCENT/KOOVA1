import Image from "next/image";

import Navbar from "@/components/navbar";
import HeroVisual from "@/components/hero-visual";
import Problem from "@/components/problem";
import HowItWorks from "@/components/how-it-works";
import ProductShowcase from "@/components/product-showcase";
import KovaSocial from "@/components/kova-social";
import KovaCommerce from "@/components/kova-commerce";
import FAQ from "@/components/faq";
import FinalCTA from "@/components/final-cta";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-kova-background">
      <Navbar />

      <section className="relative min-h-[min(100vh,920px)] overflow-hidden">
        <Image
          src="/landing/shop.jpg"
          alt=""
          fill
          className="object-cover object-center"
          sizes="100vw"
          priority
        />
        <div
          className="pointer-events-none absolute inset-0 bg-kova-dark/55"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-kova-dark/75 via-kova-dark/45 to-kova-dark/35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-kova-background to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-[calc(6.5rem+env(safe-area-inset-top))] sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-8 lg:pb-24 lg:pt-[calc(7rem+env(safe-area-inset-top))]">
          <div className="max-w-xl lg:max-w-none">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-kova-orange backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-kova-orange" />
              Social · store · WhatsApp
            </p>
            <h1 className="font-display mt-6 text-[2.35rem] font-semibold leading-[1.06] tracking-tight text-white sm:text-[3.15rem] lg:text-[3.55rem]">
              One agent for the posts,
              <span className="mt-1 block text-[#a8dcc8]">the replies, and the sale.</span>
            </h1>
            <p className="mt-6 max-w-lg text-[1.05rem] leading-[1.65] text-white/82 sm:text-lg">
              Connect Facebook and Instagram, capture leads from the inbox, and send buyers to your
              store page and WhatsApp — with Kova drafting every step from your real products and
              prices.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-md bg-kova-orange px-7 text-sm font-semibold text-kova-dark shadow-sm transition-colors hover:bg-[#f0a46e]"
              >
                Start 7-day free trial
              </a>
              <a
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/35 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                See how it works
              </a>
            </div>
            <p className="mt-6 text-sm leading-6 text-white/55">
              7-day free trial on the full workspace · cancel anytime
            </p>
          </div>

          <HeroVisual />
        </div>
      </section>

      <Problem />
      <HowItWorks />
      <KovaSocial />
      <KovaCommerce />
      <ProductShowcase />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  );
}
