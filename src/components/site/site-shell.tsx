"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ClipboardList,
  Clock,
  History,
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  ShoppingBag,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ActiveOrderBar } from "@/components/site/active-order-bar";
import { CategoryIcon } from "@/components/site/category-icons";
import { Logo } from "@/components/site/logo";
import { MealAssistant } from "@/components/site/meal-assistant";
import { ShopProvider, useShop } from "@/components/site/shop-context";
import { api } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import type { DeliverySlotOption, ProductCardData, PublicSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/offers", label: "Offers" },
  { href: "/about", label: "About" },
];

const OPEN_SEARCH = "cc:open-search";
const OPEN_LOCATION = "cc:open-location";

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH));
}

export function openLocation() {
  window.dispatchEvent(new Event(OPEN_LOCATION));
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteShell({
  settings,
  admin = false,
  children,
}: {
  settings: PublicSettings;
  admin?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ShopProvider settings={settings}>
      <ShellInner admin={admin}>{children}</ShellInner>
    </ShopProvider>
  );
}

function ShellInner({ admin, children }: { admin: boolean; children: React.ReactNode }) {
  const { settings, offline } = useShop();
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2 focus:shadow-raised"
      >
        Skip to content
      </a>
      {admin && (
        <div className="flex items-center justify-between gap-3 bg-charcoal px-4 py-2 text-xs text-white/85 sm:text-sm">
          <span className="min-w-0 truncate">You&apos;re viewing the shop as admin</span>
          <Link
            href="/admin"
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1 font-bold text-charcoal hover:bg-white/90"
          >
            <ArrowLeft className="size-3.5" /> Back to admin
          </Link>
        </div>
      )}
      {settings.starterCatalogue && (
        <p className="bg-charcoal px-4 py-1.5 text-center text-[11px] text-white/85 sm:text-xs">
          Setup menu — prices and stock are starter figures until the shop publishes its own list.
        </p>
      )}
      <Header />
      {offline && (
        <p className="bg-charcoal px-4 py-2 text-center text-sm text-white" role="status">
          You&apos;re offline. Prices may be out of date.
        </p>
      )}
      <main id="main" className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-36 md:px-6 md:pb-16">
        {children}
      </main>
      <Footer />
      <SearchPanel />
      <LocationDialog />
      <MealAssistant />
      <MobileCartBar />
      <BottomNav />
    </div>
  );
}

/* ------------------------------------------------------------------ Header */

function Header() {
  const { cart, user } = useShop();
  const pathname = usePathname();
  const next = useNextSlot();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm transition-shadow duration-200 supports-[backdrop-filter]:bg-card/90",
        scrolled ? "border-border shadow-raised" : "border-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1320px] items-center gap-3 px-4 transition-[height] duration-200 md:gap-5 md:px-6",
          scrolled ? "h-14 md:h-16" : "h-16 md:h-[72px]",
        )}
      >
        <Logo />
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={openSearch}
          className="hidden h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl border bg-background px-3.5 text-left text-sm text-muted-foreground transition-colors hover:border-foreground/20 md:flex lg:max-w-sm"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="truncate">Search chicken, cuts, combos…</span>
        </button>

        <div className="ml-auto flex items-center gap-1 md:ml-0 md:gap-2">
          <LocationPill className="hidden max-w-44 shrink md:flex" next={next} />
          <button
            type="button"
            onClick={openSearch}
            className="grid size-11 place-items-center rounded-xl text-foreground hover:bg-muted md:hidden"
            aria-label="Search"
          >
            <Search className="size-5" />
          </button>
          {user ? (
            <Link
              href="/account"
              className="hidden size-11 place-items-center rounded-xl text-foreground hover:bg-muted md:grid"
              aria-label="Account"
            >
              <UserRound className="size-5" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-foreground hover:bg-muted md:flex"
            >
              <UserRound className="size-5" />
              Sign in
            </Link>
          )}
          <CartButton count={cart?.count || 0} subtotal={cart?.subtotal || 0} />
        </div>
      </div>
      <div className="border-t border-border/60 md:hidden">
        <LocationPill className="flex h-10 w-full px-4" compact next={next} />
      </div>
      <ActiveOrderBar />
    </header>
  );
}

function CartButton({ count, subtotal }: { count: number; subtotal: number }) {
  return (
    <Link
      href="/cart"
      aria-label={count ? `Cart, ${count} ${count === 1 ? "item" : "items"}, ${formatINR(subtotal)}` : "Cart, empty"}
      className="relative inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark md:px-4"
    >
      <ShoppingBag className="size-5 md:size-4" aria-hidden />
      <span className="hidden md:inline">{count ? formatINR(subtotal) : "Cart"}</span>
      {count > 0 && (
        <span
          key={count}
          className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 animate-pop place-items-center rounded-full bg-charcoal px-1 text-[11px] font-bold text-white ring-2 ring-card"
        >
          {count}
        </span>
      )}
    </Link>
  );
}

