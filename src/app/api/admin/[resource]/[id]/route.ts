import { isAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import {
  adminDeleteOffer,
  adminDeleteProduct,
  adminSaveCategory,
  adminSaveCoupon,
  adminSaveOffer,
  adminSaveProduct,
  adminSaveSlot,
  adminUpdateOrder,
} from "@/lib/store";

async function guard() {
  if (!(await isAdmin())) throw new ApiError(401, "Please sign in to the shop admin.");
}

export const PUT = handle(async (req, ctx) => {
  await guard();
  const { resource, id } = await ctx.params;
  const body = await readJson(req);
  if (resource === "products") return { product: adminSaveProduct(body, id) };
  if (resource === "categories") return { category: adminSaveCategory(body, id) };
  if (resource === "offers") return { offer: adminSaveOffer(body, id) };
  if (resource === "coupons") return { coupon: adminSaveCoupon(body, id) };
  if (resource === "slots") return { slot: adminSaveSlot(body, id) };
  if (resource === "orders") return { order: adminUpdateOrder(id, String(body.status || "")) };
  throw new ApiError(404, "Not found.");
});

export const DELETE = handle(async (_req, ctx) => {
  await guard();
  const { resource, id } = await ctx.params;
  if (resource === "products") return adminDeleteProduct(id);
  if (resource === "offers") return adminDeleteOffer(id);
  throw new ApiError(404, "Not found.");
});
