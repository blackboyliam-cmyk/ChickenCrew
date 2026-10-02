import { readUserId } from "@/lib/auth";
import { handle } from "@/lib/http";
import { getUser, listPublicCoupons } from "@/lib/store";

export const GET = handle(async () => {
  const userId = await readUserId();
  const user = userId ? getUser(userId) : null;
  return { coupons: listPublicCoupons(user?.phone || null) };
});
