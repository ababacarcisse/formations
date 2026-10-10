import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import { hasSupabase, required } from "@/lib/env";
import type { PublicSession } from "@/lib/types";
export const publicSessions = cache(
  async (): Promise<{ sessions: PublicSession[]; available: boolean }> => {
    if (!hasSupabase()) return { sessions: [], available: false };
    const db = createClient(
      required("NEXT_PUBLIC_SUPABASE_URL"),
      required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      {
        auth: { persistSession: false },
        global: {
          fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }),
        },
      },
    );
    const { data, error } = await db.rpc("get_public_sessions");
    if (error) {
      console.error("Impossible de charger les sessions", error.code);
      return { sessions: [], available: false };
    }
    return { sessions: (data ?? []) as PublicSession[], available: true };
  },
);
