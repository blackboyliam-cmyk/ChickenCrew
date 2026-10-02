import { readUserId } from "@/lib/auth";
import { ApiError } from "@/lib/errors";
import { handle, readJson } from "@/lib/http";
import { getUser, publicUser, updateProfile } from "@/lib/store";

export const GET = handle(async () => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const user = getUser(userId);
  if (!user) throw new ApiError(401, "Please log in to continue.");
  return { user: publicUser(user) };
});

export const PUT = handle(async (req) => {
  const userId = await readUserId();
  if (!userId) throw new ApiError(401, "Please log in to continue.");
  const body = await readJson(req);
  return { user: updateProfile(userId, { name: String(body.name || ""), email: String(body.email || "") }) };
});
