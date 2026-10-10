import "server-only";
import { Resend } from "resend";
import { serviceDb } from "@/lib/supabase/server";
import { required } from "@/lib/env";
import { calendar, escapeHtml } from "@/lib/calendar";
import { meetingDate, participant, safeHttps } from "@/lib/format";
import { site } from "@/config/site";
import type { EmailLog, Order, TrainingSession, Meeting } from "@/lib/types";
export async function drainEmails() {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM)
    return { sent: 0, configurationMissing: true };
  const db = serviceDb();
  const { data, error } = await db
    .from("email_logs")
    .select("*")
    .in("status", ["queued", "failed", "sending"])
    .lt("attempts", 5)
    .order("created_at")
    .limit(20);
  if (error) throw error;
  let sent = 0;
  for (const log of (data ?? []) as EmailLog[]) {
    const { data: claimed, error: claimError } = await db.rpc("claim_email", {
      p_id: log.id,
    });
    if (claimError || !claimed) continue;
    try {
      const { data: o, error: oe } = await db
        .from("orders")
        .select("*")
        .eq("id", log.order_id)
        .single();
      if (oe) throw oe;
      const order = o as Order;
      if (log.type === "retry" && order.status !== "failed") {
        await db
          .from("email_logs")
          .update({ status: "skipped", error: "Relance devenue inutile" })
          .eq("id", log.id);
        continue;
      }
      if (
        log.type !== "retry" &&
        (order.status !== "success" ||
          order.manual_review ||
          !order.participant_number)
      ) {
        await db
          .from("email_logs")
          .update({
            status: "failed",
            error: "Commande non confirmée ou à traiter manuellement",
          })
          .eq("id", log.id);
        continue;
      }
      const [{ data: s, error: se }, { data: m, error: me }] =
        await Promise.all([
          db
            .from("training_sessions")
            .select("*")
            .eq("id", order.session_id)
            .single(),
          db
            .from("session_meetings")
            .select("*")
            .eq("session_id", order.session_id)
            .order("meeting_number"),
        ]);
      if (se || me) throw new Error("Session introuvable");
      const session = s as TrainingSession,
        meetings = m as Meeting[],
        retry = log.type === "retry",
        confirmation = log.type.startsWith("confirmation");
      const title = retry
        ? "Votre inscription vous attend"
        : confirmation
          ? "Ton inscription est confirmée"
          : "Rappel : votre séance approche";
      const room = safeHttps(session.meeting_link),
        group = safeHttps(session.whatsapp_group_link);
      const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#0d1110;color:#f5f6ee;font-family:Arial,sans-serif"><div style="max-width:580px;margin:auto;padding:32px"><p style="color:#ffa351">IMPORT AFRIQUE</p><h1 style="font-size:28px">${title}</h1><p>Bonjour ${escapeHtml(order.full_name)},</p>${retry ? `<p>Votre paiement n’a pas abouti. Vous pouvez choisir à nouveau une session disponible.</p><p><a style="color:#ffa351" href="${escapeHtml(new URL(`/checkout?session=${order.session_id}`, site.url).href)}">Réessayer mon inscription</a></p>` : `<p>Votre numéro participant : <strong style="font-size:36px;color:#ffa351">${participant(order.participant_number!)}</strong></p><p>Garde-le précieusement, il t’identifie pendant les séances.</p><ul>${meetings.map((v) => `<li style="margin:12px 0">${escapeHtml(v.title)} : ${escapeHtml(meetingDate(v.starts_at))}</li>`).join("")}</ul><p>Heure de Dakar/Abidjan (GMT).</p>${room ? `<p><a style="color:#ffa351" href="${escapeHtml(room)}">Rejoindre la salle de formation</a></p>` : "<p>Le lien de salle sera communiqué par le formateur.</p>"}${group ? `<p><a style="color:#ffa351" href="${escapeHtml(group)}">Rejoindre le groupe WhatsApp</a></p>` : ""}<p>Prépare un compte email dédié, un téléphone ou un ordinateur et une connexion stable. Note tes questions avant la séance.</p><p><a style="color:#ffa351" href="${escapeHtml(new URL("/app/connexion", site.url).href)}">Accéder à mon application business</a></p>`}</div></body></html>`;
      const { error: sendError } = await new Resend(
        required("RESEND_API_KEY"),
      ).emails.send(
        {
          from: required("EMAIL_FROM"),
          to: order.email,
          subject: title,
          html,
          attachments: confirmation
            ? [
                {
                  filename: "formation.ics",
                  content: Buffer.from(calendar(meetings, room)),
                },
              ]
            : undefined,
        },
        {
          idempotencyKey: `email-${log.id}`,
        },
      );
      if (sendError) throw new Error(sendError.name);
      const { error: saveError } = await db
        .from("email_logs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error: null,
        })
        .eq("id", log.id);
      if (saveError) throw saveError;
      sent++;
    } catch (error) {
      console.error(
        "Email non envoyé",
        log.id,
        error instanceof Error ? error.name : "Unknown",
      );
      await db
        .from("email_logs")
        .update({
          status: "failed",
          error:
            "Échec de l’envoi : vérifier Resend, l’expéditeur et la configuration.",
        })
        .eq("id", log.id);
    }
  }
  return { sent, configurationMissing: false };
}
export async function queueReminders() {
  const db = serviceDb(),
    now = Date.now();
  const { data: meetings, error } = await db
    .from("session_meetings")
    .select("*")
    .gte("starts_at", new Date(now).toISOString())
    .lte("starts_at", new Date(now + 25 * 3600000).toISOString());
  if (error) throw error;
  for (const m of (meetings ?? []) as (Meeting & { session_id: string })[]) {
    for (const hours of [24, 1]) {
      const target = new Date(m.starts_at).getTime() - hours * 3600000;
      if (now < target || now - target > 3600000) continue;
      const { data: orders, error: oe } = await db
        .from("orders")
        .select("id")
        .eq("session_id", m.session_id)
        .eq("status", "success")
        .eq("manual_review", false);
      if (oe) throw oe;
      if (orders?.length) {
        const { error: ie } = await db.from("email_logs").upsert(
          orders.map((o) => ({
            order_id: o.id,
            type: `reminder:${m.id}:${hours}`,
          })),
          { onConflict: "order_id,type", ignoreDuplicates: true },
        );
        if (ie) throw ie;
      }
    }
  }
}
