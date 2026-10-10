import localFont from "next/font/local";
import { Tracking } from "@/components/tracking";
import type { Metadata } from "next";
import Link from "next/link";
import { site, isProductionSite } from "@/config/site";
import "./globals.css";
const manrope = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
});
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s | ${site.name}` },
  description: site.description,
  robots: { index: isProductionSite, follow: true },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={manrope.variable}>
        <a className="skip-link" href="#contenu">
          Aller au contenu
        </a>
        <header className="header">
          <div className="container nav">
            <Link href="/" className="brand">
              <span className="brand-icon">↗</span> IMPORT<span>AFRIQUE</span>
            </Link>
            <nav aria-label="Navigation principale">
              <Link href="/#programme">Le programme</Link>
              <Link href="/#questions">Vos questions</Link>
              <Link className="button small" href="/#inscription">
                Rejoindre la formation ↗
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <Tracking />
        <footer className="container footer">
          <div>
            <Link href="/" className="brand">
              IMPORT<span>AFRIQUE</span>
            </Link>
            <p>Votre premier pas vers l’importation.</p>
            <p>Formation indépendante, sans affiliation à Alibaba.</p>
          </div>
          <nav aria-label="Informations légales">
            <Link href="/mentions-legales">Mentions légales</Link>
            <Link href="/cgv">Conditions de vente</Link>
            <Link href="/confidentialite">Confidentialité</Link>
            <Link href="/remboursement">Remboursement</Link>
          </nav>
          <p>
            © {new Date().getFullYear()} {site.name}
          </p>
        </footer>
        <aside className="mobile-cta" aria-label="Inscription à la formation">
          <span>
            3 séances live <b>10 000 FCFA</b>
          </span>
          <Link href="/#inscription" className="button small">
            Voir les sessions ↗
          </Link>
        </aside>
        {site.whatsapp && (
          <aside className="whatsapp" aria-label="Contacter le formateur">
            <a
              href={`https://wa.me/${site.whatsapp}`}
              aria-label="Contacter le formateur sur WhatsApp"
            >
              WhatsApp
            </a>
          </aside>
        )}
      </body>
    </html>
  );
}
