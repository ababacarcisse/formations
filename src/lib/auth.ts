import "server-only";
import { redirect } from "next/navigation";
import { userDb } from "@/lib/supabase/server";
import { hasSupabase } from "@/lib/env";
export async function requireAdmin() {
  if (!hasSupabase()) redirect("/admin/connexion?configuration=manquante");
  const db = await userDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/admin/connexion");
  const { data, error } = await db
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || data?.role !== "admin")
    redirect("/admin/connexion?acces=refuse");
  return { db, user };
}
export async function requireBuyer() {
  if (!hasSupabase()) redirect("/app/connexion?configuration=manquante");
  const db = await userDb();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/app/connexion");
  const { data, error } = await db.rpc("is_buyer");
  if (error || !data) redirect("/app/connexion?acces=refuse");
  return { db, user };
}
