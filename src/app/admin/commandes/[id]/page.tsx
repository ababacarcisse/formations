import { z } from "zod";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { ActionForm } from "@/components/action-form";
import { orderAction } from "@/lib/admin-actions";
import {
  participant,
  money,
  meetingDate,
  orderStatus,
  eventLabel,
  emailStatus,
  emailType,
} from "@/lib/format";
import type { Order } from "@/lib/types";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ data: o, error }, { data: events }, { data: emails }] =
    await Promise.all([
      db.from("orders").select("*").eq("id", id).maybeSingle(),
      db
        .from("order_events")
        .select("*")
        .eq("order_id", id)
        .order("created_at"),
      db.from("email_logs").select("*").eq("order_id", id).order("created_at"),
    ]);
  if (error) throw new Error("Commande indisponible");
  if (!o) notFound();
  const order = o as Order;
  return (
    <main id="contenu" className="container section">
      <AdminNav />
      <h1>{order.full_name}</h1>
      <div className="grid two">
        <article className="card">
          <p>
            {order.email} · {order.phone}
          </p>
          <h2>{money(order.amount)}</h2>
          <p>Statut : {orderStatus[order.status]}</p>
          <p>
            Participant :{" "}
            {order.participant_number
              ? participant(order.participant_number)
              : "Non attribué"}
          </p>
          <p>{order.failure_reason}</p>
          {order.manual_review && (
            <div className="alert">
              Session complète : paiement reçu, solution à convenir avec le
              client.
            </div>
          )}
          <p>ID paiement : {order.saspay_payment_id ?? "Non reçu"}</p>
        </article>
        <article className="card">
          <ActionForm action={orderAction} label="Appliquer l’action">
            <input name="id" type="hidden" value={id} />
            <label>
              Action
              <select name="action">
                <option value="verify">Revérifier auprès de SasPay</option>
                <option value="resend">Renvoyer l’email de confirmation</option>
                <option value="manual">
                  Valider le paiement reçu hors ligne / résoudre l’alerte
                </option>
                <option value="refund">
                  Marquer remboursé (ne déclenche pas de transfert)
                </option>
              </select>
            </label>
            <label className="checkbox">
              <input type="checkbox" name="confirm" />
              Je confirme avoir constaté le paiement ou effectué le
              remboursement.
            </label>
          </ActionForm>
        </article>
      </div>
      <h2 className="mt">Historique</h2>
      {events?.map((e) => (
        <p key={e.id}>
          {meetingDate(e.created_at)} —{" "}
          {eventLabel[e.action] ?? "Action enregistrée"}
        </p>
      ))}
      <h2 className="mt">Emails</h2>
      {emails?.map((e) => (
        <p key={e.id}>
          {emailType(e.type)} : {emailStatus[e.status]} ({e.attempts} essai(s)){" "}
          {e.error}
        </p>
      ))}
    </main>
  );
}
