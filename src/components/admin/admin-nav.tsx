"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bike,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Package,
  Settings,
  Tag,
  TicketPercent,
  Users,
} from "lucide-react";
import { cn } from "cn";
import { api } from "@/lib/api-client";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/riders", label: "Riders", icon: Bike },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { href: "/admin/offers", label: "Offers", icon: Tag },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/slots", label: "Delivery slots", icon: CalendarClock },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
}

function useLogout() {
  const router = useRouter();
  return async () => {
    await api("/api/admin/logout", { method: "POST", body: {} }).catch(() => undefined);
    router.push("/admin/login");
    router.refresh();
  };
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-black text-white">CC</span>
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-tight">ChickenCrew</span>
        <span className="block text-[11px] font-medium text-white/55">Shop admin</span>
      </span>
    </Link>
  );
}

export function AdminSidebar() {
  const isActive = useActive();
  const logout = useLogout();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-charcoal px-3 py-5 text-white lg:flex">
      <div className="px-2">
        <Brand />
      </div>
      <nav aria-label="Admin" className="mt-8 flex-1 space-y-0.5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                active ? "bg-white/12 text-white" : "text-white/65 hover:bg-white/6 hover:text-white",
              )}
            >
              <Icon className={cn("size-4.5", active && "text-red-300")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-0.5 border-t border-white/10 pt-3">
        <Link
          href="/"
          target="_blank"
          className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/65 hover:bg-white/6 hover:text-white"
        >
          <ExternalLink className="size-4.5" /> View shop
        </Link>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/65 hover:bg-white/6 hover:text-white"
        >
          <LogOut className="size-4.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}

export function AdminTopbar() {
  const isActive = useActive();
  const logout = useLogout();
  return (
    <div className="sticky top-0 z-30 bg-charcoal text-white lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Brand />
        <div className="flex items-center gap-1">
          <Link href="/" target="_blank" className="grid size-10 place-items-center rounded-lg text-white/70 hover:bg-white/10" aria-label="View shop">
            <ExternalLink className="size-4.5" />
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="grid size-10 place-items-center rounded-lg text-white/70 hover:bg-white/10"
            aria-label="Sign out"
          >
            <LogOut className="size-4.5" />
          </button>
        </div>
      </div>
      <nav aria-label="Admin" className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2.5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[13px] font-medium whitespace-nowrap",
                active ? "bg-white text-charcoal" : "text-white/70 hover:bg-white/10",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
