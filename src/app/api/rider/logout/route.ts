import { clearRiderCookie } from "@/lib/auth";
import { handle } from "@/lib/http";

export const POST = handle(async () => {
  await clearRiderCookie();
  return { ok: true };
});
