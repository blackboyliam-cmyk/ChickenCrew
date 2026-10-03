"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, Check, ChevronLeft, CreditCard, Loader2, MapPin, Plus, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleButton } from "@/components/site/google-button";
import { OtpForm } from "@/components/site/otp-form";
import { openLocation } from "@/components/site/site-shell";
import { useShop } from "@/components/site/shop-context";
import { EmptyState } from "@/components/site/states";
import { MapPicker } from "@/components/maps/map-picker";
import { api, ApiClientError } from "@/lib/api-client";
import { formatINR } from "@/lib/money";
import { loadRazorpay } from "@/lib/razorpay-client";
import type { Address, DeliverySlotOption } from "@/lib/types";
import { cn } from "@/lib/utils";

type Quote = { ok?: boolean; message?: string; discount?: number; deliveryFee?: number; total?: number; code?: string };
type SlotGroup = { date: string; label: string; slots: DeliverySlotOption[] };

const STEPS = ["Address", "Slot", "Payment", "Review"];
const REQUIRED: [keyof AddressForm, string][] = [
  ["name", "Full name"],
  ["phone", "Mobile number"],
  ["house", "House / flat"],
  ["area", "Area"],
  ["city", "City"],
  ["pincode", "Pincode"],
];

type AddressForm = {
  name: string;
  email: string;
  phone: string;
  house: string;
  building: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  label: string;
  saveAddress: boolean;
  lat?: number;
  lng?: number;
};

