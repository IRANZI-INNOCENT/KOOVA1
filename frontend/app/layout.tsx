import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
import { PwaProvider } from "@/components/pwa/pwa-provider";


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


export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export const metadata: Metadata = {
  title: "Kova — Social media and sales for your business",
  description:
    "Kova posts for you, replies to customers, and turns products into a live store with WhatsApp orders. Built for small businesses in Kenya. Start a 7-day free trial.",
  applicationName: "Kova",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kova",
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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
      >
        <AuthProvider>
          <PwaProvider>{children}</PwaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}