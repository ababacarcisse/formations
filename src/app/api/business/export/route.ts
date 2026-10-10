import { z } from "zod";
import { userDb } from "@/lib/supabase/server";
import { HttpError, failure } from "@/lib/http";
import { csv } from "@/lib/csv";
export async function GET(request: Request) {
  try {
    const db = await userDb();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) throw new HttpError(401, "Connexion requise");
    const { data: buyer } = await db.rpc("is_buyer");
    if (!buyer) throw new HttpError(403, "Inscription confirmée requise");
    const kind = z
      .enum(["products", "sales", "clients", "expenses"])
      .parse(new URL(request.url).searchParams.get("kind"));
    const columns = {
      products: ["id", "name", "cost", "price", "stock", "low_stock"],
      clients: ["id", "name", "phone"],
      sales: [
        "id",
        "product_id",
        "client_id",
        "quantity",
        "unit_price",
        "unit_cost",
        "paid",
        "created_at",
      ],
      expenses: ["id", "description", "category", "amount", "created_at"],
    };
    const rows: unknown[][] = [];
    for (let start = 0; ; start += 1000) {
      if (start >= 100000) throw new HttpError(413, "Export trop volumineux");
      const { data, error } = await db
        .from(`business_${kind}`)
        .select(columns[kind].join(","))
        .eq("user_id", user.id)
        .order("id")
        .range(start, start + 999);
      if (error) throw error;
      rows.push(
        ...(data ?? []).map((o) =>
          columns[kind].map(
            (key) => (o as unknown as Record<string, unknown>)[key],
          ),
        ),
      );
      if ((data?.length ?? 0) < 1000) break;
    }
    return new Response(csv(columns[kind], rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="business-${kind}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
