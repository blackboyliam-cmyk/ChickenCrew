import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Mark } from "@/components/site/logo";
import { PrintButton } from "@/components/site/print-button";
import { isAdmin, readUserId } from "@/lib/auth";
import { amountInWords } from "@/lib/bill";
import { formatINR } from "@/lib/money";
import { getBill, withDb } from "@/lib/store";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Bill", robots: { index: false, follow: false } };

const dateTime = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

function paymentLine(order: Order) {
  if (order.paymentStatus === "refunded") return "Refunded";
  if (order.paymentStatus === "refund_pending") return "Refund in progress";
  if (order.paymentMethod === "razorpay") {
    return order.paymentStatus === "paid" ? `Paid online${order.razorpayPaymentId ? ` · Ref ${order.razorpayPaymentId}` : ""}` : "Online payment not received";
  }
  if (order.paymentStatus === "paid") return order.collection?.mode === "upi" ? "Paid by UPI on delivery" : "Paid in cash on delivery";
  return "Cash on delivery · to be collected";
}

export default async function BillPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ size?: string; print?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [userId, admin] = await Promise.all([readUserId(), isAdmin()]);
  if (!userId && !admin) redirect(`/login?next=${encodeURIComponent(`/bill/${id}`)}`);
  const bill = await withDb(() => getBill(id, { userId, admin }));
  if (!bill) notFound();

  const { order, settings } = bill;
  const receipt = query.size === "80mm";
  const address = order.address;
  const cancelled = order.status === "cancelled";
  const shopAddress = [settings.addressLine, settings.area, settings.city, [settings.state, settings.pincode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const sizeLink = (size: "a4" | "80mm") => `/bill/${order.id}${size === "80mm" ? "?size=80mm" : ""}`;

  return (
    <div className="min-h-screen bg-[#f6f4f0] py-6 print:bg-white print:py-0">
      <style>{receipt ? "@page { size: 80mm auto; margin: 3mm; }" : "@page { size: A4; margin: 12mm; }"}</style>

      <div className={cn("mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 px-4 print:hidden", receipt ? "max-w-md" : "max-w-3xl")}>
        <Link href={admin && !userId ? "/admin/orders" : `/orders/${order.id}`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
          ← Back to order
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border bg-card p-1 text-xs font-semibold">
            <Link href={sizeLink("a4")} className={cn("rounded-lg px-3 py-1.5", !receipt ? "bg-charcoal text-white" : "hover:bg-muted")}>
              A4
            </Link>
            <Link href={sizeLink("80mm")} className={cn("rounded-lg px-3 py-1.5", receipt ? "bg-charcoal text-white" : "hover:bg-muted")}>
              Receipt
            </Link>
          </div>
          <PrintButton auto={query.print === "1"} />
        </div>
      </div>

      <article
        className={cn(
          "relative mx-auto bg-white text-[#1c1917] shadow-card print:shadow-none",
          receipt ? "max-w-[80mm] px-3 py-4 text-[11px] leading-snug" : "max-w-3xl rounded-2xl p-8 text-sm md:p-10 print:rounded-none print:p-0",
        )}
      >
        {cancelled && (
          <span className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -rotate-12 rounded-lg border-4 border-destructive/70 px-4 py-1 text-3xl font-black tracking-widest text-destructive/70 uppercase">
            Cancelled
          </span>
        )}

        <header className={cn(receipt ? "text-center" : "flex items-start justify-between gap-6 border-b pb-6")}>
          <div className={cn(receipt && "flex flex-col items-center")}>
            <div className="flex items-center gap-2">
              {!receipt && (
                <span className="grid size-10 place-items-center rounded-xl bg-primary text-white print:border print:border-primary print:bg-white print:text-primary">
                  <Mark />
                </span>
              )}
              <span>
                <span className={cn("block font-extrabold tracking-tight", receipt ? "text-sm" : "text-lg")}>{settings.name}</span>
                {settings.brand && !receipt && <span className="block text-xs text-muted-foreground">{settings.brand}</span>}
              </span>
            </div>
            <p className={cn("mt-2 text-muted-foreground", receipt ? "text-[10px]" : "max-w-xs text-xs")}>{shopAddress}</p>
            <p className={cn("text-muted-foreground", receipt ? "text-[10px]" : "text-xs")}>
              {[settings.phone && `Ph ${settings.phone}`, settings.email].filter(Boolean).join(" · ")}
            </p>
            {(settings.gstin || settings.fssai) && (
              <p className={cn("mt-1 font-medium", receipt ? "text-[10px]" : "text-xs")}>
                {[settings.gstin && `GSTIN ${settings.gstin}`, settings.fssai && `FSSAI Lic. ${settings.fssai}`].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className={cn(receipt ? "mt-3 border-y border-dashed py-2" : "text-right")}>
            <p className={cn("font-black tracking-wide uppercase", receipt ? "text-xs" : "text-xl")}>
              {settings.gstin ? "Bill of supply" : "Bill"}
            </p>
            <p className="mt-1">
              No. <span className="font-semibold">{order.number}</span>
            </p>
            <p className="text-muted-foreground">{dateTime.format(new Date(order.createdAt))}</p>
          </div>
        </header>

        <section className={cn("grid gap-4", receipt ? "mt-3" : "mt-6 sm:grid-cols-2")}>
          <div>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Billed to</p>
            <p className="mt-1 font-semibold">{address.name}</p>
            <p className="text-muted-foreground">
              {[address.house, address.building, address.street, address.area, address.landmark, address.city, address.state].filter(Boolean).join(", ")}{" "}
              {address.pincode}
            </p>
            <p className="text-muted-foreground">Ph {address.phone || order.phone}</p>
          </div>
          <div className={cn(!receipt && "sm:text-right")}>
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Delivery</p>
            <p className="mt-1 font-semibold">
              {order.slot.date} · {order.slot.label}
            </p>
            {order.deliveredAt && <p className="text-muted-foreground">Delivered {dateTime.format(new Date(order.deliveredAt))}</p>}
          </div>
        </section>

        <table className={cn("w-full border-collapse", receipt ? "mt-3" : "mt-6")}>
          <thead>
            <tr className={cn("border-y text-left text-[10px] tracking-widest text-muted-foreground uppercase", receipt && "border-dashed")}>
              {!receipt && <th className="py-2 pr-2 font-bold">#</th>}
              <th className="py-2 pr-2 font-bold">Item</th>
              <th className="py-2 pr-2 text-right font-bold">Qty</th>
              {!receipt && <th className="py-2 pr-2 text-right font-bold">Rate</th>}
              <th className="py-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.variantId}-${index}`} className={cn("border-b align-top", receipt && "border-dashed")}>
                {!receipt && <td className="py-2 pr-2 text-muted-foreground">{index + 1}</td>}
                <td className="py-2 pr-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="block text-muted-foreground">
                    {item.weight}
                    {receipt && ` @ ${formatINR(item.unitPrice)}`}
                  </span>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{item.qty}</td>
                {!receipt && <td className="py-2 pr-2 text-right tabular-nums">{formatINR(item.unitPrice)}</td>}
                <td className="py-2 text-right font-medium tabular-nums">{formatINR(item.unitPrice * item.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={cn("flex", receipt ? "mt-2" : "mt-4 justify-end")}>
          <dl className={cn("space-y-1 tabular-nums", receipt ? "w-full" : "w-full max-w-xs")}>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                <dd>−{formatINR(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery fee</dt>
              <dd>{order.deliveryFee ? formatINR(order.deliveryFee) : "Free"}</dd>
            </div>
            <div className={cn("flex justify-between border-t pt-1.5 font-extrabold", receipt ? "border-dashed text-sm" : "text-base")}>
              <dt>Total</dt>
              <dd>{formatINR(order.total)}</dd>
            </div>
          </dl>
        </div>

        <p className={cn("text-muted-foreground italic", receipt ? "mt-2 text-[10px]" : "mt-3 text-right text-xs")}>{amountInWords(order.total)}</p>

        <p className={cn("rounded-lg bg-muted font-semibold print:bg-transparent print:px-0", receipt ? "mt-3 px-2 py-1.5 text-center" : "mt-6 px-4 py-2.5")}>
          {paymentLine(order)}
        </p>

        <footer className={cn("text-center text-muted-foreground", receipt ? "mt-4 text-[10px]" : "mt-10 border-t pt-4 text-xs")}>
          <p className="font-semibold text-foreground">Thank you for ordering from {settings.name}!</p>
          <p className="mt-0.5">This is a computer-generated bill and needs no signature.</p>
        </footer>
      </article>
    </div>
  );
}