/* --------------------------------------------------------------- Location */

function useNextSlot() {
  const [next, setNext] = useState<string | null>(null);
  useEffect(() => {
    api<{ groups: { label: string; slots: DeliverySlotOption[] }[] }>("/api/delivery-slots")
      .then((data) => {
        const group = data.groups.find((item) => item.slots.length);
        setNext(group ? `${group.label}, ${group.slots[0].label}` : "");
      })
      .catch(() => setNext(null));
  }, []);
  return next;
}

function LocationPill({
  className,
  compact = false,
  next,
}: {
  className?: string;
  compact?: boolean;
  next: string | null;
}) {
  const { location } = useShop();
  const status = location.ok === true ? "ok" : location.ok === false ? "no" : "unknown";

  return (
    <button
      type="button"
      onClick={openLocation}
      className={cn(
        "min-w-0 items-center gap-2 text-left transition-colors",
        compact ? "text-xs" : "h-11 rounded-xl px-3 hover:bg-muted",
        className,
      )}
    >
      <MapPin className={cn("shrink-0 text-primary", compact ? "size-3.5" : "size-4")} aria-hidden />
      <span className={cn("leading-tight", compact ? "shrink-0" : "min-w-0")}>
        {!compact && <span className="block text-[11px] text-muted-foreground">Delivering to</span>}
        <span className="flex items-center gap-1 truncate whitespace-nowrap font-semibold text-foreground">
          {compact && <span className="font-normal text-muted-foreground">Deliver to</span>}
          {location.pincode || "Select location"}
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </span>
      </span>
      {compact && (
        <span className="ml-auto flex min-w-0 items-center gap-1.5 text-muted-foreground">
          {status === "no" ? (
            <span className="font-medium text-destructive">Not serviceable</span>
          ) : next ? (
            <>
              <Clock className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">Next: {next}</span>
            </>
          ) : null}
        </span>
      )}
      {!compact && status !== "unknown" && (
        <span
          className={cn("size-2 shrink-0 rounded-full", status === "ok" ? "bg-success" : "bg-destructive")}
          aria-label={status === "ok" ? "Delivery available" : "Not delivering here"}
        />
      )}
    </button>
  );
}

