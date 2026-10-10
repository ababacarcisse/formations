import "server-only";
import { SasPayClient } from "@/lib/saspay";
import { required } from "@/lib/env";
import { serviceDb } from "@/lib/supabase/server";
import { HttpError } from "@/lib/http";
export function saspay() {
  return new SasPayClient(required("SASPAY_SECRET_KEY"), async (url, init) => {
    const { data, error } = await serviceDb().rpc("check_rate_limit", {
      p_key: "saspay-account-api",
      p_max: 200,
      p_seconds: 60,
    });
    if (error || !data)
      throw new HttpError(
        503,
        "Vérification de paiement reportée ; veuillez patienter.",
      );
    return fetch(url, init);
  });
}
