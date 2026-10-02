import { clientIp, handle, rateLimit, readJson } from "@/lib/http";
import { recordAnalytics } from "@/lib/store";

export const POST = handle(async (req) => {
  rateLimit(`analytics:${clientIp(req)}`, 60, 60 * 1000);
  const body = await readJson(req);
  return recordAnalytics(String(body.event || ""), (body.props || {}) as Record<string, unknown>);
});
