import { readUserId } from "@/lib/auth";
import { handle } from "@/lib/http";
import { getUser, publicUser } from "@/lib/store";

export const GET = handle(async () => {
  const userId = await readUserId();
  if (!userId) return { user: null };
  const user = getUser(userId);
  return { user: user ? publicUser(user) : null };
});
