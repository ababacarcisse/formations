import { site } from "@/config/site";
import { privateMetadata, publicMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";
export const metadata = site.legalComplete
  ? publicMetadata(
      "Politique de remboursement | Import Afrique",
      "Informations relatives à la formation Importer depuis Alibaba en Afrique.",
      "/remboursement",
    )
  : { ...privateMetadata, title: "Politique de remboursement" };
export default function Page() {
  return (
    <LegalPage title="Politique de remboursement">
      <h2>Conditions de garantie</h2>
      <p>{site.guarantee}</p>
      <h2>Demande et traitement</h2>
      <p>
        [Délai de demande, conditions d’éligibilité, modalités avant/après le
        début de la formation, justificatifs et délai de traitement à
        renseigner.] Adressez votre demande au contact ci-dessous avec les
        références de votre inscription.
      </p>
      <h2>Annulation ou session complète</h2>
      <p>
        Si la session ne peut pas être assurée ou si elle est complète lors de
        la confirmation du paiement, le formateur vous contacte pour convenir
        d’une solution. [Préciser les choix proposés et les modalités de
        restitution des sommes.]
      </p>
      <h2>Droits obligatoires</h2>
      <p>
        Ces conditions doivent respecter les droits obligatoires applicables aux
        consommateurs concernés. La mise en vente doit attendre la finalisation
        et la validation de ce document.
      </p>
    </LegalPage>
  );
}
