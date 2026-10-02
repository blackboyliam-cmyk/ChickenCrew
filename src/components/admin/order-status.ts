import type { OrderStatus, PaymentStatus } from "@/lib/types";
import type { Tone } from "./forms";

export const ORDER_FLOW: OrderStatus[] = ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];

export const STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  pending_payment: { label: "Awaiting payment", tone: "gray" },
  placed: { label: "New", tone: "blue" },
  confirmed: { label: "Confirmed", tone: "blue" },
  preparing: { label: "Preparing", tone: "amber" },
  ready: { label: "Packed", tone: "amber" },
  out_for_delivery: { label: "Out for delivery", tone: "amber" },
  delivered: { label: "Delivered", tone: "green" },
  cancelled: { label: "Cancelled", tone: "red" },
};

export const PAYMENT: Record<PaymentStatus, { label: string; tone: Tone }> = {
  unpaid: { label: "Unpaid", tone: "gray" },
  paid: { label: "Paid", tone: "green" },
  failed: { label: "Payment failed", tone: "red" },
  refund_pending: { label: "Refund due", tone: "amber" },
  refunded: { label: "Refunded", tone: "gray" },
};

export const OPEN_STATUSES: OrderStatus[] = ["placed", "confirmed", "preparing", "ready", "out_for_delivery"];

export function kolkataDay(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function orderTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
