import { formatINR } from "./money";
import type { Coupon } from "./types";

export function discountPercent(price: number, mrp: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(mrp) || mrp <= price || mrp <= 0) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

export function computeDeliveryFee(
  payablePaise: number,
  settings: { deliveryFee: number; freeDeliveryAbove: number | null },
): number {
  if (settings.freeDeliveryAbove != null && payablePaise >= settings.freeDeliveryAbove) return 0;
  return Math.max(0, settings.deliveryFee);
}

export type CouponResult = { ok: true; discount: number } | { ok: false; message: string };

export function evaluateCoupon(
  coupon: Coupon,
  subtotal: number,
  phone: string | null,
  now = Date.now(),
): CouponResult {
  if (!coupon.active) return { ok: false, message: "This coupon is not active." };
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) {
    return { ok: false, message: "This coupon has expired." };
  }
  if (subtotal < coupon.minOrder) {
    return {
      ok: false,
      message: `Minimum order of ${formatINR(coupon.minOrder)} is not met.`,
    };
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, message: "This coupon has reached its usage limit." };
  }
  if (coupon.phones.length > 0 && (!phone || !coupon.phones.includes(phone))) {
    return { ok: false, message: "This coupon is not available on this account." };
  }
  if (phone && coupon.usedBy.includes(phone)) {
    return { ok: false, message: "You have already used this coupon." };
  }
  let discount = coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.max(0, Math.min(discount, subtotal));
  if (discount <= 0) return { ok: false, message: "This coupon does not apply to this order." };
  return { ok: true, discount };
}

export function isSlotBookable(args: {
  active: boolean;
  days: number[];
  weekday: number;
  dateKey: string;
  todayKey: string;
  nowMinutes: number;
  startMinutes: number;
  cutoffMinutes: number;
  booked: number;
  capacity: number;
}): boolean {
  if (!args.active) return false;
  if (args.capacity <= 0) return false;
  if (args.days.length > 0 && !args.days.includes(args.weekday)) return false;
  if (args.booked >= args.capacity) return false;
  if (args.dateKey < args.todayKey) return false;
  if (args.dateKey === args.todayKey && args.nowMinutes + args.cutoffMinutes > args.startMinutes) return false;
  return true;
}
