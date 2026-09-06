import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Pagine/rotte sempre raggiungibili anche a sito bloccato (manutenzione o
// coming soon): /login serve all'admin per autenticarsi, /api/* copre il
// cron dei promemoria lezione.
const MAINTENANCE_EXEMPT_PATHS = ["/manutenzione", "/coming-soon", "/login"];

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

  const comingSoon = process.env.COMING_SOON_MODE === "true";
  const maintenance = process.env.MAINTENANCE_MODE === "true";

  if ((comingSoon || maintenance) && !isMaintenanceExempt(request.nextUrl.pathname)) {
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
      return NextResponse.redirect(new URL(comingSoon ? "/coming-soon" : "/manutenzione", request.url));
    }
  }

  return supabaseResponse;
}
