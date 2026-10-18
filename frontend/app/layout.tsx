import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { JsonLd } from "@/components/seo/json-ld";
import {
  DEFAULT_OG_IMAGE,
  defaultOpenGraph,
  defaultTwitter,
} from "@/lib/seo";
import { absoluteUrl, getSiteOrigin } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const siteDescription =
  "Manage social content, prepare product listings, bring your products together on one commerce page, and guide customers to WhatsApp with KCOVA.";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

const googleVerification = (
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
  process.env.GOOGLE_SITE_VERIFICATION ||
  ""
).trim();
const bingVerification = (
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ||
  process.env.BING_SITE_VERIFICATION ||
  ""
).trim();

export const metadata: Metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "KCOVA — Social Media, Products and WhatsApp Sales in One Place",
    template: "%s · KCOVA",
  },
  description: siteDescription,
  applicationName: "KCOVA",
  keywords: [
    "WhatsApp shop Kenya",
    "Instagram selling",
    "Facebook Page posts",
    "social media for small business",
    "product listings",
    "KCOVA",
  ],
  authors: [{ name: "KCOVA" }],
  creator: "KCOVA",
  publisher: "KCOVA",
  alternates: {
    canonical: "/",
  },
  openGraph: defaultOpenGraph(),
  twitter: defaultTwitter(),
  verification: {
    ...(googleVerification ? { google: googleVerification } : {}),
    ...(bingVerification
      ? { other: { "msvalidate.01": bingVerification } }
      : {}),
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KCOVA",
  },
  formatDetection: {
    telephone: false,
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "KCOVA",
    url: getSiteOrigin(),
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
    description: siteDescription,
    areaServed: {
      "@type": "Country",
      name: "Kenya",
    },
  };

  return (
    <html lang="en-KE">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      >
        <JsonLd data={organizationLd} />
        <AuthProvider>
          <PwaProvider>{children}</PwaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}