import assert from "node:assert/strict";
import test from "node:test";
import { computeDeliveryFee, discountPercent, evaluateCoupon, isSlotBookable } from "./pricing";
import { isIndianMobile, isPincode, normalizeMobile } from "./validators";
import type { Coupon } from "./types";

const coupon: Coupon = {
  id: "c",
  code: "WELCOME50",
  type: "flat",
  value: 5000,
  minOrder: 49900,
  maxDiscount: null,
  maxUses: 2,
  usedCount: 0,
  usedBy: [],
  phones: [],
  expiresAt: null,
  active: true,
};

test("discount percent uses MRP and price", () => {
  assert.equal(discountPercent(25900, 27900), 7);
  assert.equal(discountPercent(24900, 24900), 0);
});

test("delivery fee follows the shop threshold", () => {
  assert.equal(computeDeliveryFee(40000, { deliveryFee: 4000, freeDeliveryAbove: 79900 }), 4000);
  assert.equal(computeDeliveryFee(79900, { deliveryFee: 4000, freeDeliveryAbove: 79900 }), 0);
});

test("coupon rules", () => {
  assert.equal(evaluateCoupon(coupon, 40000, "9876543210").ok, false);
  const applied = evaluateCoupon(coupon, 50000, "9876543210");
  assert.equal(applied.ok && applied.discount, 5000);
  assert.match(evaluateCoupon({ ...coupon, active: false }, 50000, "9876543210").ok ? "" : "not active", /not active/);
  assert.match(evaluateCoupon({ ...coupon, expiresAt: "2020-01-01T00:00:00.000Z" }, 50000, "9876543210").ok ? "" : "expired", /expired/);
  assert.match(evaluateCoupon({ ...coupon, usedCount: 2 }, 50000, "9876543210").ok ? "" : "limit", /limit/);
  assert.match(evaluateCoupon({ ...coupon, phones: ["9000000000"] }, 50000, "9876543210").ok ? "" : "account", /account/);
  assert.match(evaluateCoupon({ ...coupon, usedBy: ["9876543210"] }, 50000, "9876543210").ok ? "" : "already", /already/);
});

test("slots hide after cutoff and when full", () => {
  assert.equal(
    isSlotBookable({
      active: true,
      days: [],
      weekday: 3,
      dateKey: "2026-09-30",
      todayKey: "2026-09-30",
      nowMinutes: 17 * 60,
      startMinutes: 18 * 60,
      cutoffMinutes: 90,
      booked: 0,
      capacity: 10,
    }),
    false,
  );
  assert.equal(
    isSlotBookable({
      active: true,
      days: [],
      weekday: 4,
      dateKey: "2026-10-01",
      todayKey: "2026-09-30",
      nowMinutes: 17 * 60,
      startMinutes: 18 * 60,
      cutoffMinutes: 90,
      booked: 10,
      capacity: 10,
    }),
    false,
  );
});

test("indian mobile and pincode", () => {
  assert.equal(normalizeMobile("+91 98765 43210"), "9876543210");
  assert.equal(isIndianMobile("9876543210"), true);
  assert.equal(isIndianMobile("1234567890"), false);
  assert.equal(isPincode("682001"), true);
  assert.equal(isPincode("012345"), false);
});
