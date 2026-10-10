import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { serviceDb } from "@/lib/supabase/server";
import { required } from "@/lib/env";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function body<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  if (Number(request.headers.get("content-length") ?? 0) > 20000)
    throw new HttpError(413, "Requête trop volumineuse");
  const raw = await request.text();
  if (raw.length > 20000) throw new HttpError(413, "Requête trop volumineuse");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Requête invalide");
  }
  const result = schema.safeParse(value);
  if (!result.success)
    throw new HttpError(400, "Veuillez vérifier les champs du formulaire.");
  return result.data;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  try {
    const parsed = new URL(origin ?? "");
    if (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      parsed.origin === origin &&
      parsed.host === host &&
      parsed.protocol ===
        `${request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1)}:`
    )
      return;
  } catch {
    /* Missing or invalid Origin. */
  }
  throw new HttpError(403, "Origine non autorisée");
}
export async function rateLimit(
  request: Request,
  bucket: string,
  max = 10,
  seconds = 600,
) {
  // On Vercel x-vercel-forwarded-for is supplied by the trusted edge. Other deployments must sanitize forwarded headers.
  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0] ?? "shared";
  const key = createHash("sha256").update(`${bucket}:${ip}`).digest("hex");
  const { data, error } = await serviceDb().rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_seconds: seconds,
  });
  if (error) throw new HttpError(503, "Protection du service indisponible");
  if (!data) throw new HttpError(429, "Trop de demandes. Réessayez plus tard.");
}
export function requireCron(request: Request) {
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${required("CRON_SECRET")}`);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new HttpError(401, "Accès refusé");
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  console.error(
    "Erreur serveur",
    error instanceof Error ? error.name : "Unknown",
  );
  return Response.json(
    { error: "Service indisponible. Veuillez réessayer plus tard." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
