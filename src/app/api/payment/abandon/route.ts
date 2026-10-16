import { json, parseBody, requireUser } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { abandonPendingPayment } from "@/lib/store";
import { cleanText } from "@/lib/validators";

export async function POST(req: Request) {
  return json(req, async () => {
    const user = await requireUser();
    const body = await parseBody<Record<string, unknown>>(req);
    const orderId = cleanText(body.orderId, 80);
    if (!orderId) throw new ApiError(400, "Missing order.");
    return { order: abandonPendingPayment(user.id, orderId) };
  });
}
