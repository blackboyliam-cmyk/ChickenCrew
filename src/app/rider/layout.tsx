import type { Metadata, Viewport } from "next";
import { RiderLangProvider } from "@/components/rider/rider-lang";

export const metadata: Metadata = {
  title: "Rider",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1c1917" };

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return (
    <RiderLangProvider>
      <div className="min-h-screen bg-[#f6f4f0]">{children}</div>
    </RiderLangProvider>
  );
}
