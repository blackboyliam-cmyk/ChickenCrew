import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";

const LINKS = [
  ["/admin", "Overview"],
  ["/admin/products", "Products"],
  ["/admin/categories", "Categories"],
  ["/admin/offers", "Offers"],
  ["/admin/coupons", "Coupons"],
  ["/admin/slots", "Slots"],
  ["/admin/orders", "Orders"],
  ["/admin/customers", "Customers"],
  ["/admin/settings", "Settings"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[180px_1fr]">
        <aside>
          <p className="text-sm font-semibold">ChickenCrew</p>
          <nav className="mt-3 flex gap-2 overflow-auto md:flex-col">
            {LINKS.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-full px-3 py-2 text-sm hover:bg-muted">
                {label}
              </Link>
            ))}
            <Link href="/" className="rounded-full px-3 py-2 text-sm text-muted-foreground">
              View shop
            </Link>
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
