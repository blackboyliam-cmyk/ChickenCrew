import { readUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { createAddress, listAddresses, type AddressInput } from "@/lib/store";

export const GET = handle(async () => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  return { addresses: listAddresses(userId) };
});

export const POST = handle(async (req) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const body = await readJson(req);
  return { address: createAddress(userId, body as AddressInput) };
});
