"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string | null };
export type ForgotPasswordState = { error: string | null; sent: boolean };
export type SignupState = { error: string | null; needsConfirmation: boolean };

// Dove tornare dopo login/registrazione (es. la pagina di un evento da cui
// si è partiti per accedere) — solo un percorso relativo, per evitare open redirect.
function safeNext(formData: FormData): string {
  const next = String(formData.get("next") || "");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email o password non corretti." };
  }

  redirect(safeNext(formData));
}

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const supabase = await createClient();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const visitorId = String(formData.get("visitor_id") || "").trim();

  if (!fullName) {
    return { error: "Inserisci nome e cognome.", needsConfirmation: false };
  }
  if (password.length < 6) {
    return { error: "La password deve avere almeno 6 caratteri.", needsConfirmation: false };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, phone } },
  });

  if (error) {
    return { error: error.message, needsConfirmation: false };
  }

  if (visitorId) {
    try {
      await supabase.rpc("track_page_view", { p_path: "/signup", p_visitor_id: visitorId, p_kind: "signup_completed" });
    } catch {
      // il tracciamento non deve mai bloccare la registrazione
    }
  }

  // Se la conferma email è attiva su Supabase, signUp non crea subito una
  // sessione: il profilo (trigger handle_new_user) esiste già, ma l'accesso
  // resta bloccato finché non si clicca il link ricevuto via email.
  if (!data.session) {
    return { error: null, needsConfirmation: true };
  }

  redirect(safeNext(formData));
}

export async function requestPasswordReset(_prevState: ForgotPasswordState, formData: FormData): Promise<ForgotPasswordState> {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim();
  if (!email) {
    return { error: "Inserisci la tua email.", sent: false };
  }

  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : undefined;

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/reset-password` : undefined,
  });

  // Risposta sempre uguale, indipendentemente dal fatto che l'email esista o meno.
  return { error: null, sent: true };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function claimAdmin() {
  const supabase = await createClient();
  await supabase.rpc("claim_admin");

  revalidatePath("/admin");
  redirect("/admin");
}
