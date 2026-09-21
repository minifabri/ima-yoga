import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuthEvent } from "@/lib/supabase/audit";

// Dove Google rimanda dopo il consenso: scambia il "code" per una sessione
// e riporta l'utente a dove voleva andare (vedi safeNext in ../../actions.ts).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") || "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (data.user?.email) {
        await logAuthEvent(supabase, "login_success", data.user.email, `${data.user.email} ha effettuato l'accesso con Google.`);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (!isLocalEnv && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
