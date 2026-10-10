import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export async function readAll<T>(
  db: SupabaseClient,
  table: string,
  columns = "*",
): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; start < 100000; start += 1000) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order("id")
      .range(start, start + 999);
    if (error) throw new Error("Lecture des données indisponible");
    rows.push(...((data ?? []) as unknown as T[]));
    if ((data?.length ?? 0) < 1000) return rows;
  }
  throw new Error(
    "Volume de données trop important ; une pagination dédiée est nécessaire.",
  );
}
