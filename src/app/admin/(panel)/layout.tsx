import { redirect } from "next/navigation";
import { AdminSidebar, AdminTopbar } from "@/components/admin/admin-nav";
import { isAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="flex min-h-screen bg-[#f6f4f0]">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <AdminTopbar />
        <main className="mx-auto max-w-[1180px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
