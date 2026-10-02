"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, ApiClientError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import type { CartView, PublicSettings } from "@/lib/types";

type User = { id: string; name: string; phone: string; email: string; savedProductIds: string[] };
type LocationState = { pincode: string; ok: boolean | null; message: string };

type ShopContextValue = {
  settings: PublicSettings;
  user: User | null;
  cart: CartView | null;
  location: LocationState;
  offline: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setLocation: (pincode: string) => Promise<void>;
  add: (productId: string, variantId: string, qty?: number, opts?: { silent?: boolean }) => Promise<void>;
  setQty: (itemId: string, qty: number) => Promise<void>;
  toggleSaved: (productId: string) => Promise<void>;
};

const ShopContext = createContext<ShopContextValue | null>(null);
const SNAP = "cc_cart_snapshot";
const LOC = "cc_location";

export function ShopProvider({ settings, children }: { settings: PublicSettings; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartView | null>(null);
  const [location, setLocationState] = useState<LocationState>({ pincode: "", ok: null, message: "" });
  const [offline, setOffline] = useState(false);
  const [ready, setReady] = useState(false);

  function remember(next: CartView) {
    setCart(next);
    try {
      localStorage.setItem(SNAP, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }

  async function refresh() {
    const data = await api<{ cart: CartView }>("/api/cart");
    remember(data.cart);
  }

  async function refreshUser() {
    const data = await api<{ user: User | null }>("/api/auth/session");
    setUser(data.user);
  }

  async function setLocation(pincode: string) {
    const result = await api<{ ok: boolean; pincode: string; message: string }>("/api/delivery/check", {
      method: "POST",
      body: { pincode },
    });
    const next = { pincode: result.pincode, ok: result.ok, message: result.message };
    setLocationState(next);
    localStorage.setItem(LOC, JSON.stringify(next));
  }

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOffline(!navigator.onLine);
    try {
      const saved = localStorage.getItem(LOC);
      if (saved) setLocationState(JSON.parse(saved));
      const snap = localStorage.getItem(SNAP);
      if (snap) setCart(JSON.parse(snap));
    } catch {
      /* ignore */
    }
    Promise.all([refresh().catch(() => undefined), refreshUser().catch(() => undefined)]).finally(() => setReady(true));
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!offline && ready) {
      refresh().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offline]);

  const value: ShopContextValue = {
      settings,
      user,
      cart,
      location,
      offline,
      ready,
      refresh,
      refreshUser,
      setLocation,
      add: async (productId, variantId, qty = 1, opts) => {
        try {
          const data = await api<{ cart: CartView }>("/api/cart", {
            method: "POST",
            body: { productId, variantId, qty },
          });
          remember(data.cart);
          if (opts?.silent) return;
          const added = data.cart.items.find((item) => item.variantId === variantId);
          window.dispatchEvent(new CustomEvent("cc:added", { detail: { name: added?.name || "" } }));
          void api("/api/analytics", { method: "POST", body: { event: "add_to_cart", props: { productId, qty } } });
          toast.success("Added to cart", {
            description: `${data.cart.count} ${data.cart.count === 1 ? "item" : "items"} · ${formatINR(data.cart.subtotal)}`,
            action: { label: "View cart", onClick: () => router.push("/cart") },
          });
        } catch (error) {
          toast.error(error instanceof ApiClientError ? error.message : "Something went wrong.");
          throw error;
        }
      },
      setQty: async (itemId, qty) => {
        try {
          const data =
            qty <= 0
              ? await api<{ cart: CartView }>(`/api/cart/${itemId}`, { method: "DELETE" })
              : await api<{ cart: CartView }>(`/api/cart/${itemId}`, { method: "PUT", body: { qty } });
          remember(data.cart);
          if (qty <= 0) {
            void api("/api/analytics", { method: "POST", body: { event: "remove_from_cart", props: { itemId } } });
          }
        } catch (error) {
          toast.error(error instanceof ApiClientError ? error.message : "Something went wrong.");
        }
      },
      toggleSaved: async (productId) => {
        if (!user) {
          router.push("/login?next=/shop");
          return;
        }
        const data = await api<{ savedProductIds: string[] }>("/api/saved", { method: "POST", body: { productId } });
        setUser({ ...user, savedProductIds: data.savedProductIds });
      },
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("Shop provider missing");
  return context;
}
