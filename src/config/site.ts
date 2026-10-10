export const site = {
  name: "Import Afrique",
  title: "Formation Alibaba en Afrique | Import Afrique",
  description:
    "Apprenez à trouver des fournisseurs sur Alibaba, sécuriser vos commandes et organiser la livraison en Afrique francophone. Formation pratique en 3 séances live, 10 000 FCFA.",
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://www.formations.cissesolutions.cloud",
  price: 10000,
  previousPrice: 25000,
  testimonials: [] as { name: string; text: string; country: string }[],
  trainerBio: "",
  trainerImage: "" as string, // Chemin local dans public, par exemple /formateur.jpg.
  legalComplete: false,
  trainer: "", // Nom réel du formateur avant publication.
  whatsapp: "", // Numéro international, chiffres uniquement.
  guarantee:
    "Les conditions de remboursement seront précisées avant l’ouverture des inscriptions.",
  legal: { company: "", address: "", email: "", registration: "" },
};
export const isProductionSite =
  process.env.NEXT_PUBLIC_SITE_INDEXABLE === "true" &&
  process.env.VERCEL_ENV !== "preview" &&
  new URL(site.url).protocol === "https:";
export const faq = [
  {
    question: "Peut-on commander sur Alibaba depuis l’Afrique ?",
    answer:
      "Oui. Il faut choisir un fournisseur qui accepte votre commande et organiser le transport vers votre pays. La formation explique comment comparer les options et travailler avec un transitaire. Les règles douanières varient selon le pays et le produit.",
  },
  {
    question: "Je débute : est-ce que cette formation est pour moi ?",
    answer:
      "Oui. Nous commençons par la création du compte Alibaba, puis nous avançons étape par étape. Aucune expérience en importation n’est nécessaire.",
  },
  {
    question: "Comment éviter les arnaques sur Alibaba ?",
    answer:
      "Vous apprendrez à vérifier les informations d’un fournisseur, demander un échantillon, comparer ses réponses et utiliser les mécanismes de protection disponibles. Aucune méthode ne supprime tous les risques.",
  },
  {
    question:
      "Le transport et la douane sont-ils inclus dans les 10 000 FCFA ?",
    answer:
      "Non. Ce prix couvre la formation. Les produits, échantillons, frais de transport, taxes et frais du transitaire restent à votre charge.",
  },
  {
    question: "Comment se déroulent les trois séances ?",
    answer:
      "La formation se déroule en direct et en ligne : fournisseurs et négociation, commande et expédition, puis réception chez le transitaire. Les horaires sont affichés en heure de Dakar/Abidjan (GMT) à l’ouverture d’une session.",
  },
  {
    question: "Puis-je suivre la formation sur téléphone ?",
    answer:
      "Oui, avec une connexion stable. Un ordinateur peut rendre certaines manipulations plus confortables, mais vous pouvez commencer avec un téléphone.",
  },
];
