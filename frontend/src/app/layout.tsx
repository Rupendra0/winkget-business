import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BackToTop from "@/components/BackToTop";
import GlobalNavigationLoader from "@/components/GlobalNavigationLoader";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Winkget Business - Find Local Services",
  description: "Discover and book trusted local businesses and services near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${inter.className} ${inter.variable} ${poppins.variable} antialiased`}
      >
        <Suspense fallback={null}>
          <GlobalNavigationLoader />
        </Suspense>
        <Suspense
          fallback={
            <div className="sticky top-0 z-50 h-16 sm:h-20 border-b border-orange-100/80 bg-white/70 backdrop-blur-md" />
          }
        >
          <Navbar />
        </Suspense>
        {children}
        <BackToTop />
      </body>
    </html>
  );
}
