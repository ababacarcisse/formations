import Link from "next/link";
import { privateMetadata } from "@/lib/seo";
import { publicSessions } from "@/lib/sessions";
import { paymentsEnabled } from "@/lib/env";
import { CheckoutForm } from "@/components/checkout-form";
import { authorizedOrder } from "@/lib/order-access";
import { verifyPayment } from "@/lib/payments";
import type { Order } from "@/lib/types";
export const metadata = {
  ...privateMetadata,
  title: "Inscription à la formation",
};
export const dynamic = "force-dynamic";
export default async function Checkout({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; retry?: string }>;
}) {
  const [{ session, retry }, { sessions }] = await Promise.all([
    searchParams,
    publicSessions(),
  ]);
  let previous: Order | undefined;
  if (retry) {
    try {
      const order = await authorizedOrder(retry);
      const verified = paymentsEnabled() ? await verifyPayment(order) : order;
      if (verified.status === "failed" || verified.status === "expired")
        previous = verified;
    } catch {
      /* Do not infer an outcome from a query parameter or failed verification. */
    }
  }
  const initial =
    sessions.find(
      (s) => s.id === (previous?.session_id ?? session) && s.remaining > 0,
    )?.id ??
    sessions.find((s) => s.remaining > 0)?.id ??
    "";
  return (
    <main id="contenu" className="container section">
      <p className="eyebrow">INSCRIPTION</p>
      <h1>Votre prochain pas commence ici.</h1>
      {retry && !previous ? (
        <div className="card">
          <h2>Vérifiez d’abord votre précédent paiement.</h2>
          <p>
            Une nouvelle tentative ne doit pas commencer si le paiement est
            encore en attente ou déjà confirmé. Consultez son statut dans le
            navigateur utilisé pour l’inscription.
          </p>
          <Link
            className="button"
            href={`/paiement/succes?order=${encodeURIComponent(retry)}`}
          >
            Consulter mon paiement
          </Link>
        </div>
      ) : sessions.length ? (
        <CheckoutForm
          sessions={sessions}
          initial={initial}
          enabled={paymentsEnabled()}
          retryNonce={previous?.id}
          customer={
            previous
              ? {
                  full_name: previous.full_name,
                  email: previous.email,
                  phone: previous.phone,
                }
              : undefined
          }
        />
      ) : (
        <div className="card">
          <p>Aucune session ouverte pour le moment.</p>
          <Link href="/#sessions" className="button">
            Être informé de la prochaine session
          </Link>
        </div>
      )}
    </main>
  );
}
