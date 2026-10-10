"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireBuyer } from "@/lib/auth";
import type { FormState } from "@/lib/login-actions";
export async function businessAction(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const { db, user } = await requireBuyer();
  const input = Object.fromEntries(form);
  const type = z
    .enum(["product", "client", "sale", "expense", "stock", "debt"])
    .safeParse(input.type);
  if (!type.success) return { message: "Action invalide" };
  try {
    let error;
    switch (type.data) {
      case "product": {
        const values = z
          .object({
            name: z.string().trim().min(2).max(120),
            cost: z.coerce.number().min(0).max(1e9),
            price: z.coerce.number().min(0).max(1e9),
            stock: z.coerce.number().int().min(0).max(1e6),
            low_stock: z.coerce.number().int().min(0).max(1e6),
          })
          .parse(input);
        ({ error } = await db
          .from("business_products")
          .insert({ ...values, user_id: user.id }));
        break;
      }
      case "client": {
        const values = z
          .object({
            name: z.string().trim().min(2).max(120),
            phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
          })
          .parse(input);
        ({ error } = await db
          .from("business_clients")
          .insert({ ...values, user_id: user.id }));
        break;
      }
      case "expense": {
        const values = z
          .object({
            description: z.string().trim().min(2).max(200),
            category: z.enum([
              "Transport",
              "Douane",
              "Marketing",
              "Fonctionnement",
              "Autre",
            ]),
            amount: z.coerce.number().positive().max(1e9),
          })
          .parse(input);
        ({ error } = await db
          .from("business_expenses")
          .insert({ ...values, user_id: user.id }));
        break;
      }
      case "sale": {
        const v = z
          .object({
            product: z.uuid(),
            client: z.union([z.uuid(), z.literal("")]),
            quantity: z.coerce.number().int().positive().max(1e6),
            price: z.coerce.number().min(0).max(1e9),
            paid: z.coerce.number().min(0).max(1e9),
          })
          .parse(input);
        ({ error } = await db.rpc("record_business_sale", {
          p_product: v.product,
          p_client: v.client || null,
          p_quantity: v.quantity,
          p_price: v.price,
          p_paid: v.paid,
        }));
        break;
      }
      case "stock": {
        const v = z
          .object({
            id: z.uuid(),
            stock: z.coerce.number().int().min(0).max(1e6),
          })
          .parse(input);
        ({ error } = await db
          .from("business_products")
          .update({ stock: v.stock })
          .eq("id", v.id)
          .eq("user_id", user.id));
        break;
      }
      case "debt": {
        const v = z
          .object({
            id: z.uuid(),
            amount: z.coerce.number().positive().max(1e9),
          })
          .parse(input);
        ({ error } = await db.rpc("pay_business_debt", {
          p_sale: v.id,
          p_amount: v.amount,
        }));
        break;
      }
    }
    if (error)
      return {
        message:
          "Enregistrement refusé. Vérifiez le stock, le client et les montants.",
      };
    revalidatePath("/app");
    return { message: "Enregistré." };
  } catch {
    return { message: "Vérifiez les champs et les montants." };
  }
}
