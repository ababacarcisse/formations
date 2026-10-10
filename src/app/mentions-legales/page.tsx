import { site } from "@/config/site";
import { privateMetadata, publicMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";
export const metadata = site.legalComplete
  ? publicMetadata(
      "Mentions légales | Import Afrique",
      "Informations relatives à la formation Importer depuis Alibaba en Afrique.",
      "/mentions-legales",
    )
  : { ...privateMetadata, title: "Mentions légales" };
export default function Page() {
  return (
    <LegalPage title="Mentions légales">
      <h2>Éditeur et publication</h2>
      <p>
        {site.legal.company || "[Nom de l’entreprise / éditeur]"} ·{" "}
        {site.legal.registration || "[Immatriculation / identifiant légal]"}.
        Responsable de publication : {site.trainer || "[Nom à renseigner]"}.
      </p>
      <h2>Hébergement</h2>
      <p>
        [Identité, adresse et contact de l’hébergeur à compléter après choix du
        déploiement.]
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>
        Les contenus de formation sont destinés à un usage personnel. Toute
        reproduction ou diffusion nécessite l’autorisation de l’éditeur. Les
        marques citées appartiennent à leurs propriétaires. Cette formation est
        indépendante et n’est pas affiliée à Alibaba.
      </p>
    </LegalPage>
  );
}
