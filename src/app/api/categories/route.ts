import { handle } from "@/lib/http";
import { listCategories } from "@/lib/store";

export const GET = handle(async () => listCategories());
