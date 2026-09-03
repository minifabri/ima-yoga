import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pagine/rotte sempre raggiungibili anche a sito in manutenzione: /login serve
// all'admin per autenticarsi, /api/* copre il cron dei promemoria lezione.
const MAINTENANCE_EXEMPT_PATHS = ["/manutenzione", "/login"];

function isMaintenanceExempt(pathname: string) {
  return MAINTENANCE_EXEMPT_PATHS.includes(pathname) || pathname.startsWith("/api/");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth token if needed — required so Server Components see a valid session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (process.env.MAINTENANCE_MODE === "true" && !isMaintenanceExempt(request.nextUrl.pathname)) {
    let isAdmin = false;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      isAdmin = profile?.role === "admin";
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/manutenzione", request.url));
    }
  }

  return supabaseResponse;
}