function LocationDialog() {
  const { location, setLocation, user } = useShop();
  const [open, setOpen] = useState(false);
  const [pincode, setPincode] = useState(location.pincode);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<"" | "check" | "gps">("");
  const [addresses, setAddresses] = useState<{ id: string; label: string; area: string; pincode: string }[]>([]);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_LOCATION, onOpen);
    return () => window.removeEventListener(OPEN_LOCATION, onOpen);
  }, []);
  useEffect(() => setPincode(location.pincode), [location.pincode]);
  useEffect(() => {
    if (!open || !user) return;
    api<{ addresses: { id: string; label: string; area: string; pincode: string }[] }>("/api/addresses")
      .then((data) => setAddresses(data.addresses))
      .catch(() => setAddresses([]));
  }, [open, user]);

  async function save(pin: string) {
    setBusy("check");
    try {
      await setLocation(pin);
      setMessage("");
      setOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Enter a 6-digit pincode.");
    } finally {
      setBusy("");
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setMessage("Location isn't available on this device. Enter your pincode instead.");
      return;
    }
    setBusy("gps");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await api<{ pincode: string }>("/api/delivery/reverse", {
            method: "POST",
            body: { lat: position.coords.latitude, lng: position.coords.longitude },
          });
          setPincode(data.pincode);
          await save(data.pincode);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Enter your pincode instead.");
          setBusy("");
        }
      },
      () => {
        setMessage("Location permission wasn't given. Enter your pincode instead.");
        setBusy("");
      },
      { timeout: 8000 },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Where should we deliver?</DialogTitle>
          <DialogDescription>Enter your pincode to see delivery slots for your area.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void save(pincode);
          }}
        >
          <label className="sr-only" htmlFor="pincode">
            Pincode
          </label>
          <div className="flex gap-2">
            <Input
              id="pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              value={pincode}
              onChange={(event) => setPincode(event.target.value.replace(/\D/g, ""))}
              placeholder="6-digit pincode"
              className="h-12 text-base"
              aria-invalid={message ? true : undefined}
              aria-describedby={message ? "pincode-error" : undefined}
            />
            <Button type="submit" className="h-12 px-5" disabled={busy !== "" || pincode.length !== 6}>
              {busy === "check" ? <Loader2 className="animate-spin" /> : "Check"}
            </Button>
          </div>
          {message && (
            <p id="pincode-error" className="text-sm text-destructive" role="alert">
              {message}
            </p>
          )}
          {location.pincode && !message && (
            <p className={cn("text-sm", location.ok ? "text-success" : "text-destructive")}>{location.message}</p>
          )}
        </form>
        <button
          type="button"
          onClick={detectLocation}
          disabled={busy !== ""}
          className="flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
        >
          {busy === "gps" ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4 text-primary" />}
          Use my current location
        </button>
        {addresses.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Saved addresses</p>
            <ul className="space-y-2">
              {addresses.map((address) => (
                <li key={address.id}>
                  <button
                    type="button"
                    className="w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
                    onClick={() => void save(address.pincode)}
                  >
                    <span className="font-semibold capitalize">{address.label}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {address.area} · {address.pincode}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- Search */

type CategoryLite = { id: string; slug: string; name: string; productCount: number };

function SearchPanel() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const router = useRouter();
  const loaded = useRef(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_SEARCH, onOpen);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_SEARCH, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    try {
      setRecent(JSON.parse(localStorage.getItem("cc_recent") || "[]"));
    } catch {
      setRecent([]);
    }
    if (!loaded.current) {
      loaded.current = true;
      api<CategoryLite[]>("/api/categories")
        .then((data) => setCategories(data.filter((item) => item.slug !== "offers" && item.productCount > 0)))
        .catch(() => setCategories([]));
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (!query) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      api<{ items: ProductCardData[] }>(`/api/products?q=${encodeURIComponent(query)}&pageSize=6`)
        .then((data) => setItems(data.items))
        .catch(() => setItems([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q, open]);

  function remember(term: string) {
    const next = [term, ...recent.filter((item) => item !== term)].slice(0, 6);
    localStorage.setItem("cc_recent", JSON.stringify(next));
    setRecent(next);
  }

  function go(term: string) {
    remember(term);
    void api("/api/analytics", { method: "POST", body: { event: "search", props: { q: term } } }).catch(() => undefined);
    setOpen(false);
    router.push(`/shop?q=${encodeURIComponent(term)}`);
  }

  function clearRecent() {
    localStorage.removeItem("cc_recent");
    setRecent([]);
  }

  const query = q.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-0 h-dvh max-w-none translate-y-0 content-start gap-0 rounded-none p-0 sm:top-[10vh] sm:h-auto sm:max-w-xl sm:rounded-2xl"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <form
          className="flex items-center gap-2 border-b px-3 py-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (query) go(query);
          }}
        >
          <Search className="ml-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            type="search"
            enterKeyHint="search"
            placeholder="Search chicken, cuts, combos…"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="Search chicken, cuts, combos"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Searching" />}
          <button
            type="button"
            onClick={() => (q ? setQ("") : setOpen(false))}
            className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted"
            aria-label={q ? "Clear search" : "Close search"}
          >
            <X className="size-5" />
          </button>
        </form>

        <div className="max-h-[calc(100dvh-64px)] overflow-y-auto p-4 sm:max-h-[60vh]">
          {!query && (
            <div className="space-y-6">
              {recent.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Recent</h2>
                    <button type="button" onClick={clearRecent} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                      Clear
                    </button>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {recent.map((term) => (
                      <li key={term}>
                        <button
                          type="button"
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted"
                          onClick={() => go(term)}
                        >
                          <History className="size-3.5 text-muted-foreground" aria-hidden />
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {categories.length > 0 && (
                <section>
                  <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Popular cuts</h2>
                  <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {categories.slice(0, 9).map((category) => (
                      <li key={category.id}>
                        <Link
                          href={`/category/${category.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
                        >
                          <span className="size-8 shrink-0">
                            <CategoryIcon slug={category.slug} />
                          </span>
                          <span className="truncate">{category.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {query && !loading && items.length === 0 && (
            <div className="py-10 text-center">
              <p className="font-semibold">No cuts found for &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-sm text-muted-foreground">Try &ldquo;curry cut&rdquo; or &ldquo;boneless&rdquo;.</p>
            </div>
          )}

          {items.length > 0 && (
            <>
              <ul className="-mx-2 space-y-0.5">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={() => {
                        if (query) remember(query);
                        setOpen(false);
                      }}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
                    >
                      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {item.image && <Image src={item.image} alt="" fill sizes="48px" className="object-cover" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.weightLabel}
                          {!item.inStock && " · Sold out"}
                        </span>
                      </span>
                      <span className="price text-sm font-bold">{formatINR(item.price)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => go(query)}
                className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-muted text-sm font-semibold hover:bg-secondary"
              >
                See all results for &ldquo;{query}&rdquo;
                <ArrowRight className="size-4" aria-hidden />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- Footer */

function Footer() {
  const { settings } = useShop();
  const year = new Date().getFullYear();
  const payments = [
    settings.onlineReady ? "UPI" : null,
    settings.onlineReady ? "Cards" : null,
    settings.onlineReady ? "Net banking" : null,
    settings.onlineReady ? "Wallets" : null,
    settings.codEnabled ? "Cash on delivery" : null,
  ].filter(Boolean) as string[];

  return (
    <footer className="mt-8 bg-charcoal pb-32 text-white/70 md:pb-0">
      <div className="mx-auto grid max-w-[1320px] gap-8 px-4 py-12 sm:grid-cols-2 md:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <p className="font-[family-name:var(--font-plus-jakarta)] text-lg font-extrabold text-white">
            Chicken<span className="text-[#f87171]">Crew</span>
          </p>
          <p className="mt-1 text-sm">by {settings.name}</p>
          <p className="mt-3 text-sm leading-6">Fresh chicken, cut to order and delivered in the slot you choose.</p>
          {settings.hours && <p className="mt-3 text-sm">Open {settings.hours}</p>}
        </div>
        <FooterList
          title="Shop"
          links={[
            ["/shop", "All products"],
            ["/categories", "Categories"],
            ["/offers", "Offers"],
            ["/about", "About"],
            ["/contact", "Contact"],
            ["/faq", "FAQ"],
          ]}
        />
        <div>
          <p className="text-sm font-semibold text-white">Customer support</p>
          <ul className="mt-3 space-y-2 text-sm">
            {settings.phone && (
              <li>
                <a className="hover:text-white" href={`tel:${settings.phone}`}>
                  Call {settings.phone}
                </a>
              </li>
            )}
            {settings.whatsapp && (
              <li>
                <a
                  className="hover:text-white"
                  href={`https://wa.me/91${settings.whatsapp.replace(/\D/g, "").slice(-10)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp us
                </a>
              </li>
            )}
            {settings.email && (
              <li>
                <a className="hover:text-white" href={`mailto:${settings.email}`}>
                  {settings.email}
                </a>
              </li>
            )}
            <li>
              <Link className="hover:text-white" href="/account/orders">
                Your orders
              </Link>
            </li>
          </ul>
        </div>
        <FooterList
          title="Policies"
          links={[
            ["/legal/privacy", "Privacy"],
            ["/legal/terms", "Terms"],
            ["/legal/refund", "Refunds"],
            ["/legal/shipping", "Delivery"],
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between md:px-6">
          <p>© {year} {settings.name}</p>
          {payments.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Payment methods">
              {payments.map((item) => (
                <li key={item} className="rounded-md border border-white/15 px-2 py-1 text-white/80">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </footer>
  );
}

function FooterList({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-3 space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link className="hover:text-white" href={href}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------- Mobile chrome */

const HIDE_CART_BAR = ["/cart", "/checkout", "/product/", "/orders/", "/login"];

function MobileCartBar() {
  const { cart } = useShop();
  const pathname = usePathname();
  const count = cart?.count || 0;
  if (!count || HIDE_CART_BAR.some((path) => pathname.startsWith(path))) return null;
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-3 pb-2 md:hidden">
      <Link
        href="/cart"
        className="flex h-14 animate-fade-up items-center justify-between gap-3 rounded-2xl bg-primary px-4 text-primary-foreground shadow-float"
      >
        <span className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-black/15">
            <ShoppingBag className="size-5" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block text-xs text-white/80">
              {count} {count === 1 ? "item" : "items"}
            </span>
            <span className="price block text-base font-bold">{formatINR(cart?.subtotal || 0)}</span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-bold">
          View cart
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </Link>
    </div>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/shop", label: "Shop", icon: Store },
    { href: "#search", label: "Search", icon: Search },
    { href: "/account/orders", label: "Orders", icon: ClipboardList },
    { href: "/account", label: "Account", icon: UserRound },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/account"
              ? pathname === "/account" || (pathname.startsWith("/account/") && !pathname.startsWith("/account/orders"))
              : item.href !== "#search" && isActive(pathname, item.href);
          const classes = cn(
            "relative flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
            active ? "text-primary" : "text-muted-foreground",
          );
          return (
            <li key={item.label}>
              {item.href === "#search" ? (
                <button type="button" className={classes} onClick={openSearch}>
                  <Icon className="size-5" aria-hidden />
                  {item.label}
                </button>
              ) : (
                <Link href={item.href} className={classes} aria-current={active ? "page" : undefined}>
                  {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                  <Icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function track(event: string, props?: Record<string, string | number | boolean | null>) {
  void api("/api/analytics", { method: "POST", body: { event, props } }).catch(() => undefined);
  if (event === "add_to_cart") toast.dismiss();
}
