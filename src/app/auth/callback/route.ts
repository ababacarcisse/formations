import { NextResponse } from "next/server";
import { userDb } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code");
  if (code && code.length < 2000) {
    try {
      const db = await userDb();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/app", url));
    } catch {
      /* A valid deployment needs Supabase Auth redirect configuration. */
    }
  }
  return NextResponse.redirect(new URL("/app/connexion?erreur=lien", url));
}
