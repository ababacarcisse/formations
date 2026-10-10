import "server-only";
export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Configuration manquante : ${name}`);
  return value;
}
export const hasSupabase = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
export const paymentsEnabled = () =>
  process.env.SASPAY_PAYMENTS_ENABLED === "true" &&
  hasSupabase() &&
  Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SASPAY_SECRET_KEY &&
    process.env.SASPAY_WEBHOOK_SECRET,
  );
