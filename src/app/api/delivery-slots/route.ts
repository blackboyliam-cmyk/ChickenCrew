import { handle } from "@/lib/http";
import { listDeliverySlots } from "@/lib/store";

export const GET = handle(async () => ({ groups: listDeliverySlots() }));
