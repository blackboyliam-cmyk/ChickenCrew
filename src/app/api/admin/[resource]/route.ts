import { isAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import {
  adminCustomers,
  adminListCategories,
  adminListCoupons,
  adminListOffers,
  adminListOrders,
  adminListProducts,
  adminListSlots,
  adminSaveCategory,
  adminSaveCoupon,
  adminSaveOffer,
  adminSaveProduct,
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
  throw new ApiError(404, "Not found.");
});
