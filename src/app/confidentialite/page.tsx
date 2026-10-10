import { site } from "@/config/site";
import { privateMetadata, publicMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/legal-page";
export const metadata = site.legalComplete
  ? publicMetadata(
      "Politique de confidentialité | Import Afrique",
      "Informations relatives à la formation Importer depuis Alibaba en Afrique.",
      "/confidentialite",
    )
  : { ...privateMetadata, title: "Politique de confidentialité" };
export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>Responsable et finalités</h2>
      <p>
        {site.legal.company || "[Responsable de traitement à renseigner]"}{" "}
        utilise vos coordonnées pour gérer les inscriptions, le paiement, la
        liste d’attente et les messages relatifs à la formation. Le traitement
        de la commande relève de son exécution ; l’inscription à la liste
        d’attente et les traceurs facultatifs reposent sur votre consentement.
      </p>
      <h2>Données et prestataires</h2>
      <p>
        Les données collectées sont le nom, l’email, le téléphone, la session
        choisie et le statut du paiement. L’application business stocke les
        produits, ventes, dépenses et coordonnées des clients que vous
        saisissez. Supabase assure la base et l’authentification ; SasPay traite
        le paiement ; Resend envoie les emails. Les données bancaires sont
        saisies sur SasPay, jamais dans notre formulaire.
      </p>
      <h2>Durées et droits</h2>
      <p>
        [Durées de conservation, obligations comptables, procédure d’effacement,
        lieux d’hébergement et transferts internationaux à compléter et faire
        valider.] Vous pouvez demander l’accès, la rectification et, lorsque
        applicable, la suppression de vos données via le contact indiqué
        ci-dessous. Les demandes liées aux clients enregistrés dans votre
        business relèvent aussi de votre responsabilité.
      </p>
      <h2>Cookies et outils de mesure</h2>
      <p>
        Les cookies de connexion et de suivi sécurisé de votre propre commande
        sont nécessaires au fonctionnement du service. Les outils GA4 et Meta
        sont désactivés tant que leurs identifiants ne sont pas configurés et
        votre consentement donné. Vous pouvez accepter, refuser ou modifier ce
        choix. Les données business privées ne sont pas enregistrées dans un
        cache hors ligne.
      </p>
      <h2>WhatsApp</h2>
      <p>
        Rejoindre un groupe WhatsApp peut rendre votre numéro visible aux autres
        membres. L’utilisation de WhatsApp est soumise aux conditions et à la
        politique de confidentialité de son opérateur.
      </p>
    </LegalPage>
  );
}
