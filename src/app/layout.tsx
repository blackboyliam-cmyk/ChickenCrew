import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { NativeChrome } from "@/components/native-chrome";
import { SplashScreen } from "@/components/splash-screen";
import { Toaster } from "@/components/ui/sonner";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

const site = process.env.NEXT_PUBLIC_SITE_URL || "https://karthikachickencentre.shop";

export const metadata: Metadata = {
  metadataBase: new URL(site),
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
  icons: { apple: "/icon-192.png" },
  openGraph: {
    siteName: "Karthika Chicken Centre",
    type: "website",
    title: "ChickenCrew | Karthika Chicken Centre",
    description:
      "Fresh chicken delivery in Dombivili and Thakurli — cut to order, hygienically packed, and delivered in a slot you choose.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChickenCrew | Karthika Chicken Centre",
    description:
      "Fresh chicken delivery in Dombivili and Thakurli — cut to order, hygienically packed, and delivered in a slot you choose.",
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
