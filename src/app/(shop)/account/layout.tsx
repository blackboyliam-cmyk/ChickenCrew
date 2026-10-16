"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, Heart, LogOut, MapPin, TicketPercent, UserRound } from "lucide-react";
import { api } from "@/lib/api-client";
import { useShop } from "@/components/site/shop-context";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account", label: "Profile", icon: UserRound },
  { href: "/account/orders", label: "Orders", icon: ClipboardList },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/account/saved", label: "Saved items", icon: Heart },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, refreshUser } = useShop();

  async function logout() {
    await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => undefined);
    await refreshUser();
    router.push("/");
  }

  return (
    <div className="py-4 md:py-8">
      <div className="mb-4 flex items-center gap-3 md:mb-5">
        <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-base font-extrabold text-primary md:size-12 md:text-lg">
          {user?.name?.trim()?.[0]?.toUpperCase() || <UserRound className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight md:text-2xl">
            {user ? user.name || "Your account" : "Account"}
          </h1>
          {user && <p className="truncate text-sm text-muted-foreground">{user.phone || user.email}</p>}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-[220px_1fr] md:gap-8">
        <nav
          aria-label="Account"
          className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:pb-0"
        >
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2.5 rounded-xl border px-3.5 text-sm font-semibold whitespace-nowrap transition-colors md:h-11 md:rounded-lg md:border-transparent md:font-medium",
                  active
                    ? "border-primary bg-primary/[0.06] text-primary md:border-transparent"
                    : "bg-card text-foreground/80 hover:bg-muted hover:text-foreground md:bg-transparent",
                )}
              >
                <Icon className="size-4 opacity-70 md:opacity-100" aria-hidden />
                {label}
              </Link>
            );
          })}
          {user && (
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-destructive md:mt-2 md:h-11 md:rounded-lg md:border-t md:pt-2 md:font-medium"
            >
              <LogOut className="size-4" aria-hidden />
              Log out
            </button>
          )}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
