import { after } from "next/server";
import { z } from "zod";
import { failure, HttpError } from "@/lib/http";
import { required } from "@/lib/env";
import { validWebhook } from "@/lib/webhook-signature";
import { serviceDb } from "@/lib/supabase/server";
import { drainWebhooks } from "@/lib/payments";
import { drainEmails } from "@/lib/emails";
const schema = z.object({
  event: z.string().max(100),
  data: z.record(z.string(), z.unknown()),
});
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 20000)
      throw new HttpError(413, "Corps trop volumineux");
    const raw = await request.text();
    if (raw.length > 20000) throw new HttpError(413, "Corps trop volumineux");
    if (
      !validWebhook(
        raw,
        request.headers.get("x-webhook-signature") ?? "",
        request.headers.get("x-webhook-timestamp") ?? "",
        required("SASPAY_WEBHOOK_SECRET"),
      )
    )
      throw new HttpError(403, "Signature ou horodatage invalide");
    let parsed;
    try {
      parsed = schema.parse(JSON.parse(raw));
    } catch {
      throw new HttpError(400, "Événement invalide");
    }
    if (request.headers.get("x-webhook-event") !== parsed.event)
      throw new HttpError(400, "En-tête événement incohérent");
    if (parsed.event === "webhook.test")
      return Response.json({ received: true });
    if (
      ![
        "transaction.created",
        "transaction.success",
        "transaction.failed",
        "transaction.cancelled",
      ].includes(parsed.event)
    )
      return Response.json({ received: true });
    const paymentId = z.uuid().safeParse(parsed.data.id);
    if (!paymentId.success)
      throw new HttpError(400, "Identifiant paiement invalide");
    const { error } = await serviceDb()
      .from("webhook_inbox")
      .upsert(
        {
          id: `${parsed.event}:${paymentId.data}`,
          payment_id: paymentId.data,
          event: parsed.event,
        },
        { onConflict: "id", ignoreDuplicates: true },
      );
    if (error) throw new HttpError(503, "Réception à réessayer");
    after(async () => {
      try {
        await drainWebhooks();
        await drainEmails();
      } catch {
        console.error("Traitement webhook reporté au cron");
      }
    });
    return Response.json({ received: true });
  } catch (error) {
    return failure(error);
  }
}
