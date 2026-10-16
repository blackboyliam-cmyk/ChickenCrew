import { readUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { abandonPendingPayment } from "@/lib/store";
import { cleanText } from "@/lib/validators";

export const POST = handle(async (req) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const body = await readJson(req);
  const orderId = cleanText(body.orderId, 80);
  if (!orderId) throw new ApiError(400, "Missing order.");
  return { order: abandonPendingPayment(userId, orderId) };
});
