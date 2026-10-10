"use server";
import { after } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase/server";
import { verifyPayment } from "@/lib/payments";
import { drainEmails } from "@/lib/emails";
import type { Order } from "@/lib/types";
import type { FormState } from "@/lib/login-actions";
const url = z.union([
  z.literal(""),
  z.url().refine((s) => new URL(s).protocol === "https:"),
]);
const schema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  title: z.string().trim().min(3).max(150),
  status: z.enum(["draft", "open", "closed", "completed"]),
  capacity: z.coerce.number().int().min(1).max(999),
  registration_deadline: z.string().min(1),
  meeting_link: url,
  whatsapp_group_link: url,
  notes: z.string().max(3000),
});
export async function saveSession(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireAdmin();
  const input = schema.safeParse(Object.fromEntries(form));
  if (!input.success)
    return { message: "Vérifiez les champs de la session et les liens HTTPS." };
  try {
    const meetings = [1, 2, 3].map((n) => ({
      meeting_number: n,
      title: z
        .string()
        .min(3)
        .max(150)
        .parse(form.get(`title_${n}`)),
      starts_at: new Date(`${form.get(`starts_${n}`)}Z`).toISOString(),
      duration_minutes: z.coerce
        .number()
        .int()
        .min(15)
        .max(480)
        .parse(form.get(`duration_${n}`)),
    }));
    const deadline = new Date(
      `${input.data.registration_deadline}Z`,
    ).toISOString();
    if (
      input.data.status === "open" &&
      (new Date(deadline).getTime() <= Date.now() ||
        !input.data.meeting_link ||
        !input.data.whatsapp_group_link ||
        meetings.some((m) => m.starts_at <= deadline))
    )
      return {
        message:
          "Pour ouvrir : dates futures après la clôture, lien de salle et groupe WhatsApp requis.",
      };
    if (
      meetings.some((m, i) => i > 0 && m.starts_at <= meetings[i - 1].starts_at)
    )
      return { message: "Les trois séances doivent se suivre dans l’ordre." };
    const { error } = await serviceDb().rpc("save_training_session", {
      p_id: input.data.id || null,
      p_session: { ...input.data, registration_deadline: deadline },
      p_meetings: meetings,
    });
    if (error)
      return {
        message:
          "Enregistrement refusé : vérifiez les dates et la capacité des inscriptions déjà payées.",
      };
    revalidatePath("/");
    revalidatePath("/admin/sessions");
    return { message: "Session enregistrée." };
  } catch {
    return { message: "Dates ou durées non valides." };
  }
}
export async function sessionAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  await requireAdmin();
  const input = z
    .object({
      id: z.uuid(),
      action: z.enum(["duplicate", "delete", "open", "closed"]),
      confirm: z.string().optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { message: "Action invalide" };
  const db = serviceDb();
  try {
    const { data: s, error } = await db
      .from("training_sessions")
      .select("*")
      .eq("id", input.data.id)
      .single();
    if (error) throw error;
    if (input.data.action === "duplicate") {
      const { data: m, error: e } = await db
        .from("session_meetings")
        .select("meeting_number,title,starts_at,duration_minutes")
        .eq("session_id", s.id);
      if (e) throw e;
      const { error: de } = await db.rpc("save_training_session", {
        p_id: null,
        p_session: { ...s, title: `${s.title} (copie)`, status: "draft" },
        p_meetings: m,
      });
      if (de) throw de;
    } else if (input.data.action === "delete") {
      if (input.data.confirm !== "on")
        return { message: "Confirmez la suppression." };
      const { error: e } = await db
        .from("training_sessions")
        .delete()
        .eq("id", s.id);
      if (e)
        return {
          message: "Une session avec des commandes ne peut pas être supprimée.",
        };
    } else {
      if (input.data.action === "open") {
        const { data: m, error: e } = await db
          .from("session_meetings")
          .select("starts_at")
          .eq("session_id", s.id);
        if (
          e ||
          m?.length !== 3 ||
          !s.meeting_link ||
          !s.whatsapp_group_link ||
          new Date(s.registration_deadline).getTime() <= Date.now() ||
          m.some((v) => v.starts_at <= s.registration_deadline)
        )
          return {
            message:
              "Complétez les trois séances futures et les liens avant l’ouverture.",
          };
      }
      const { error: e } = await db
        .from("training_sessions")
        .update({ status: input.data.action })
        .eq("id", s.id);
      if (e) throw e;
    }
    revalidatePath("/");
    revalidatePath("/admin/sessions");
    return { message: "Action effectuée." };
  } catch {
    return { message: "Action refusée. Vérifiez la session." };
  }
}
export async function orderAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireAdmin();
  const input = z
    .object({
      id: z.uuid(),
      action: z.enum(["verify", "resend", "manual", "refund"]),
      confirm: z.string().optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { message: "Action invalide" };
  const db = serviceDb();
  try {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("id", input.data.id)
      .single();
    if (error) throw error;
    const order = data as Order;
    switch (input.data.action) {
      case "verify":
        if (!order.saspay_session_id)
          return {
            message:
              "Session SasPay absente : vérifier cette tentative dans le tableau de bord SasPay.",
          };
        await verifyPayment(order);
        break;
      case "manual":
        if (input.data.confirm !== "on")
          return { message: "Confirmez que le paiement a été reçu." };
        {
          const { data: confirmed, error: e } = await db.rpc(
            "confirm_training_order",
            {
              p_order: order.id,
              p_actor: user.id,
            },
          );
          if (e) throw e;
          if ((confirmed as Order).manual_review) {
            revalidatePath("/admin");
            revalidatePath(`/admin/commandes/${order.id}`);
            return {
              message:
                "Paiement conservé, mais la session reste complète. Augmentez la capacité ou convenez d’une autre solution avec le client.",
            };
          }
        }
        break;
      case "refund":
        if (input.data.confirm !== "on")
          return {
            message: "Confirmez que le remboursement a déjà été effectué.",
          };
        {
          const { error: e } = await db.rpc("refund_training_order", {
            p_order: order.id,
            p_actor: user.id,
          });
          if (e) throw e;
        }
        break;
      case "resend":
        if (order.status !== "success" || order.manual_review)
          return {
            message:
              "Seules les inscriptions confirmées peuvent recevoir cet email.",
          };
        {
          const { error: e } = await db.from("email_logs").upsert({
            order_id: order.id,
            type: `confirmation:manual:${crypto.randomUUID()}`,
            status: "queued",
          });
          if (e) throw e;
        }
        break;
    }
    after(async () => {
      try {
        await drainEmails();
      } catch {
        console.error("Emails reportés au cron");
      }
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/commandes/${order.id}`);
    return {
      message:
        "Action enregistrée. Les emails non envoyés restent dans la file de réessai.",
    };
  } catch {
    return {
      message:
        "Action indisponible. Vérifiez la configuration, le statut et le journal.",
    };
  }
}
