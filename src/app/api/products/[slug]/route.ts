import { handle } from "@/lib/http";
import { getProduct } from "@/lib/store";

export const GET = handle(async (_req, ctx) => {
  const { slug } = await ctx.params;
  return getProduct(slug);
});
