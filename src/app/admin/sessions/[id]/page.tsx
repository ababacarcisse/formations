import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin-nav";
import { SessionEditor } from "@/components/session-editor";
import type { TrainingSession, Meeting } from "@/lib/types";
export default async function Edit({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ data: s, error }, { data: m, error: me }] = await Promise.all([
    db.from("training_sessions").select("*").eq("id", id).maybeSingle(),
    db
      .from("session_meetings")
      .select("*")
      .eq("session_id", id)
      .order("meeting_number"),
  ]);
  if (error || me) throw new Error("Session indisponible");
  if (!s) notFound();
  return (
    <main id="contenu" className="container section legal">
      <AdminNav />
      <h1>Modifier la session</h1>
      <SessionEditor session={s as TrainingSession} meetings={m as Meeting[]} />
    </main>
  );
}
