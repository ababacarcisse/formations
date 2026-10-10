import Link from "next/link";
export default function NotFound() {
  return (
    <main id="contenu" className="container section legal">
      <p className="eyebrow">ERREUR 404</p>
      <h1>Cette page est introuvable.</h1>
      <p>
        Retrouvez le programme et les informations sur la page de la formation.
      </p>
      <Link className="button" href="/">
        Retour à la formation
      </Link>
    </main>
  );
}
