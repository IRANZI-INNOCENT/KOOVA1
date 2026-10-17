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

export const metadata: Metadata = {
  title: "KCOVA — Social Media, Products and WhatsApp Sales in One Place",
  description:
    "Manage social content, prepare product listings, bring your products together on one commerce page, and guide customers to WhatsApp with KCOVA.",
};

export default function Home() {
  return (
    <main className="min-h-screen bg-kova-background">
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
