import "server-only";
import { matchesPayment } from "@/lib/saspay";
import { saspay } from "@/lib/saspay-server";
import { serviceDb } from "@/lib/supabase/server";
import { paymentsEnabled } from "@/lib/env";
import { HttpError } from "@/lib/http";
import type { Order } from "@/lib/types";
export async function verifyPayment(order: Order, expectedPaymentId?: string) {
  if (!paymentsEnabled()) throw new HttpError(503, "Paiement non configuré.");
  if (!order.saspay_session_id) return order;
  const db = serviceDb();
  if (!expectedPaymentId) {
    const { data: claim, error } = await db.rpc("claim_payment_check", {
      p_order: order.id,
    });
    if (error) throw error;
    if (!claim) return readOrder(order.id);
  } else {
    const { error } = await db
      .from("orders")
      .update({ payment_checked_at: new Date().toISOString() })
      .eq("id", order.id);
    if (error) throw error;
  }
  const client = saspay();
  const session = await client.checkoutStatus(order.saspay_session_id);
  if (session.id !== order.saspay_session_id)
    throw new HttpError(409, "Session de paiement incohérente");
  const paymentId = session.transaction_id;
  if (!paymentId) {
    if (session.status === "EXPIRED" || session.status === "CANCELLED") {
      const { error } = await db.rpc("fail_training_order", {
        p_order: order.id,
        p_reason: "Session de paiement expirée ou annulée",
        p_status: "expired",
      });
      if (error) throw error;
    }
    return readOrder(order.id);
  }
  if (expectedPaymentId && expectedPaymentId !== paymentId)
    throw new HttpError(409, "Transaction différente de la session");
  const payment = await client.verify(paymentId);
  if (!matchesPayment(payment, order, paymentId))
    throw new HttpError(409, "Le paiement ne correspond pas à la commande.");
  const { error: linkError } = await db
    .from("orders")
    .update({ saspay_payment_id: payment.id })
    .eq("id", order.id)
    .or(`saspay_payment_id.is.null,saspay_payment_id.eq.${payment.id}`);
  if (linkError) throw linkError;
  if (payment.status === "SUCCESS") {
    const { data, error } = await db.rpc("confirm_training_order", {
      p_order: order.id,
      p_payment: payment.id,
    });
    if (error)
      throw new HttpError(503, "Confirmation temporairement indisponible");
    return data as Order;
  }
  if (payment.status === "FAILED" || payment.status === "CANCELLED") {
    const { error } = await db.rpc("fail_training_order", {
      p_order: order.id,
      p_reason:
        payment.status === "CANCELLED"
          ? "Paiement annulé"
          : "Paiement refusé par le prestataire",
      p_status: "failed",
    });
    if (error) throw error;
  }
  return readOrder(order.id);
}
async function readOrder(id: string) {
  const { data, error } = await serviceDb()
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new HttpError(503, "Commande indisponible");
  return data as Order;
}
export async function reconcileWebhook(paymentId: string) {
  const db = serviceDb();
  const { data: known, error } = await db
    .from("orders")
    .select("*")
    .eq("saspay_payment_id", paymentId)
    .maybeSingle();
  if (error) throw error;
  if (known) {
    await verifyPayment(known as Order, paymentId);
    return true;
  }
  const client = saspay();
  // Webhooks omit checkout IDs. Resolve via the documented paginated checkout list.
  for (let page = 1; page <= 10; page++) {
    const list = await client.listCheckouts(page);
    const match = list.results.find((s) => s.transaction === paymentId);
    if (match) {
      const { data: order, error: e } = await db
        .from("orders")
        .select("*")
        .eq("saspay_session_id", match.id)
        .maybeSingle();
      if (e) throw e;
      if (order) await verifyPayment(order as Order, paymentId);
      return true;
    }
    if (!list.next) return true; // Unrelated payment for the same merchant.
  }
  return false; // Keep durable inbox item; order cron can resolve the link independently.
}
export async function drainWebhooks() {
  if (!paymentsEnabled()) return { processed: 0 };
  const db = serviceDb();
  const { data, error } = await db
    .from("webhook_inbox")
    .select("*")
    .eq("processed", false)
    .order("created_at")
    .limit(3);
  if (error) throw error;
  let processed = 0;
  for (const item of data ?? []) {
    try {
      if (await reconcileWebhook(item.payment_id)) {
        const { error: e } = await db
          .from("webhook_inbox")
          .update({ processed: true, error: null })
          .eq("id", item.id);
        if (e) throw e;
        processed++;
      }
    } catch {
      await db
        .from("webhook_inbox")
        .update({
          error: "À réconcilier : vérifier SasPay et relancer le cron",
        })
        .eq("id", item.id);
    }
  }
  return { processed };
}
