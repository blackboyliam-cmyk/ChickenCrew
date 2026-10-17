import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSidebar, AdminTopbar } from "@/components/admin/admin-nav";
import { OrderAlerts } from "@/components/admin/order-alerts";
import { isAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "KCC Admin", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="flex min-h-screen bg-[#f6f4f0]">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <AdminTopbar />
        <main className="mx-auto max-w-[1180px] px-3 py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-4 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
      </div>
      <OrderAlerts />
    </div>
  );
}
