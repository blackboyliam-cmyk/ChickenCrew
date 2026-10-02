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
    <div className="py-5 md:py-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-lg font-extrabold text-primary">
          {user?.name?.trim()?.[0]?.toUpperCase() || <UserRound className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold tracking-tight md:text-2xl">
            {user ? user.name || "Your account" : "Account"}
          </h1>
          {user && <p className="text-sm text-muted-foreground">{user.phone}</p>}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr] md:gap-8">
        <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2.5 rounded-lg border px-3.5 text-sm font-medium whitespace-nowrap transition-colors md:h-11 md:border-transparent",
                  active
                    ? "border-primary bg-primary/[0.06] text-primary md:border-transparent"
                    : "bg-card text-foreground/80 hover:bg-muted hover:text-foreground md:bg-transparent",
                )}
              >
                <Icon className="hidden size-4 md:block" aria-hidden />
                {label}
              </Link>
            );
          })}
          {user && (
            <button
              type="button"
              onClick={() => void logout()}
              className="flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-destructive md:mt-2 md:h-11 md:border-t md:pt-2"
            >
              <LogOut className="hidden size-4 md:block" aria-hidden />
              Log out
            </button>
          )}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
