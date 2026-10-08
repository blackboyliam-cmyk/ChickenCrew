import { isAdmin } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { adminPushStatus, adminPushSubscribe, adminPushTest, adminPushUnsubscribe } from "@/lib/store";

async function guard() {
  if (!(await isAdmin())) throw new ApiError(401, "Please sign in to the shop admin.");
}

export const GET = handle(async () => {
  await guard();
  return adminPushStatus();
});

export const POST = handle(async (req) => {
  await guard();
  const body = await readJson(req);
  if (body.action === "test") return adminPushTest(String(body.endpoint || ""));
  return adminPushSubscribe(body);
});

export const DELETE = handle(async (req) => {
  await guard();
  const body = await readJson(req);
  return adminPushUnsubscribe(String(body.endpoint || ""));
});
