import { after } from "next/server";
import { drainEmails } from "@/lib/emails";
import { verifyPayment } from "@/lib/payments";
import { paymentsEnabled } from "@/lib/env";
import { authorizedOrder, orderView } from "@/lib/order-access";
import { failure } from "@/lib/http";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let order = await authorizedOrder(id);
    if (order.status === "pending" && paymentsEnabled()) {
      try {
        order = await verifyPayment(order);
      } catch {
        /* Preserve pending; the cron retries. */
      }
    }
    if (order.status === "success")
      after(async () => {
        try {
          await drainEmails();
        } catch {
          console.error("Emails reportés au cron");
        }
      });
    return Response.json(await orderView(order), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
