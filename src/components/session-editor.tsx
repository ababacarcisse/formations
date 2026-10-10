import { ActionForm } from "@/components/action-form";
import { saveSession } from "@/lib/admin-actions";
import type { TrainingSession, Meeting } from "@/lib/types";
export function SessionEditor({
  session,
  meetings = [],
}: {
  session?: TrainingSession;
  meetings?: Meeting[];
}) {
  return (
    <div className="card">
      <ActionForm action={saveSession}>
        <input type="hidden" name="id" value={session?.id ?? ""} />
        <label>
          Titre
          <input name="title" required defaultValue={session?.title ?? ""} />
        </label>
        <label>
          Statut
          <select name="status" defaultValue={session?.status ?? "draft"}>
            {["draft", "open", "closed", "completed"].map((s, i) => (
              <option value={s} key={s}>
                {["Brouillon", "Ouverte", "Fermée", "Terminée"][i]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Capacité (1–999)
          <input
            name="capacity"
            type="number"
            min={1}
            max={999}
            required
            defaultValue={session?.capacity ?? 30}
          />
        </label>
        <label>
          Clôture des inscriptions — heure de Dakar/Abidjan (GMT)
          <input
            name="registration_deadline"
            type="datetime-local"
            required
            defaultValue={session?.registration_deadline?.slice(0, 16)}
          />
        </label>
        <label>
          Lien de la salle (HTTPS)
          <input
            name="meeting_link"
            type="url"
            defaultValue={session?.meeting_link ?? ""}
          />
        </label>
        <label>
          Lien du groupe WhatsApp (HTTPS)
          <input
            name="whatsapp_group_link"
            type="url"
            defaultValue={session?.whatsapp_group_link ?? ""}
          />
        </label>
        <label>
          Notes internes
          <textarea
            name="notes"
            maxLength={3000}
            defaultValue={session?.notes ?? ""}
          />
        </label>
        {[1, 2, 3].map((n) => {
          const m = meetings.find((v) => v.meeting_number === n);
          return (
            <fieldset key={n}>
              <legend>Séance {n}</legend>
              <label>
                Titre
                <input
                  name={`title_${n}`}
                  required
                  defaultValue={
                    m?.title ??
                    [
                      "Fournisseurs et négociation",
                      "Commande et expédition",
                      "Réception du colis",
                    ][n - 1]
                  }
                />
              </label>
              <label>
                Date et heure — GMT
                <input
                  name={`starts_${n}`}
                  type="datetime-local"
                  required
                  defaultValue={m?.starts_at.slice(0, 16)}
                />
              </label>
              <label>
                Durée en minutes
                <input
                  name={`duration_${n}`}
                  type="number"
                  min={15}
                  max={480}
                  required
                  defaultValue={m?.duration_minutes ?? 90}
                />
              </label>
            </fieldset>
          );
        })}
      </ActionForm>
    </div>
  );
}
