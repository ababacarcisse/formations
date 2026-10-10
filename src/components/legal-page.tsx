import Link from "next/link";
import { site } from "@/config/site";
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main id="contenu" className="container section legal">
      <p className="eyebrow">
        {site.legalComplete
          ? "INFORMATIONS LÉGALES"
          : "DOCUMENT À FINALISER AVANT LES VENTES"}
      </p>
      <h1>{title}</h1>
      {children}
      <h2>Contact</h2>
      <p>
        {site.legal.company || "[Raison sociale à renseigner]"}
        <br />
        {site.legal.address || "[Adresse à renseigner]"}
        <br />
        {site.legal.email || "[Email de contact à renseigner]"}
      </p>
      <Link href="/">Retour à la formation</Link>
    </main>
  );
}
