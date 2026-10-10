import { z } from "zod";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { participant } from "@/lib/format";
export default async function Participants({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data, error } = await db
    .from("orders")
    .select("id,participant_number,full_name,email,phone")
    .eq("session_id", id)
    .eq("status", "success")
    .eq("manual_review", false)
    .order("participant_number");
  if (error) throw new Error("Participants indisponibles");
  return (
    <main id="contenu" className="container section">
      <AdminNav />
      <h1>Participants</h1>
      <a
        className="button"
        href={`/api/admin/export?kind=participants&session=${id}`}
      >
        Exporter en CSV
      </a>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Numéro</th>
              <th>Nom</th>
              <th>Email</th>
              <th>WhatsApp</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((o) => (
              <tr key={o.id}>
                <td>{participant(o.participant_number)}</td>
                <td>{o.full_name}</td>
                <td>{o.email}</td>
                <td>
                  <a href={`https://wa.me/${o.phone.replace(/\D/g, "")}`}>
                    {o.phone}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
