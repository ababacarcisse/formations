import { authorizedOrder } from "@/lib/order-access";
import { failure, sameOrigin } from "@/lib/http";
import { serviceDb } from "@/lib/supabase/server";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { id } = await params;
    const order = await authorizedOrder(id);
    const { data, error } = await serviceDb().rpc("claim_purchase_event", {
      p_order: order.id,
    });
    if (error) throw error;
    return Response.json(
      {
        claimed: Boolean(data),
        transaction_id: order.id,
        value: order.amount,
        currency: order.currency,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
