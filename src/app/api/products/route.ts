import { handle } from "@/lib/http";
import { listProducts } from "@/lib/store";

export const GET = handle(async (req) => {
  const url = new URL(req.url);
  return listProducts(Object.fromEntries(url.searchParams));
});
