import type { Metadata } from "next";

import Navbar from "@/components/navbar";
import HeroSection from "@/components/landing/hero-section";
import PlatformsSection from "@/components/landing/platforms-section";
import ProductDemoSection from "@/components/landing/product-demo";
import WhyKcovaSection from "@/components/landing/why-kcova";
import HowItWorksSection from "@/components/landing/how-it-works";
import SocialWorkspaceSection from "@/components/landing/social-workspace";
import SnapToSellSection from "@/components/landing/snap-to-sell";
import OneWorkspaceSection from "@/components/landing/one-workspace";
import FAQSection from "@/components/landing/faq-section";
import FinalCTASection from "@/components/landing/final-cta";
import Footer from "@/components/footer";
import { JsonLd } from "@/components/seo/json-ld";
import { LANDING_FAQ } from "@/lib/landing-faq";
import { buildPageMetadata } from "@/lib/seo";

const homeMeta = buildPageMetadata({
  title: "KCOVA — Social Media, Products and WhatsApp Sales in One Place",
  description:
    "Sell on WhatsApp, Instagram, and Facebook from one workspace. Prepare product listings, share a commerce page, and guide customers to order — built for Kenyan shops.",
  path: "/",
});

export const metadata: Metadata = {
  ...homeMeta,
  // Avoid "%s · KCOVA" doubling the brand on the homepage.
  title: {
    absolute: "KCOVA — Social Media, Products and WhatsApp Sales in One Place",
  },
};

export default function Home() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-kova-background">
      <JsonLd data={faqLd} />
      <Navbar />
      <HeroSection />
      <PlatformsSection />
      <ProductDemoSection />
      <WhyKcovaSection />
      <HowItWorksSection />
      <SocialWorkspaceSection />
      <SnapToSellSection />
      <OneWorkspaceSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}
