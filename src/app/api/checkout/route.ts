import { z } from "zod";
import { site } from "@/config/site";
import { body, failure, HttpError, sameOrigin, rateLimit } from "@/lib/http";
import { serviceDb } from "@/lib/supabase/server";
import { saspay } from "@/lib/saspay-server";
import { paymentsEnabled } from "@/lib/env";
import {
  newOrderAccess,
  accessHash,
  rememberOrder,
  authorizedOrder,
} from "@/lib/order-access";
const schema = z.object({
  attempt_id: z.uuid(),
  session_id: z.uuid(),
  full_name: z.string().trim().min(3).max(120),
  email: z.email().max(254),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  website: z.literal(""),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = await body(request, schema);
    if (!paymentsEnabled())
      throw new HttpError(503, "Les inscriptions ne sont pas encore ouvertes.");
    await rateLimit(request, "checkout", 5);
    const db = serviceDb(),
      token = newOrderAccess(),
      key = input.attempt_id;
    const { data: id, error } = await db.rpc("create_training_order", {
      p_session: input.session_id,
      p_name: input.full_name,
      p_email: input.email,
      p_phone: input.phone,
      p_hash: accessHash(token),
      p_key: key,
      p_amount: site.price,
    });
    if (error)
      throw new HttpError(
        409,
        "Cette session est complète ou fermée. Choisissez une autre session.",
      );
    const { data: stored, error: storedError } = await db
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    if (storedError) throw new HttpError(503, "Commande indisponible");
    if (stored.access_token_hash !== accessHash(token)) {
      // Replays require the order capability cookie. Never replace another browser’s token.
      const original = await authorizedOrder(id);
      if (original.status === "failed" || original.status === "expired")
        throw new HttpError(
          409,
          "Cette tentative est terminée. Consultez votre statut de paiement pour démarrer une nouvelle tentative.",
        );
      if (original.checkout_url)
        return Response.json(
          { checkout_url: original.checkout_url },
          { headers: { "Cache-Control": "no-store" } },
        );
      throw new HttpError(
        409,
        "Cette tentative est déjà en cours. Contactez le support avant de recommencer si vous avez été débité.",
      );
    }
    await rememberOrder(id, token);
    try {
      const result = await saspay().createCheckout(
        {
          amount: site.price.toFixed(2),
          currency: "XOF",
          description: "Formation Importer depuis Alibaba en Afrique",
          customer_name: input.full_name,
          customer_email: input.email,
          customer_phone: input.phone,
          metadata: { order_id: id },
          expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
          return_url: new URL(`/paiement/succes?order=${id}`, site.url).href,
        },
        key,
      );
      const { error: updateError } = await db
        .from("orders")
        .update({
          saspay_session_id: result.id,
          checkout_url: result.checkout_url,
        })
        .eq("id", id);
      if (updateError)
        throw new HttpError(
          503,
          "Commande conservée, mais le paiement nécessite une vérification. Contactez le support.",
        );
      return Response.json(
        { checkout_url: result.checkout_url },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      // A timeout may have created a checkout: keep the order pending and preserve its idempotency key.
      console.error(
        "Création checkout à réconcilier",
        id,
        error instanceof Error ? error.name : "Unknown",
      );
      throw error;
    }
  } catch (error) {
    return failure(error);
  }
}
