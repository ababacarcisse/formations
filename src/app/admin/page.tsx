import { readAll } from "@/lib/read-all";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { money } from "@/lib/format";
import type { TrainingSession } from "@/lib/types";
export default async function Admin() {
  const { db } = await requireAdmin();
  const [rows, sessions] = await Promise.all([
    readAll<{
      status: string;
      amount: number;
      session_id: string;
      manual_review: boolean;
    }>(db, "orders", "id,status,amount,session_id,manual_review"),
    readAll<TrainingSession>(db, "training_sessions"),
  ]);
  const success = rows.filter((o) => o.status === "success"),
    review = rows.filter((o) => o.manual_review);
  return (
    <main id="contenu" className="container section">
      <AdminNav />
      <h1>Tableau de bord</h1>
      {review.length > 0 && (
        <div role="alert" className="alert">
          <b>{review.length} paiement(s) à traiter manuellement.</b>
          <p>
            Augmentez la capacité ou proposez une solution au client, puis
            validez l’inscription.
          </p>
        </div>
      )}
      <div className="grid three">
        {[
          [
            "Inscriptions confirmées",
            success.filter((o) => !o.manual_review).length,
          ],
          [
            "Revenus confirmés",
            money(success.reduce((n, o) => n + Number(o.amount), 0)),
          ],
          [
            "Paiements échoués",
            rows.filter((o) => o.status === "failed").length,
          ],
          [
            "Paiements en attente",
            rows.filter((o) => o.status === "pending").length,
          ],
          [
            "Taux de conversion des commandes",
            `${rows.length ? Math.round((success.length / rows.length) * 100) : 0} %`,
          ],
          [
            "Commandes remboursées",
            rows.filter((o) => o.status === "refunded").length,
          ],
        ].map(([label, value]) => (
          <article className="card" key={label}>
            <p>{label}</p>
            <h2>{value}</h2>
          </article>
        ))}
      </div>
      <h2 className="mt">Places restantes par session</h2>
      <div className="grid two">
        {(sessions ?? ([] as TrainingSession[])).map((s) => (
          <article className="card" key={s.id}>
            <h3>{s.title}</h3>
            <p>
              {Math.max(
                0,
                s.capacity -
                  success.filter((o) => o.session_id === s.id).length,
              )}{" "}
              / {s.capacity} places restantes
            </p>
            <Link href={`/admin/sessions/${s.id}/participants`}>
              Voir les participants →
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
