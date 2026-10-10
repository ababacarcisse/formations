import { sessionStatus } from "@/lib/format";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { SessionEditor } from "@/components/session-editor";
import { ActionForm } from "@/components/action-form";
import { sessionAction } from "@/lib/admin-actions";
import type { TrainingSession } from "@/lib/types";
export default async function Sessions() {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from("training_sessions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Sessions indisponibles");
  return (
    <main id="contenu" className="container section">
      <AdminNav />
      <h1>Sessions de formation</h1>
      <div className="grid two">
        {(data ?? ([] as TrainingSession[])).map((s) => (
          <article className="card" key={s.id}>
            <h3>{s.title}</h3>
            <p>
              {sessionStatus[s.status]} · {s.capacity} places
            </p>
            <Link className="text-link" href={`/admin/sessions/${s.id}`}>
              Modifier les 3 séances →
            </Link>
            <Link
              className="text-link"
              href={`/admin/sessions/${s.id}/participants`}
            >
              Participants et export →
            </Link>
            <ActionForm action={sessionAction} label="Appliquer">
              <input type="hidden" name="id" value={s.id} />
              <label>
                Action
                <select name="action">
                  <option value="duplicate">Dupliquer en brouillon</option>
                  <option value="open">Ouvrir</option>
                  <option value="closed">Fermer</option>
                  <option value="delete">Supprimer (sans commande)</option>
                </select>
              </label>
              <label className="checkbox">
                <input name="confirm" type="checkbox" />
                Confirmer une suppression
              </label>
            </ActionForm>
          </article>
        ))}
      </div>
      <h2 className="mt">Créer une session</h2>
      <SessionEditor />
    </main>
  );
}
