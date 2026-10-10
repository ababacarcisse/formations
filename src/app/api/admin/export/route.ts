import { z } from "zod";
import { userDb } from "@/lib/supabase/server";
import { orderFilters, ordersQuery } from "@/lib/admin-queries";
import { csv } from "@/lib/csv";
import { failure, HttpError } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const db = await userDb();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new HttpError(401, "Connexion requise");
    const { data: admin } = await db
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    if (admin?.role !== "admin") throw new HttpError(403, "Accès refusé");
    const url = new URL(request.url);
    const kind = z
      .enum(["orders", "participants", "waitlist"])
      .parse(url.searchParams.get("kind"));
    const filters = orderFilters.parse(Object.fromEntries(url.searchParams));
    const rows: unknown[][] = [];
    let headers: string[] = [];
    for (let start = 0; ; start += 1000) {
      if (start >= 100000)
        throw new HttpError(
          413,
          "Export trop volumineux : réduisez les filtres.",
        );
      if (kind === "waitlist") {
        headers = ["Email", "WhatsApp", "Date"];
        const { data, error } = await db
          .from("waitlist")
          .select("*")
          .order("created_at")
          .order("id")
          .range(start, start + 999);
        if (error) throw error;
        rows.push(
          ...(data ?? []).map((o) => [o.email, o.whatsapp, o.created_at]),
        );
        if ((data?.length ?? 0) < 1000) break;
      } else {
        headers = [
          "ID",
          "Nom",
          "Email",
          "Téléphone",
          "Session",
          "Statut",
          "Participant",
          "Date",
          "Motif",
        ];
        let query = ordersQuery(db, filters);
        if (kind === "participants") {
          if (!filters.session) throw new HttpError(400, "Session requise");
          query = query.eq("status", "success").eq("manual_review", false);
        }
        const { data, error } = await query
          .order("id")
          .range(start, start + 999);
        if (error) throw error;
        rows.push(
          ...(data ?? []).map((o) => [
            o.id,
            o.full_name,
            o.email,
            o.phone,
            o.session_id,
            o.status,
            o.participant_number
              ? String(o.participant_number).padStart(3, "0")
              : "",
            o.created_at,
            o.failure_reason,
          ]),
        );
        if ((data?.length ?? 0) < 1000) break;
      }
    }
    return new Response(csv(headers, rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${kind}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
