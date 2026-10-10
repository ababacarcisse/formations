import { requireCron, failure } from "@/lib/http";
import { serviceDb } from "@/lib/supabase/server";
import { paymentsEnabled } from "@/lib/env";
import { verifyPayment, drainWebhooks } from "@/lib/payments";
import { queueReminders, drainEmails } from "@/lib/emails";
import type { Order } from "@/lib/types";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    requireCron(request);
    const db = serviceDb();
    let checked = 0,
      unresolved = 0;
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 15 * 60000).toISOString())
      .order("payment_checked_at", { ascending: true, nullsFirst: true })
      .limit(20);
    if (error) throw error;
    const deadline = Date.now() + 20000;
    for (const order of (data ?? []) as Order[]) {
      if (Date.now() > deadline) break;
      if (order.saspay_session_id && paymentsEnabled()) {
        try {
          await verifyPayment(order);
          checked++;
        } catch {
          unresolved++;
        }
      } else {
        unresolved++;
      }
      if (Date.now() - new Date(order.created_at).getTime() > 24 * 3600000) {
        const { error: e } = await db.rpc("fail_training_order", {
          p_order: order.id,
          p_reason:
            "Délai dépassé ; toute confirmation tardive reste vérifiable",
          p_status: "expired",
        });
        if (e) throw e;
      }
    }
    await queueReminders();
    const emails = await drainEmails();
    if (Date.now() < deadline) await drainWebhooks();
    return Response.json(
      { checked, unresolved, emails },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
