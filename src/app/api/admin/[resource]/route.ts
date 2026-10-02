import { isAdmin } from "@/lib/auth";
import { loadRiderLocations } from "@/lib/db-backend";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import {
  adminCustomers,
  adminListCategories,
  adminListCoupons,
  adminListOffers,
  adminListOrders,
  adminListProducts,
  adminListRiders,
  adminListSlots,
  adminOrderFeed,
  adminSaveCategory,
  adminSaveCoupon,
  adminSaveOffer,
  adminSaveProduct,
  adminSaveRider,
  adminSaveSlot,
  adminUpdateSettings,
  getSettingsAdmin,
} from "@/lib/store";

async function guard() {
  if (!(await isAdmin())) throw new ApiError(401, "Please sign in to the shop admin.");
}

export const GET = handle(async (_req, ctx) => {
  await guard();
  const { resource } = await ctx.params;
  if (resource === "products") return { products: adminListProducts() };
  if (resource === "categories") return { categories: adminListCategories() };
  if (resource === "offers") return { offers: adminListOffers() };
  if (resource === "coupons") return { coupons: adminListCoupons() };
  if (resource === "slots") return { slots: adminListSlots() };
  if (resource === "orders") return { orders: adminListOrders() };
  if (resource === "customers") return { customers: adminCustomers() };
  if (resource === "settings") return { settings: getSettingsAdmin() };
  if (resource === "order-feed") return { orders: adminOrderFeed() };
  if (resource === "riders") {
    const riders = adminListRiders();
    return { riders, locations: await loadRiderLocations(riders.map((rider) => rider.id)) };
  }
  throw new ApiError(404, "Not found.");
});

export const POST = handle(async (req, ctx) => {
  await guard();
  const { resource } = await ctx.params;
  const body = await readJson(req);
  if (resource === "products") return { product: adminSaveProduct(body) };
  if (resource === "categories") return { category: adminSaveCategory(body) };
  if (resource === "offers") return { offer: adminSaveOffer(body) };
  if (resource === "coupons") return { coupon: adminSaveCoupon(body) };
  if (resource === "slots") return { slot: adminSaveSlot(body) };
  if (resource === "settings") return { settings: adminUpdateSettings(body) };
  if (resource === "riders") return { rider: adminSaveRider(body) };
  throw new ApiError(404, "Not found.");
});
