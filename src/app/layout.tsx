import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { NativeChrome } from "@/components/native-chrome";
import { SplashScreen } from "@/components/splash-screen";
import { Toaster } from "@/components/ui/sonner";
import { absoluteUrl, siteUrl } from "@/lib/seo";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

const ogImage = absoluteUrl("/icon-512.png");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "ChickenCrew | Karthika Chicken Centre",
    template: "%s | Karthika Chicken Centre",
  },
  description:
    "Fresh chicken delivery in Dombivili and Thakurli from Karthika Chicken Centre. Order curry cut, boneless, breast and more online — cut to order, hygienically packed, delivered in your slot.",
  keywords: [
    "fresh chicken delivery",
    "chicken delivery Dombivili",
    "chicken delivery Thakurli",
    "chicken shop Dombivli",
    "Karthika Chicken Centre",
    "ChickenCrew",
    "curry cut chicken",
    "order chicken online",
  ],
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Karthika Chicken", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }, { url: "/icon-192.png", sizes: "192x192" }],
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    siteName: "Karthika Chicken Centre",
    type: "website",
    locale: "en_IN",
    url: siteUrl(),
    title: "ChickenCrew | Karthika Chicken Centre",
    description:
      "Fresh chicken delivery in Dombivili and Thakurli — cut to order, hygienically packed, and delivered in a slot you choose.",
    images: [{ url: ogImage, width: 512, height: 512, alt: "Karthika Chicken Centre" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ChickenCrew | Karthika Chicken Centre",
    description:
      "Fresh chicken delivery in Dombivili and Thakurli — cut to order, hygienically packed, and delivered in a slot you choose.",
    images: [ogImage],
  },
};

export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light">
          <NativeChrome />
          <SplashScreen />
          {children}
          <Toaster
            position="top-center"
            offset={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
            mobileOffset={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
