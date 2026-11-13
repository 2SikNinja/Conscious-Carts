import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import localFont from "next/font/local";

import { Providers } from "@/components/providers";
import { MobileTabBar, SiteHeader } from "@/components/site-header";

import "./globals.css";

// Fonts are self-hosted so builds never depend on reaching Google Fonts.

const pacifico = localFont({
  src: "../fonts/Pacifico.ttf",
  variable: "--font-pacifico",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Conscious Carts",
    template: "%s | Conscious Carts",
  },
  description:
    "Search, scan, and compare grocery products with AI nutrition analysis tailored to your allergies and diet.",
  applicationName: "Conscious Carts",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf0" },
    { media: "(prefers-color-scheme: dark)", color: "#15190f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${pacifico.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <SiteHeader />
          {children}
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}
