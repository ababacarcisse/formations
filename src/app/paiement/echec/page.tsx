import Link from "next/link";
import { privateMetadata } from "@/lib/seo";
export const metadata = { ...privateMetadata, title: "Paiement non abouti" };
export default function Failure() {
  return (
    <main id="contenu" className="container section legal">
      <h1>Votre paiement n’a pas abouti.</h1>
      <p>
        Si votre compte a été débité, consultez votre email ou le support avant
        de recommencer. Une confirmation peut prendre quelques instants.
      </p>
      <Link className="button" href="/checkout">
        Réessayer mon inscription
      </Link>
    </main>
  );
}
