import { z } from "zod";
import { body, failure, HttpError, sameOrigin, rateLimit } from "@/lib/http";
import { serviceDb } from "@/lib/supabase/server";
const schema = z.object({
  email: z.email().max(254),
  whatsapp: z.string().regex(/^\+[1-9]\d{7,14}$/),
  website: z.literal(""),
  consent: z.literal(true),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = await body(request, schema);
    await rateLimit(request, "waitlist", 5);
    const { error } = await serviceDb()
      .from("waitlist")
      .upsert(
        { email: input.email.toLowerCase(), whatsapp: input.whatsapp },
        { onConflict: "email", ignoreDuplicates: true },
      );
    if (error)
      throw new HttpError(503, "Inscription temporairement indisponible");
    return Response.json({ success: true });
  } catch (error) {
    return failure(error);
  }
}
