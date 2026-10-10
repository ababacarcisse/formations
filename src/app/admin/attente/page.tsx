import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { meetingDate } from "@/lib/format";
export default async function Waitlist() {
  const { db } = await requireAdmin();
  const { data, error } = await db
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error("Liste indisponible");
  return (
    <main id="contenu" className="container section">
      <AdminNav />
      <h1>Liste d’attente</h1>
      <a className="button" href="/api/admin/export?kind=waitlist">
        Exporter en CSV
      </a>
      <p>
        Les 1 000 inscriptions les plus récentes (export complet disponible).
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>WhatsApp</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((w) => (
              <tr key={w.id}>
                <td>{w.email}</td>
                <td>{w.whatsapp}</td>
                <td>{meetingDate(w.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
