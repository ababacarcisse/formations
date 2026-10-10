import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { orderFilters, ordersQuery } from "@/lib/admin-queries";
import { participant, meetingDate, orderStatus } from "@/lib/format";
import type { Order } from "@/lib/types";
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { db } = await requireAdmin();
  const parsed = orderFilters.safeParse(await searchParams);
  const f = parsed.success ? parsed.data : orderFilters.parse({});
  const [{ data, error, count }, { data: sessions }] = await Promise.all([
    ordersQuery(db, f).range((f.page - 1) * 25, f.page * 25 - 1),
    db.from("training_sessions").select("id,title"),
  ]);
  if (error) throw new Error("Commandes indisponibles");
  const query = (page: number) =>
    new URLSearchParams({ ...f, page: String(page) } as unknown as Record<
      string,
      string
    >).toString();
  return (
    <main id="contenu" className="container section">
      <AdminNav />
      <h1>Commandes</h1>
      <form className="filter-form">
        <label>
          Recherche
          <input
            name="q"
            defaultValue={f.q}
            placeholder="Nom, email, téléphone"
          />
        </label>
        <label>
          Statut
          <select name="status" defaultValue={f.status}>
            <option value="">Tous</option>
            {["success", "failed", "pending", "expired", "refunded"].map(
              (s) => (
                <option value={s} key={s}>
                  {orderStatus[s]}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Session
          <select name="session" defaultValue={f.session}>
            <option value="">Toutes</option>
            {sessions?.map((s) => (
              <option value={s.id} key={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tri
          <select name="sort" defaultValue={f.sort}>
            <option value="desc">Plus récentes</option>
            <option value="asc">Plus anciennes</option>
          </select>
        </label>
        <button className="button small">Filtrer</button>
      </form>
      <a
        href={`/api/admin/export?kind=orders&${query(1)}`}
        className="button small"
      >
        Exporter les commandes filtrées
      </a>
      <p>{count ?? 0} commande(s)</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                "Nom / contact",
                "Session",
                "Statut",
                "Numéro",
                "Date",
                "Motif",
              ].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data ?? ([] as Order[])).map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/commandes/${o.id}`}>{o.full_name}</Link>
                  <br />
                  {o.email}
                  <br />
                  {o.phone}
                </td>
                <td>{sessions?.find((s) => s.id === o.session_id)?.title}</td>
                <td>
                  {orderStatus[o.status]}
                  {o.manual_review && <b className="warning"> · À traiter</b>}
                </td>
                <td>
                  {o.participant_number
                    ? participant(o.participant_number)
                    : "—"}
                </td>
                <td>{meetingDate(o.created_at)}</td>
                <td>{o.failure_reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="pagination" aria-label="Pagination">
        {f.page > 1 && <Link href={`?${query(f.page - 1)}`}>← Précédent</Link>}
        <span>Page {f.page}</span>
        {(count ?? 0) > f.page * 25 && (
          <Link href={`?${query(f.page + 1)}`}>Suivant →</Link>
        )}
      </nav>
    </main>
  );
}
