import { site } from "@/config/site";
import { privateMetadata, publicMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";
export const metadata = site.legalComplete
  ? publicMetadata(
      "Conditions générales de vente | Import Afrique",
      "Informations relatives à la formation Importer depuis Alibaba en Afrique.",
      "/cgv",
    )
  : { ...privateMetadata, title: "Conditions générales de vente" };
export default function Page() {
  return (
    <LegalPage title="Conditions générales de vente">
      <h2>La formation et son prix</h2>
      <p>
        « Importer depuis Alibaba en Afrique » est une formation en français
        composée de trois séances en direct et en ligne, au prix de{" "}
        {site.price.toLocaleString("fr-FR")} FCFA (XOF). Les achats de produits,
        échantillons, transports et droits de douane ne sont pas inclus.
      </p>
      <h2>Inscription et paiement</h2>
      <p>
        Le participant choisit une session ouverte et renseigne ses coordonnées.
        Le paiement est effectué sur la page sécurisée SasPay. L’inscription est
        confirmée uniquement après vérification du paiement côté serveur. Si la
        capacité est atteinte à cet instant, le formateur contacte le
        participant pour convenir d’une solution.
      </p>
      <h2>Participation et accès</h2>
      <p>
        Les horaires sont indiqués en heure de Dakar/Abidjan (GMT). Les liens de
        salle et de groupe sont communiqués aux participants confirmés. Une
        connexion internet stable est nécessaire. [Modalités en cas d’absence,
        report, annulation ou indisponibilité du formateur à compléter.]
      </p>
      <h2>Application bonus</h2>
      <p>
        Les acheteurs confirmés peuvent accéder à l’application business avec
        l’email de leur commande. [Durée d’accès, modalités de maintenance et
        support à préciser.]
      </p>
      <h2>Limites et remboursement</h2>
      <p>
        La formation transmet une méthode et ne garantit pas un bénéfice, un
        fournisseur sans risque ou une livraison sans incident. Les règles
        d’importation varient selon les pays et produits. Consultez la politique
        de remboursement avant tout achat.
      </p>
      <h2>Droit applicable et litiges</h2>
      <p>
        [Droit applicable, juridiction, médiation et droits obligatoires des
        consommateurs à faire valider selon le pays de l’éditeur et la
        clientèle.]
      </p>
    </LegalPage>
  );
}
