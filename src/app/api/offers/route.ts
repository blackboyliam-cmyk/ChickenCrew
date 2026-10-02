import { handle } from "@/lib/http";
import { listOffers } from "@/lib/store";

export const GET = handle(async () => listOffers());