export default function CheckoutPage() {
  const { user, cart, location, refresh, refreshUser, settings } = useShop();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const [groups, setGroups] = useState<SlotGroup[] | null>(null);
  const [day, setDay] = useState("");
  const [slot, setSlot] = useState("");
  const [method, setMethod] = useState<"cod" | "razorpay">(
    settings.onlineReady ? "razorpay" : settings.codEnabled ? "cod" : "razorpay",
  );
  const [coupon, setCoupon] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "placing" | "paying">("");
  const [form, setForm] = useState<AddressForm>({
    name: "",
    email: "",
    phone: "",
    house: "",
    building: "",
    street: "",
    area: "",
    landmark: "",
    city: "",
    state: "",
    pincode: location.pincode || "",
    label: "home",
    saveAddress: true,
  });
  const idempotencyKey = useRef("");
  if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();

  useEffect(() => {
    void api("/api/analytics", { method: "POST", body: { event: "begin_checkout", props: {} } }).catch(() => undefined);
    api<{ groups: SlotGroup[] }>("/api/delivery-slots")
      .then((data) => {
        const open = data.groups.filter((group) => group.slots.length > 0);
        setGroups(open);
        if (open[0]) setDay(open[0].date);
      })
      .catch(() => setGroups([]));
  }, []);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.name,
      email: current.email || user.email,
      phone: user.phone,
      pincode: current.pincode || location.pincode,
    }));
    api<{ addresses: Address[] }>("/api/addresses")
      .then((data) => {
        setAddresses(data.addresses);
        const match = data.addresses.find((address) => address.pincode === location.pincode) || data.addresses[0];
        if (match) chooseAddress(match);
      })
      .catch(() => setAddresses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedSlot = useMemo(() => {
    const [date, id] = slot.split("|");
    const group = groups?.find((item) => item.date === date);
    const option = group?.slots.find((item) => item.id === id);
    return group && option ? { day: group.label, label: option.label } : null;
  }, [slot, groups]);

  function chooseAddress(address: Address) {
    setAddressId(address.id);
    setAdding(false);
    setForm((current) => ({
      ...current,
      ...address,
      email: current.email,
      saveAddress: false,
    }));
  }

  function startNewAddress() {
    setAddressId("");
    setAdding(true);
    setForm((current) => ({
      ...current,
      name: user?.name || current.name,
      phone: user?.phone || current.phone,
      house: "",
      building: "",
      street: "",
      area: "",
      landmark: "",
      city: "",
      state: "",
      pincode: location.pincode || "",
      label: "home",
      saveAddress: true,
      lat: undefined,
      lng: undefined,
    }));
  }

  function next() {
    setError("");
    if (step === 0) {
      const missing = REQUIRED.filter(([key]) => !String(form[key]).trim()).map(([, label]) => label);
      if (missing.length) {
        setError(`Please fill in: ${missing.join(", ")}.`);
        return;
      }
      if (!/^\d{6}$/.test(form.pincode.trim())) {
        setError("Enter a 6-digit pincode.");
        return;
      }
    }
    if (step === 1 && !slot) {
      setError("Choose a delivery slot.");
      return;
    }
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  }

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setError("");
    setCouponBusy(true);
    try {
      const data = await api<Quote>("/api/coupons/validate", { method: "POST", body: { code: coupon } });
      setQuote(data);
      if (data.ok === false) setError(data.message || "That coupon can't be used.");
      else void api("/api/analytics", { method: "POST", body: { event: "coupon_applied", props: { code: coupon } } }).catch(() => undefined);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setCouponBusy(false);
    }
  }

  async function place() {
    if (!cart) return;
    if (!location.ok) {
      setError(location.message || "Choose a delivery location inside the service area.");
      return;
    }
    const [slotDate, slotTemplateId] = slot.split("|");
    if (!slotDate || !slotTemplateId) {
      setError("Choose a delivery slot.");
      setStep(1);
      return;
    }
    setBusy("placing");
    setError("");
    const seenPrices = Object.fromEntries(cart.items.map((item) => [item.variantId, item.unitPrice]));
    try {
      const data = await api<{ order: { id: string; number: string; total: number } }>("/api/orders", {
        method: "POST",
        body: {
          name: form.name,
          email: form.email,
          address: form,
          saveAddress: form.saveAddress,
          slotDate,
          slotTemplateId,
          couponCode: quote?.ok ? quote.code : "",
          paymentMethod: method,
          seenPrices,
          idempotencyKey: idempotencyKey.current,
        },
      });
      await refresh();
      if (method === "cod") {
        void api("/api/analytics", { method: "POST", body: { event: "purchase", props: { order: data.order.number, total: data.order.total } } }).catch(() => undefined);
        router.push(`/orders/${data.order.id}?placed=1`);
        return;
      }
      setBusy("paying");
      void api("/api/analytics", { method: "POST", body: { event: "payment_started", props: { order: data.order.number } } }).catch(() => undefined);
      const payment = await api<{ keyId: string; razorpayOrderId: string; amount: number; currency: string }>("/api/payment/create", {
        method: "POST",
        body: { orderId: data.order.id },
      });
      await loadRazorpay();
      if (!window.Razorpay) throw new ApiClientError("Payment could not be started. Please try again.");
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: settings.name,
        description: data.order.number,
        order_id: payment.razorpayOrderId,
        prefill: { name: form.name, contact: form.phone, email: form.email },
        theme: { color: "#b91c1c" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setBusy("paying");
          try {
            const verified = await api<{ order: { id: string; number: string; total: number } }>("/api/payment/verify", {
              method: "POST",
              body: { orderId: data.order.id, ...response },
            });
            void api("/api/analytics", { method: "POST", body: { event: "purchase", props: { order: verified.order.number, total: verified.order.total } } }).catch(() => undefined);
            router.push(`/orders/${verified.order.id}?placed=1`);
          } catch (err) {
            setBusy("");
            setError(err instanceof ApiClientError ? err.message : "We couldn't confirm the payment. Check your order page before paying again.");
          }
        },
        modal: {
          ondismiss: () => {
            setBusy("");
            setError("Payment cancelled. You can try again.");
          },
        },
      });
      checkout.open();
    } catch (err) {
      setBusy("");
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
      idempotencyKey.current = crypto.randomUUID();
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Sign in to check out</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          New here?{" "}
          <a href="/login?mode=signup&next=/checkout" className="font-semibold text-primary hover:underline">
            Create an account
          </a>
        </p>
        <div className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
          <GoogleButton next="/checkout" />
          <OtpForm onDone={() => void refreshUser()} submitLabel="Continue to checkout" />
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="py-8">
        <EmptyState title="Your cart is empty" body="Add a few cuts before checking out." actionLabel="Start shopping" href="/shop" />
      </div>
    );
  }

  const discount = quote?.ok ? quote.discount || 0 : 0;
  const deliveryFee =
    quote?.deliveryFee ?? (cart.subtotal - discount >= (settings.freeDeliveryAbove ?? Infinity) ? 0 : settings.deliveryFee);
  const total = quote?.total ?? cart.subtotal - discount + deliveryFee;
  const savedAddress = addresses.find((address) => address.id === addressId);
  const showForm = adding || addresses.length === 0;
  const activeGroup = groups?.find((group) => group.date === day);
  const actionLabel =
    step < 3 ? "Continue" : busy === "paying" ? "Processing payment…" : busy === "placing" ? "Placing order…" : method === "cod" ? `Place order · ${formatINR(total)}` : `Pay ${formatINR(total)}`;

  return (
    <div className="py-5 md:py-8">
      <div className="flex items-center gap-2">
        {step > 0 ? (
          <button type="button" onClick={back} className="-ml-2 grid size-10 place-items-center rounded-lg hover:bg-muted" aria-label="Back">
            <ChevronLeft className="size-5" />
          </button>
        ) : (
          <Link href="/cart" className="-ml-2 grid size-10 place-items-center rounded-lg hover:bg-muted" aria-label="Back to cart">
            <ChevronLeft className="size-5" />
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight md:text-[28px]">Checkout</h1>
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Checkout progress">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} aria-current={current ? "step" : undefined}>
              <button
                type="button"
                disabled={index > step}
                onClick={() => index < step && setStep(index)}
                className="w-full text-left disabled:cursor-default"
              >
                <span className={cn("block h-1 rounded-full transition-colors duration-200", done || current ? "bg-primary" : "bg-border")} />
                <span
                  className={cn(
                    "mt-2 flex items-center gap-1 text-xs font-semibold",
                    current ? "text-foreground" : done ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {location.ok === false && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          <span>{location.message || "We're not delivering to this pincode yet."}</span>
          <button type="button" onClick={openLocation} className="font-semibold underline">
            Change pincode
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <div className="min-w-0 animate-fade-up" key={step}>
          {step === 0 && (
            <section aria-labelledby="step-address">
              <h2 id="step-address" className="text-lg font-bold">Delivery address</h2>
              {addresses.length > 0 && (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {addresses.map((address) => {
                    const selected = address.id === addressId && !adding;
                    return (
                      <li key={address.id}>
                        <button
                          type="button"
                          onClick={() => chooseAddress(address)}
                          aria-pressed={selected}
                          className={cn(
                            "relative h-full w-full rounded-2xl border bg-card p-4 text-left transition-colors",
                            selected ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30",
                          )}
                        >
                          <span className="flex items-center justify-between">
                            <span className="text-xs font-bold tracking-wide uppercase">{address.label}</span>
                            <span
                              className={cn(
                                "grid size-5 place-items-center rounded-full border-2",
                                selected ? "border-primary bg-primary text-white" : "border-border",
                              )}
                              aria-hidden
                            >
                              {selected && <Check className="size-3" strokeWidth={3.5} />}
                            </span>
                          </span>
                          <span className="mt-2 block text-sm font-semibold">{address.name}</span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">
                            {[address.house, address.building, address.street, address.area].filter(Boolean).join(", ")}
                            <br />
                            {address.city} {address.pincode}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <button
                      type="button"
                      onClick={startNewAddress}
                      className={cn(
                        "flex h-full min-h-28 w-full items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.04]",
                        adding && "border-primary bg-primary/[0.04]",
                      )}
                    >
                      <Plus className="size-4" aria-hidden />
                      Add address
                    </button>
                  </li>
                </ul>
              )}

              {showForm && (
                <div className="mt-4 rounded-2xl border bg-card p-4 md:p-5">
                  <div className="mb-4">
                    <MapPicker
                      value={form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null}
                      onChange={(pin) => setForm((current) => ({ ...current, lat: pin?.lat, lng: pin?.lng }))}
                      onAddress={(parts) =>
                        setForm((current) => ({
                          ...current,
                          ...Object.fromEntries(Object.entries(parts).filter(([, value]) => value)),
                        }))
                      }
                      hint={form.pincode ? `${form.pincode}, India` : undefined}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Full name" autoComplete="name" value={form.name} onChange={(name) => setForm({ ...form, name })} />
                    <Field label="Mobile number" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
                    <Field label="House / flat" value={form.house} onChange={(house) => setForm({ ...form, house })} />
                    <Field label="Building (optional)" value={form.building} onChange={(building) => setForm({ ...form, building })} />
                    <Field label="Street (optional)" autoComplete="address-line1" value={form.street} onChange={(street) => setForm({ ...form, street })} />
                    <Field label="Area" autoComplete="address-level3" value={form.area} onChange={(area) => setForm({ ...form, area })} />
                    <Field label="Landmark (optional)" value={form.landmark} onChange={(landmark) => setForm({ ...form, landmark })} />
                    <Field label="City" autoComplete="address-level2" value={form.city} onChange={(city) => setForm({ ...form, city })} />
                    <Field label="State (optional)" autoComplete="address-level1" value={form.state} onChange={(state) => setForm({ ...form, state })} />
                    <Field
                      label="Pincode"
                      autoComplete="postal-code"
                      inputMode="numeric"
                      value={form.pincode}
                      onChange={(pincode) => setForm({ ...form, pincode: pincode.replace(/\D/g, "").slice(0, 6) })}
                    />
                    <Field label="Email (optional)" autoComplete="email" inputMode="email" value={form.email} onChange={(email) => setForm({ ...form, email })} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-sm text-muted-foreground">Save as</span>
                    {["home", "work", "other"].map((label) => (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={form.label === label}
                        className={cn(
                          "h-10 rounded-lg border px-4 text-sm font-medium capitalize transition-colors",
                          form.label === label ? "border-primary bg-primary/[0.06] text-primary" : "hover:border-foreground/30",
                        )}
                        onClick={() => setForm({ ...form, label })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--primary)]"
                      checked={form.saveAddress}
                      onChange={(event) => setForm({ ...form, saveAddress: event.target.checked })}
                    />
                    Save this address for next time
                  </label>
                </div>
              )}
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="step-slot">
              <h2 id="step-slot" className="text-lg font-bold">Choose a delivery slot</h2>
              {groups === null ? (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : groups.length === 0 ? (
                <EmptyState
                  className="mt-4"
                  title="No delivery slots open"
                  body="All slots are full or closed right now. Please check back a little later."
                />
              ) : (
                <>
                  <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Delivery day">
                    {groups.map((group) => (
                      <button
                        key={group.date}
                        type="button"
                        role="tab"
                        aria-selected={group.date === day}
                        onClick={() => setDay(group.date)}
                        className={cn(
                          "h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold transition-colors",
                          group.date === day ? "border-charcoal bg-charcoal text-white" : "bg-card hover:border-foreground/30",
                        )}
                      >
                        {group.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={`Slots for ${activeGroup?.label || ""}`}>
                    {activeGroup?.slots.map((item) => {
                      const value = `${item.date}|${item.id}`;
                      const selected = slot === value;
                      const low = item.remaining > 0 && item.remaining <= 3;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          disabled={item.remaining <= 0}
                          onClick={() => setSlot(value)}
                          className={cn(
                            "flex min-h-14 flex-col items-start justify-center rounded-xl border px-3.5 py-2 text-left transition-colors duration-150",
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-success/40 bg-success/[0.04] hover:border-success",
                            "disabled:border-border disabled:bg-muted disabled:text-muted-foreground",
                          )}
                        >
                          <span className="text-sm font-semibold">{item.label}</span>
                          <span className={cn("text-[11px]", selected ? "text-white/80" : low ? "text-warning" : "text-success")}>
                            {item.remaining <= 0 ? "Full" : low ? `${item.remaining} left` : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="step-pay" className="space-y-6">
              <div>
                <h2 id="step-pay" className="text-lg font-bold">Payment</h2>
                <div className="mt-3 space-y-2" role="radiogroup" aria-label="Payment method">
                  <PayOption
                    selected={method === "razorpay"}
                    disabled={!settings.onlineReady}
                    onSelect={() => setMethod("razorpay")}
                    icon={CreditCard}
                    title="Pay online"
                    body={settings.onlineReady ? "UPI, cards, net banking or wallets" : "Not available yet"}
                  />
                  {settings.codEnabled && (
                    <PayOption
                      selected={method === "cod"}
                      onSelect={() => setMethod("cod")}
                      icon={Banknote}
                      title="Cash on delivery"
                      body="Pay when your order arrives"
                    />
                  )}
                </div>
                {settings.onlineReady && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-4 text-success" aria-hidden />
                    Payments are processed by Razorpay and confirmed by our server.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="coupon" className="text-sm font-semibold">
                  Coupon
                </Label>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void applyCoupon();
                  }}
                >
                  <Input
                    id="coupon"
                    value={coupon}
                    onChange={(event) => setCoupon(event.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="h-11 uppercase"
                  />
                  <button
                    type="submit"
                    disabled={couponBusy || !coupon.trim()}
                    className="h-11 shrink-0 rounded-xl border px-5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                  >
                    {couponBusy ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                  </button>
                </form>
                {quote?.ok && (
                  <p className="mt-2 text-sm font-medium text-success">
                    {quote.code} applied — you save {formatINR(quote.discount || 0)}
                  </p>
                )}
              </div>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="step-review" className="space-y-3">
              <h2 id="step-review" className="text-lg font-bold">Review your order</h2>
              <ReviewRow title="Deliver to" onEdit={() => setStep(0)}>
                <p className="font-semibold">
                  {form.name} · {form.phone}
                </p>
                <p className="text-muted-foreground">
                  {[form.house, form.building, form.street, form.area, form.city].filter(Boolean).join(", ")} {form.pincode}
                </p>
                {savedAddress && <p className="mt-0.5 text-xs text-muted-foreground capitalize">{savedAddress.label}</p>}
              </ReviewRow>
              <ReviewRow title="Delivery slot" onEdit={() => setStep(1)}>
                <p className="font-semibold">{selectedSlot ? `${selectedSlot.day}, ${selectedSlot.label}` : "Not chosen"}</p>
              </ReviewRow>
              <ReviewRow title="Payment" onEdit={() => setStep(2)}>
                <p className="font-semibold">{method === "cod" ? "Cash on delivery" : "Pay online"}</p>
                {quote?.ok && <p className="text-success">Coupon {quote.code} applied</p>}
              </ReviewRow>
            </section>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-card px-4 py-3 shadow-float md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            <div className="flex items-center gap-3">
              <div className="leading-tight md:hidden">
                <p className="price text-lg font-extrabold">{formatINR(total)}</p>
                <p className="text-xs text-muted-foreground">{cart.count} {cart.count === 1 ? "item" : "items"}</p>
              </div>
              <button
                type="button"
                disabled={busy !== "" || (step === 3 && location.ok === false)}
                onClick={() => (step < 3 ? next() : void place())}
                className="ml-auto inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold tracking-wide text-primary-foreground uppercase transition-colors hover:bg-primary-dark disabled:opacity-60 md:ml-0 md:h-[52px] md:flex-none md:min-w-64"
              >
                {busy !== "" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {actionLabel}
              </button>
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-2xl border bg-card p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-bold">Order summary</h2>
          <ul className="mt-3 space-y-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 text-sm">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.image && <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.weight} × {item.qty}
                  </span>
                </span>
                <span className="price font-semibold">{formatINR(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
            <SummaryRow label="Subtotal" value={formatINR(cart.subtotal)} />
            {discount > 0 && <SummaryRow label="Coupon discount" value={`−${formatINR(discount)}`} success />}
            <SummaryRow label="Delivery fee" value={deliveryFee ? formatINR(deliveryFee) : "Free"} success={!deliveryFee} />
            <div className="flex items-baseline justify-between border-t pt-3">
              <dt className="text-base font-bold">To pay</dt>
              <dd className="price text-2xl font-extrabold">{formatINR(total)}</dd>
            </div>
          </dl>
          {location.pincode && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              Delivering to {location.pincode}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  const id = `f-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div>
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11"
      />
    </div>
  );
}

function PayOption({
  selected,
  disabled,
  onSelect,
  icon: Icon,
  title,
  body,
}: {
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: typeof CreditCard;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-colors",
        selected ? "border-primary ring-1 ring-primary" : "hover:border-foreground/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      <span className={cn("grid size-10 place-items-center rounded-xl", selected ? "bg-primary/10 text-primary" : "bg-muted")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{body}</span>
      </span>
      <span
        className={cn("grid size-5 place-items-center rounded-full border-2", selected ? "border-primary" : "border-border")}
        aria-hidden
      >
        {selected && <span className="size-2.5 rounded-full bg-primary" />}
      </span>
    </button>
  );
}

function ReviewRow({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4 text-sm">
      <div className="min-w-0">
        <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
        {children}
      </div>
      <button type="button" onClick={onEdit} className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/[0.05]">
        Edit
      </button>
    </div>
  );
}

function SummaryRow({ label, value, success }: { label: string; value: string; success?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("price font-medium", success && "text-success")}>{value}</dd>
    </div>
  );
}

