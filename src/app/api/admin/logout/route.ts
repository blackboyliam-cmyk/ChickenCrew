import { clearAdminCookie } from "@/lib/auth";
import { handle } from "@/lib/http";

export const POST = handle(async () => {
  await clearAdminCookie();
  return { ok: true };
});
