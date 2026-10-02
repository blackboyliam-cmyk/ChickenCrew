import { handle, readJson } from "@/lib/http";
import { checkPincode } from "@/lib/store";
import { cleanText } from "@/lib/validators";

export const POST = handle(async (req) => {
  const body = await readJson(req);
  return checkPincode(cleanText(body.pincode, 6));
});
