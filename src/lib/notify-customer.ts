import "server-only";

import { waLink } from "./whatsapp";
import type { Order, OrderStatus } from "./types";

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://karthikachickencentre.shop").replace(/\/$/, "");

/** Statuses that should ping the customer. */
export const CUSTOMER_NOTIFY_STATUSES: OrderStatus[] = [
  "placed",
  "confirmed",
  "out_for_delivery",
  "delivered",
];

export function customerStatusMessage(order: Pick<Order, "id" | "number" | "address" | "slot" | "status">, status: OrderStatus = order.status) {
  const first = order.address.name.split(" ")[0] || "there";
  const track = `${SITE()}/orders/${order.id}`;
  switch (status) {
    case "placed":
    case "confirmed":
      return `Hi ${first}, your ChickenCrew order #${order.number} is confirmed for ${order.slot.label}. Track it here: ${track}`;
    case "preparing":
    case "ready":
      return `Hi ${first}, we're packing your ChickenCrew order #${order.number} now. Track: ${track}`;
    case "out_for_delivery":
      return `Hi ${first}, your ChickenCrew order #${order.number} is on the way! Live tracking: ${track}`;
    case "delivered":
      return `Hi ${first}, your ChickenCrew order #${order.number} was delivered. How was it? Leave a quick rating: ${track}?review=1`;
    default:
      return `Hi ${first}, this is ChickenCrew about your order #${order.number}. Track: ${track}`;
  }
}

export function customerStatusWaLink(phone: string, order: Pick<Order, "id" | "number" | "address" | "slot" | "status">, status?: OrderStatus) {
  return waLink(phone, customerStatusMessage(order, status || order.status));
}

/**
 * Optional Meta WhatsApp Cloud API send. Needs WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID.
 * Free-form text only works inside the 24h customer-care window; otherwise configure a template.
 */
export async function sendWhatsAppText(phone: string, text: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneId) return false;
  const digits = phone.replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;
  if (!to) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text.slice(0, 4000) },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("WhatsApp send failed", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (error) {
    console.error("WhatsApp send failed", error);
    return false;
  }
}
