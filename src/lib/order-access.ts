import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serviceDb } from "@/lib/supabase/server";
import { HttpError } from "@/lib/http";
import { z } from "zod";
import type { Order, OrderView, TrainingSession, Meeting } from "@/lib/types";
export const accessHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newOrderAccess = () => randomBytes(32).toString("hex");
export async function rememberOrder(id: string, token: string) {
  (await cookies()).set(`order_${id}`, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 72,
    path: "/",
  });
}
export async function authorizedOrder(id: string): Promise<Order> {
  if (!z.uuid().safeParse(id).success)
    throw new HttpError(400, "Commande invalide");
  const token = (await cookies()).get(`order_${id}`)?.value;
  if (!token)
    throw new HttpError(
      403,
      "Retrouvez la confirmation dans votre email ou contactez le support.",
    );
  const { data, error } = await serviceDb()
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new HttpError(404, "Commande introuvable");
  const actual = Buffer.from(accessHash(token));
  const expected = Buffer.from(data.access_token_hash);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new HttpError(403, "Accès refusé");
  return data as Order;
}
export async function orderView(order: Order): Promise<OrderView> {
  const base = {
    id: order.id,
    session_id: order.session_id,
    status: order.status,
    participant_number: order.participant_number,
    manual_review: order.manual_review,
  };
  if (order.status !== "success" || order.manual_review) return base;
  const db = serviceDb();
  const [{ data: s, error: e }, { data: m, error: me }] = await Promise.all([
    db
      .from("training_sessions")
      .select("*")
      .eq("id", order.session_id)
      .single(),
    db
      .from("session_meetings")
      .select("*")
      .eq("session_id", order.session_id)
      .order("meeting_number"),
  ]);
  if (e || me)
    throw new HttpError(
      503,
      "Informations de session temporairement indisponibles",
    );
  const session = s as TrainingSession;
  return {
    ...base,
    title: session.title,
    meetings: m as Meeting[],
    whatsapp_group_link: session.whatsapp_group_link,
  };
}
