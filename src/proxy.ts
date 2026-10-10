import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;
  const db = createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await db.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!path.includes("connexion") && !user) {
    const target = request.nextUrl.clone();
    target.pathname = path.startsWith("/admin")
      ? "/admin/connexion"
      : "/app/connexion";
    const next = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
    return next;
  }
  return response;
}
export const config = { matcher: ["/admin/:path*", "/app/:path*"] };
