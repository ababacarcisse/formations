export const money = (n: number) => `${Number(n).toLocaleString("fr-FR")} FCFA`;
export const meetingDate = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Dakar",
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(date));
export const participant = (n: number) => String(n).padStart(3, "0");
export function safeHttps(value: string | null | undefined) {
  try {
    const url = new URL(value ?? "");
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export const orderStatus: Record<string, string> = {
  pending: "En attente",
  success: "Confirmé",
  failed: "Échoué",
  expired: "Expiré",
  refunded: "Remboursé",
};
export const sessionStatus: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouverte",
  closed: "Fermée",
  completed: "Terminée",
};

export const eventLabel: Record<string, string> = {
  payment_verified: "Paiement vérifié",
  manual_confirmation: "Validation manuelle",
  marked_refunded: "Remboursement enregistré",
  payment_failed: "Paiement échoué",
  payment_expired: "Commande expirée",
};
export const emailStatus: Record<string, string> = {
  queued: "En attente d’envoi",
  sending: "Envoi en cours",
  sent: "Envoyé",
  failed: "Échec",
  skipped: "Envoi devenu inutile",
};
export const emailType = (type: string) =>
  type.startsWith("confirmation")
    ? "Confirmation d’inscription"
    : type === "retry"
      ? "Relance de paiement"
      : type.startsWith("reminder")
        ? `Rappel de séance (${type.split(":").at(-1)} h)`
        : "Message de formation";
