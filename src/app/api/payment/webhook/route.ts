import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { markOrderPaid, markPaymentFailed, withDb } from "@/lib/store";

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Payment could not be verified." }, { status: 400 });
  }
  const event = JSON.parse(raw) as {
    event?: string;
    payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
  };
  const payment = event.payload?.payment?.entity;
  await withDb(() => {
    if (payment?.order_id && payment.id && event.event === "payment.captured") {
      markOrderPaid(payment.order_id, payment.id);
    }
    if (payment?.order_id && event.event === "payment.failed") {
      markPaymentFailed(payment.order_id);
    }
  });
  return NextResponse.json({ ok: true });
}
