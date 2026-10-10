import Image from "next/image";
import Link from "next/link";
import { publicSessions } from "@/lib/sessions";
import { paymentsEnabled } from "@/lib/env";
import { SessionList } from "@/components/session-list";
import { Countdown } from "@/components/countdown";
import {
  ArrowUpRight,
  ShieldCheck,
  PackageCheck,
  Search,
  Handshake,
  Truck,
  Check,
  Globe2,
  MoveRight,
  CircleHelp,
} from "lucide-react";
import { site, faq } from "@/config/site";
import { publicMetadata, jsonLd } from "@/lib/seo";
export const metadata = publicMetadata(site.title, site.description, "/");
const sessions = [
  {
    number: "01",
    title: "Trouvez les bons fournisseurs",
    icon: Search,
    description:
      "Passez de « je ne sais pas par où commencer » à une sélection de fournisseurs à contacter.",
    items: [
      "Créer votre compte Alibaba",
      "Utiliser les filtres et vérifier un fournisseur",
      "Repérer les signaux d’arnaque",
      "Négocier les prix et les conditions",
    ],
  },
  {
    number: "02",
    title: "Passez votre première commande",
    icon: Handshake,
    description: "Comprenez chaque étape avant de vous engager et de payer.",
    items: [
      "Demander et comparer des échantillons",
      "Valider les conditions de commande",
      "Comprendre les protections de paiement",
      "Suivre la production et organiser l’expédition",
    ],
  },
  {
    number: "03",
    title: "Organisez la réception du colis",
    icon: Truck,
    description:
      "Anticipez le trajet de votre marchandise jusqu’à sa récupération.",
    items: [
      "Choisir et communiquer avec un transitaire",
      "Suivre l’acheminement du colis",
      "Préparer le dédouanement selon votre pays",
      "Organiser la récupération et la livraison",
    ],
  },
];
export const dynamic = "force-dynamic";
export default async function Home() {
  const { sessions: openSessions } = await publicSessions();
  const nextSession = openSessions.find((s) => s.remaining > 0);
  const course = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: "Importer depuis Alibaba en Afrique",
    description: site.description,
    inLanguage: "fr",
    url: new URL("/", site.url).href,
    provider: { "@type": "Organization", name: site.name, url: site.url },
    educationalLevel: "Débutant",
    coursePrerequisites: "Aucune expérience en importation requise",
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      offers: {
        "@type": "Offer",
        price: site.price,
        priceCurrency: "XOF",
        url: new URL("/#inscription", site.url).href,
      },
    },
  };
  return (
    <main id="contenu">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(course) }}
      />
      <section className="hero container">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="dot" /> FORMATION PRATIQUE · EN DIRECT · EN
            FRANÇAIS
          </p>
          <h1>
            Importez depuis <span>Alibaba.</span>
            <br />
            Développez votre business en Afrique.
          </h1>
          <p className="lead">
            Du premier fournisseur à la réception de votre colis : apprenez à
            commander avec méthode, même en partant de zéro.
          </p>
          <div className="hero-actions">
            <a href="#inscription" className="button">
              Je veux apprendre à importer <ArrowUpRight size={20} />
            </a>
            <a href="#programme" className="text-link">
              Découvrir le programme <MoveRight size={18} />
            </a>
          </div>
          <p className="availability">
            {nextSession
              ? `${nextSession.remaining} places restantes pour la prochaine session.`
              : "Les prochaines dates seront annoncées ici."}
          </p>
          <div className="hero-proof">
            <span>
              <Check size={16} /> 3 séances live
            </span>
            <span>
              <Check size={16} /> Niveau débutant
            </span>
            <span>
              <Check size={16} /> 10 000 FCFA
            </span>
          </div>
        </div>
        <div
          className="journey-visual"
          aria-label="Parcours : fournisseur en Chine, transport, réception en Afrique"
        >
          <div className="visual-top">
            <span>VOTRE PREMIER IMPORT</span>
            <span className="live-pill">PAS À PAS</span>
          </div>
          <div className="globe">
            <Globe2 size={170} strokeWidth={0.65} />
            <div className="location china">● CHINE</div>
            <div className="location africa">● AFRIQUE</div>
            <div className="route-line" />
          </div>
          <div className="visual-card supplier">
            <div className="icon-box">
              <ShieldCheck />
            </div>
            <div>
              <small>ÉTAPE 01</small>
              <strong>Fournisseur vérifié</strong>
              <span>Comparez avant de commander</span>
            </div>
            <span className="mini-check">✓</span>
          </div>
          <div className="visual-card parcel">
            <div className="icon-box gold">
              <PackageCheck />
            </div>
            <div>
              <small>VOTRE OBJECTIF</small>
              <strong>Une commande maîtrisée</strong>
              <span>Du choix au suivi de livraison</span>
            </div>
          </div>
          <p className="visual-caption">
            Un parcours clair. Des décisions éclairées.
          </p>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          <span>CONÇU POUR LES ENTREPRENEURS D’AFRIQUE FRANCOPHONE</span>
          <span>
            <ShieldCheck size={18} /> Comprendre les risques
          </span>
          <span>
            <Handshake size={18} /> Mieux négocier
          </span>
          <span>
            <Truck size={18} /> Anticiper la logistique
          </span>
        </div>
      </div>
      <section className="container section">
        <p className="eyebrow">LE DÉCLIC</p>
        <h2>
          Vous voulez vous lancer.
          <br />
          <span>Mais les doutes vous retiennent.</span>
        </h2>
        <div className="grid four">
          {[
            {
              title: "« Et si c’était une arnaque ? »",
              text: "Difficile de savoir à qui faire confiance derrière un écran.",
            },
            {
              title: "« Quel fournisseur choisir ? »",
              text: "Des milliers d’offres, des prix différents… et aucun repère.",
            },
            {
              title: "« Comment faire venir le colis ? »",
              text: "Transport, transitaire, douane : le trajet semble compliqué.",
            },
            {
              title: "« Je n’y connais rien. »",
              text: "Vous avez une idée de business, mais pas encore de méthode.",
            },
          ].map((p, i) => (
            <article className="problem card" key={p.title}>
              <span className="number">0{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </article>
          ))}
        </div>
        <div className="solution">
          <div>
            <p className="eyebrow">UNE MÉTHODE, PAS DES SUPPOSITIONS</p>
            <h3>
              On avance ensemble,
              <br />
              une étape à la fois.
            </h3>
          </div>
          <p>
            En trois séances en ligne, nous vous guidons de la création de votre
            compte à la réception chez le transitaire. Vous apprenez quoi
            vérifier, quelles questions poser et quels frais anticiper.
          </p>
        </div>
      </section>
      <section className="section programme" id="programme">
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LE PROGRAMME</p>
              <h2>
                3 séances pour passer
                <br />
                <span>de l’idée à l’action.</span>
              </h2>
            </div>
            <p>
              Pratique. Progressif. Accessible.
              <br />
              Chaque séance prépare la suivante.
            </p>
          </div>
          <div className="grid three">
            {sessions.map((s) => (
              <article className="card session" key={s.number}>
                <div className="session-top">
                  <s.icon size={30} />
                  <span>SÉANCE {s.number}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
                <ul>
                  {s.items.map((item) => (
                    <li key={item}>
                      <Check size={16} />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="note">
            Les produits, le transport et les droits de douane ne sont pas
            inclus dans le prix de la formation.
          </p>
        </div>
      </section>
      <section className="container section results">
        <div>
          <p className="eyebrow">À LA FIN DE LA FORMATION</p>
          <h2>
            Vous aurez les repères
            <br />
            <span>pour vous lancer.</span>
          </h2>
          <p>
            Le but : vous aider à prendre des décisions éclairées, avec une
            méthode que vous pourrez réutiliser.
          </p>
        </div>
        <ul>
          {[
            "Comparer plusieurs fournisseurs avec des critères concrets",
            "Préparer une négociation et une commande",
            "Comprendre les protections et les limites du paiement",
            "Estimer les coûts de transport et de réception",
            "Dialoguer avec votre transitaire",
          ].map((t) => (
            <li key={t}>
              <span className="check-circle">
                <Check size={18} />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </section>
      <SessionList />
      <section className="container section bonus">
        <div className="card">
          <p className="eyebrow">LE BONUS POUR VOTRE BUSINESS</p>
          <h2>
            Importez mieux.
            <br />
            <span>Gérez aussi ce que vous vendez.</span>
          </h2>
          <p>
            Votre inscription confirmée donne accès à une application de gestion
            : produits et stock, ventes, bénéfice, clients et dettes, dépenses
            et calcul du coût de revient d’import.
          </p>
          <div className="grid three">
            <article>
              <h3>Stock sous contrôle</h3>
              <p>Repérez les stocks bas et enregistrez vos ventes.</p>
            </article>
            <article>
              <h3>Vos chiffres en FCFA</h3>
              <p>Suivez vos recettes, coûts et dépenses.</p>
            </article>
            <article>
              <h3>Un import mieux chiffré</h3>
              <p>Estimez le coût unitaire et votre prix de vente.</p>
            </article>
          </div>
          <Link href="/app/connexion">
            Déjà inscrit ? Accédez à votre application →
          </Link>
        </div>
      </section>
      <section className="container section audience">
        <div>
          <p className="eyebrow">EST-CE POUR VOUS ?</p>
          <h2>
            Vous avez l’envie.
            <br />
            <span>On apporte la méthode.</span>
          </h2>
        </div>
        <div className="grid two">
          <article className="card">
            <h3>Cette formation vous correspond si…</h3>
            <ul>
              {[
                "Vous débutez dans l’importation",
                "Vous êtes entrepreneur ou revendeur",
                "Vous souhaitez comprendre avant de commander",
                "Vous êtes prêt à pratiquer et à poser des questions",
              ].map((t) => (
                <li key={t}>
                  <Check size={17} />
                  {t}
                </li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h3>Avant de vous inscrire</h3>
            <p>
              Ce n’est pas une promesse de gains ni un service d’achat à votre
              place. Vous restez responsable de vos décisions et de votre
              budget. La formation ne garantit ni bénéfices, ni livraison sans
              incident.
            </p>
            <p>{site.guarantee}</p>
          </article>
        </div>
      </section>
      {site.testimonials.length > 0 && (
        <section className="container section">
          <p className="eyebrow">LEURS EXPÉRIENCES</p>
          <h2>Ils ont suivi la formation.</h2>
          <div className="grid three">
            {site.testimonials.map((t) => (
              <figure className="card" key={t.name}>
                <blockquote>{t.text}</blockquote>
                <figcaption>
                  {t.name} · {t.country}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      {site.trainer && (
        <section className="container section">
          <p className="eyebrow">VOTRE FORMATEUR</p>
          {site.trainerImage && (
            <Image
              src={site.trainerImage}
              alt={site.trainer}
              width={160}
              height={160}
            />
          )}
          <h2>{site.trainer}</h2>
          <p>{site.trainerBio}</p>
        </section>
      )}
      <section className="container section" id="inscription">
        <div className="offer card">
          <div>
            <p className="eyebrow">VOTRE PROCHAIN PAS</p>
            <h2>
              Une méthode claire.
              <br />
              Un prix accessible.
            </h2>
            <p>Formation « Importer depuis Alibaba en Afrique »</p>
            <ul>
              {[
                "3 séances pratiques en direct",
                "Fournisseurs, commande et réception",
                "Explications en français, adaptées aux débutants",
              ].map((t) => (
                <li key={t}>
                  <Check size={18} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="offer-price">
            <span className="price-label">LA FORMATION COMPLÈTE</span>
            <span className="old-price">
              {site.previousPrice.toLocaleString("fr-FR")} FCFA
            </span>
            <div className="price">
              10 000 <span>FCFA</span>
            </div>
            <p className="availability">
              {nextSession
                ? `${nextSession.remaining} places restantes pour ${nextSession.title}.`
                : "La prochaine session sera annoncée ici."}
            </p>
            {nextSession && (
              <p>
                <Countdown deadline={nextSession.registration_deadline} />
              </p>
            )}
            {nextSession && paymentsEnabled() ? (
              <Link
                className="button"
                href={`/checkout?session=${nextSession.id}`}
              >
                Je m’inscris maintenant <ArrowUpRight size={18} />
              </Link>
            ) : site.whatsapp ? (
              <a className="button" href={`https://wa.me/${site.whatsapp}`}>
                Être informé sur WhatsApp <ArrowUpRight size={18} />
              </a>
            ) : (
              <a className="button" href="#sessions">
                Voir les prochaines sessions <ArrowUpRight size={18} />
              </a>
            )}
            <small>Horaires : heure de Dakar/Abidjan (GMT).</small>
          </div>
        </div>
      </section>
      <section className="container section">
        <h2>Vos conditions de garantie</h2>
        <p>{site.guarantee}</p>
        <Link href="/remboursement">
          Consulter la politique de remboursement →
        </Link>
      </section>
      <section className="container section faq" id="questions">
        <div>
          <p className="eyebrow">ON RÉPOND À VOS QUESTIONS</p>
          <h2>
            Tout ce qu’il faut savoir
            <br />
            <span>avant de commencer.</span>
          </h2>
          <CircleHelp className="faq-icon" size={60} strokeWidth={1} />
        </div>
        <div>
          {faq.map((f) => (
            <details key={f.question}>
              <summary>
                {f.question}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="final-cta">
        <div className="container">
          <p className="eyebrow">LE PREMIER PAS COMMENCE ICI</p>
          <h2>
            Votre business mérite
            <br />
            une méthode solide.
          </h2>
          <p>Apprenez à importer depuis Alibaba en Afrique, pas à pas.</p>
          <a className="button" href="#inscription">
            Voir l’offre de formation <ArrowUpRight size={20} />
          </a>
        </div>
      </section>
    </main>
  );
}
