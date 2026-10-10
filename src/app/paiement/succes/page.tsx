import { verifyPayment } from "@/lib/payments";
import { paymentsEnabled } from "@/lib/env";
import Link from "next/link";
import { privateMetadata } from "@/lib/seo";
import { authorizedOrder, orderView } from "@/lib/order-access";
import { PaymentStatus } from "@/components/payment-status";
export const metadata = {
  ...privateMetadata,
  title: "Statut de votre paiement",
};
export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: id } = await searchParams;
  let view;
  try {
    let order = await authorizedOrder(id ?? "");
    if (order.status === "pending" && paymentsEnabled()) {
      try {
        order = await verifyPayment(order);
      } catch {
        /* Show persisted state and keep polling. */
      }
    }
    view = await orderView(order);
  } catch {
    /* Do not reveal whether an arbitrary order ID exists. */
  }
  return (
    <main id="contenu" className="container section legal">
      <p className="eyebrow">INSCRIPTION</p>
      <h1>Votre paiement</h1>
      {view ? (
        <PaymentStatus initial={view} />
      ) : (
        <div className="card">
          <h2>Confirmation privée</h2>
          <p>
            Ouvrez cette page depuis le navigateur utilisé pour votre paiement.
            Vous pouvez aussi retrouver la confirmation dans votre email.
          </p>
          <Link href="/" className="button">
            Retour à la formation
          </Link>
        </div>
      )}
    </main>
  );
}
