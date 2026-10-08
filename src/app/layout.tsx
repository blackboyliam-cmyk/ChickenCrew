import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "600", "700", "800"],
});

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
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light">
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
