import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
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
  description: "Freshly prepared chicken, packed with care and delivered to your doorstep.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Karthika Chicken", statusBarStyle: "default" },
  icons: { apple: "/icon-192.png" },
  openGraph: {
    siteName: "Karthika Chicken Centre",
    type: "website",
    title: "ChickenCrew | Karthika Chicken Centre",
    description: "Freshly prepared chicken, packed with care and delivered to your doorstep.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChickenCrew | Karthika Chicken Centre",
    description: "Freshly prepared chicken, packed with care and delivered to your doorstep.",
  },
};

export const viewport: Viewport = { themeColor: "#ffffff", viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light">
          <SplashScreen />
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
