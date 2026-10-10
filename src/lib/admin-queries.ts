import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
export const orderFilters = z.object({
  q: z.string().max(120).optional().default(""),
  status: z
    .enum(["pending", "success", "failed", "expired", "refunded", ""])
    .optional()
    .default(""),
  session: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .default(""),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  sort: z.enum(["asc", "desc"]).optional().default("desc"),
});
export function ordersQuery(
  db: SupabaseClient,
  filters: z.infer<typeof orderFilters>,
) {
  let query = db.from("orders").select("*", { count: "exact" });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.session) query = query.eq("session_id", filters.session);
  const search = filters.q
    .replace(/[^\p{L}\p{N}@.+ -]/gu, "")
    .replace(/[%_]/g, "");
  if (search)
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  return query.order("created_at", { ascending: filters.sort === "asc" });
}
