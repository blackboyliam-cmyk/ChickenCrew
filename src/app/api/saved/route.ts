import { readUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { listSaved, toggleSaved } from "@/lib/store";
import { cleanText } from "@/lib/validators";

export const GET = handle(async () => {
  const userId = await readUserId();
  if (!userId) return { products: [] };
  return { products: listSaved(userId) };
});

export const POST = handle(async (req) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const body = await readJson(req);
  return toggleSaved(userId, cleanText(body.productId, 40));
});
