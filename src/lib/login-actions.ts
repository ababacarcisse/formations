"use server";
import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { userDb, serviceDb } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/http";
import { site } from "@/config/site";
export type FormState = { message: string };
export async function adminLogin(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const result = z
    .object({ email: z.email(), password: z.string().min(8).max(200) })
    .safeParse(Object.fromEntries(form));
  if (!result.success)
    return { message: "Vérifiez votre email et votre mot de passe." };
  try {
    await rateLimit(
      new Request(site.url, { headers: await headers() }),
      "admin-login",
      5,
    );
    const db = await userDb();
    const { data, error } = await db.auth.signInWithPassword(result.data);
    if (error || !data.user)
      return { message: "Identifiants ou accès non valides." };
    const { data: admin } = await db
      .from("admin_users")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (admin?.role !== "admin") {
      await db.auth.signOut();
      return { message: "Identifiants ou accès non valides." };
    }
  } catch {
    return {
      message: "Connexion indisponible. Vérifiez la configuration Supabase.",
    };
  }
  redirect("/admin");
}
export async function buyerLogin(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const result = z
    .object({ email: z.email().max(254) })
    .safeParse(Object.fromEntries(form));
  if (!result.success) return { message: "Veuillez saisir un email valide." };
  try {
    await rateLimit(
      new Request(site.url, { headers: await headers() }),
      "buyer-login",
      5,
    );
    const db = serviceDb();
    const { data, error } = await db
      .from("orders")
      .select("id")
      .eq("email", result.data.email.toLowerCase())
      .eq("status", "success")
      .eq("manual_review", false)
      .limit(1);
    if (error) throw error;
    if (data?.length) {
      const auth = await userDb();
      const { error: e } = await auth.auth.signInWithOtp({
        email: result.data.email.toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: new URL("/auth/callback", site.url).href,
        },
      });
      if (e) throw e;
    }
  } catch {
    return {
      message:
        "Service indisponible. Vérifiez la configuration de l’authentification.",
    };
  }
  return {
    message:
      "Si cet email est associé à une inscription confirmée, un lien de connexion vous a été envoyé.",
  };
}
export async function logout() {
  const db = await userDb();
  await db.auth.signOut();
  redirect("/");
}
