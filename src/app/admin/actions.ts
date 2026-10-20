"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { logAdminAction } from "@/lib/supabase/audit";
import { addPersonalNotices } from "./data";
import {
  sendEventReminderEmail,
  sendIndividualClassAcceptedEmail,
  sendIndividualClassRejectedEmail,
  sendSequenceAssignedEmail,
  sendSurveyPublishedEmail,
  sendSurveyReminderEmail,
} from "@/lib/notifications";
import { runClassRemindersJob } from "@/lib/classRemindersJob";
import { unsubscribeUrl } from "@/lib/unsubscribe";
import { sendPush, storePushSubscription, type PushSubscriptionInput } from "@/lib/push";
import { eventChangeMessage, type EventChange } from "@/lib/eventChange";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function requireAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ctx: null, error: "Non autenticato." };

  const { data: myProfile } = await supabase.from("profiles").select("role").eq("auth_user_id", user.id).maybeSingle();
  if (myProfile?.role !== "admin") return { ctx: null, error: "Solo l'admin può eseguire questa operazione." };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { ctx: null, error: "Chiave di servizio non configurata (SUPABASE_SERVICE_ROLE_KEY)." };

  const adminClient = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  return { ctx: { supabase, adminClient }, error: undefined as string | undefined };
}

type AdminCtx = NonNullable<Awaited<ReturnType<typeof requireAdminContext>>["ctx"]>;

async function getClientAuthUser(ctx: AdminCtx, clientId: string) {
  const { data: client } = await ctx.supabase.from("profiles").select("auth_user_id").eq("id", clientId).maybeSingle();
  if (!client?.auth_user_id) return { error: "Questo cliente non ha un account di accesso." };

  const { data, error } = await ctx.adminClient.auth.admin.getUserById(client.auth_user_id);
  if (error || !data?.user) return { error: error?.message || "Utente non trovato." };
  return { user: data.user };
}

async function getOrigin(): Promise<string | undefined> {
  const hdrs = await headers();
  const host = hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : undefined;
}

export async function adminResetClientPassword(clientId: string): Promise<{ ok: boolean; password?: string; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const found = await getClientAuthUser(ctx, clientId);
  if ("error" in found) return { ok: false, error: found.error };

  const password = generateTempPassword();
  const { error: updErr } = await ctx.adminClient.auth.admin.updateUserById(found.user.id, { password });
  if (updErr) return { ok: false, error: updErr.message };

  await logAdminAction(
    ctx.supabase,
    "admin_reset_client_password",
    "profiles",
    clientId,
    `Password reimpostata dall'admin per ${found.user.email ?? "cliente"}.`
  );

  return { ok: true, password };
}

export async function adminGetClientAuthStatus(
  clientId: string
): Promise<{ ok: boolean; email?: string; emailConfirmed?: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const found = await getClientAuthUser(ctx, clientId);
  if ("error" in found) return { ok: false, error: found.error };

  return { ok: true, email: found.user.email ?? undefined, emailConfirmed: !!found.user.email_confirmed_at };
}

export async function adminResendActivationEmail(clientId: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const found = await getClientAuthUser(ctx, clientId);
  if ("error" in found) return { ok: false, error: found.error };
  if (!found.user.email) return { ok: false, error: "Questo account non ha un indirizzo email." };
  if (found.user.email_confirmed_at) return { ok: false, error: "L'email di questo cliente è già verificata." };

  const { error: resendErr } = await ctx.supabase.auth.resend({ type: "signup", email: found.user.email });
  if (resendErr) return { ok: false, error: resendErr.message };

  await logAdminAction(
    ctx.supabase,
    "admin_resend_activation_email",
    "profiles",
    clientId,
    `Email di attivazione reinviata dall'admin a ${found.user.email}.`
  );

  return { ok: true };
}

export async function adminResendPasswordReset(clientId: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const found = await getClientAuthUser(ctx, clientId);
  if ("error" in found) return { ok: false, error: found.error };
  if (!found.user.email) return { ok: false, error: "Questo account non ha un indirizzo email." };

  const origin = await getOrigin();
  const { error: resetErr } = await ctx.supabase.auth.resetPasswordForEmail(found.user.email, {
    redirectTo: origin ? `${origin}/reset-password` : undefined,
  });
  if (resetErr) return { ok: false, error: resetErr.message };

  await logAdminAction(
    ctx.supabase,
    "admin_resend_password_reset",
    "profiles",
    clientId,
    `Email di reset password reinviata dall'admin a ${found.user.email}.`
  );

  return { ok: true };
}

// Notifica opzionale (email e/o avviso in-sito) inviata a tutti i clienti
// attivi quando l'admin pubblica un sondaggio. Le email vanno lette dal
// client service-role perché l'indirizzo vive in auth.users, non in
// profiles (stesso motivo per cui il cron dei promemoria lezione usa
// adminClient.auth.admin.getUserById per ogni destinatario).
export async function notifySurveyPublished(
  surveyId: string,
  surveySlug: string,
  surveyTitle: string,
  opts: { sendEmail: boolean; sendSiteNotice: boolean; excludeClientIds?: string[] }
): Promise<{ ok: boolean; emailsSent?: number; noticesSent?: number; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };
  if (!opts.sendEmail && !opts.sendSiteNotice) return { ok: true, emailsSent: 0, noticesSent: 0 };

  const { data: allClientProfiles, error: clientsErr } = await ctx.supabase
    .from("profiles")
    .select("id, auth_user_id, full_name, marketing_emails")
    .eq("role", "client")
    .eq("disabled", false);
  if (clientsErr) return { ok: false, error: clientsErr.message };

  const excluded = new Set(opts.excludeClientIds ?? []);
  const clientProfiles = allClientProfiles?.filter((c) => !excluded.has(c.id));

  const origin = await getOrigin();
  const linkPath = `/sondaggi/${surveySlug}`;
  const surveyUrl = `${origin || "https://ima-yoga.vercel.app"}${linkPath}`;

  let emailsSent = 0;
  let noticesSent = 0;

  if (opts.sendSiteNotice && clientProfiles && clientProfiles.length > 0) {
    const clientIds = clientProfiles.map((c) => c.id);
    await addPersonalNotices(ctx.supabase, clientIds, `Nuovo sondaggio disponibile: «${surveyTitle}». Tocca qui per rispondere.`, {
      kind: "survey_published",
      linkPath,
    });
    noticesSent = clientIds.length;
  }

  if (opts.sendEmail && clientProfiles) {
    for (const profile of clientProfiles) {
      // Email non transazionale: solo a chi ha dato il consenso.
      if (!profile.auth_user_id || !profile.marketing_emails) continue;
      const { data: userData } = await ctx.adminClient.auth.admin.getUserById(profile.auth_user_id);
      const email = userData?.user?.email;
      if (!email) continue;
      const ok = await sendSurveyPublishedEmail({
        to: email,
        fullName: profile.full_name || "",
        surveyTitle,
        surveyUrl,
        unsubscribeUrl: unsubscribeUrl(origin || "https://ima-yoga.vercel.app", profile.id),
      });
      if (ok) emailsSent++;
    }
  }

  await logAdminAction(
    ctx.supabase,
    "notify_survey_published",
    "surveys",
    surveyId,
    `Notifica pubblicazione sondaggio "${surveyTitle}" — email: ${emailsSent}, avvisi: ${noticesSent}${excluded.size > 0 ? `, esclusi: ${excluded.size}` : ""}.`
  );

  return { ok: true, emailsSent, noticesSent };
}

// Notifica opzionale (email e/o avviso in-sito) inviata solo ai clienti appena
// assegnati a una sequenza — a differenza dei sondaggi, l'assegnazione è
// mirata a chi la riceve, non un annuncio a tutti meno qualche esclusione.
export async function notifySequenceAssigned(
  sequenceId: string,
  sequenceName: string,
  opts: { sendEmail: boolean; sendSiteNotice: boolean; clientIds: string[] }
): Promise<{ ok: boolean; emailsSent?: number; noticesSent?: number; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };
  if ((!opts.sendEmail && !opts.sendSiteNotice) || opts.clientIds.length === 0) {
    return { ok: true, emailsSent: 0, noticesSent: 0 };
  }

  const { data: clientProfiles, error: clientsErr } = await ctx.supabase
    .from("profiles")
    .select("id, auth_user_id, full_name")
    .in("id", opts.clientIds)
    .eq("disabled", false);
  if (clientsErr) return { ok: false, error: clientsErr.message };

  const origin = await getOrigin();
  const linkPath = `/area/sequenze/${sequenceId}`;
  const sequenceUrl = `${origin || "https://ima-yoga.vercel.app"}${linkPath}`;

  let emailsSent = 0;
  let noticesSent = 0;

  if (opts.sendSiteNotice && clientProfiles && clientProfiles.length > 0) {
    const ids = clientProfiles.map((c) => c.id);
    await addPersonalNotices(ctx.supabase, ids, `Ti è stata assegnata una nuova sequenza: «${sequenceName}».`, {
      kind: "sequence_assigned",
      linkPath,
    });
    noticesSent = ids.length;
  }

  if (opts.sendEmail && clientProfiles) {
    for (const profile of clientProfiles) {
      if (!profile.auth_user_id) continue;
      const { data: userData } = await ctx.adminClient.auth.admin.getUserById(profile.auth_user_id);
      const email = userData?.user?.email;
      if (!email) continue;
      const ok = await sendSequenceAssignedEmail({ to: email, fullName: profile.full_name || "", sequenceName, sequenceUrl });
      if (ok) emailsSent++;
    }
  }

  await logAdminAction(
    ctx.supabase,
    "notify_sequence_assigned",
    "sequences",
    sequenceId,
    `Notifica assegnazione sequenza "${sequenceName}" — email: ${emailsSent}, avvisi: ${noticesSent}.`
  );

  return { ok: true, emailsSent, noticesSent };
}

// Promemoria email on-demand per un sondaggio pubblicato, inviato solo ai
// clienti scelti dall'admin nella UI (già filtrati lato client per escludere
// chi ha già risposto). Chi ha già risposto viene ri-escluso anche qui,
// per sicurezza contro una risposta arrivata tra l'apertura del pannello e
// l'invio.
export async function notifySurveyReminder(
  surveyId: string,
  surveySlug: string,
  surveyTitle: string,
  opts: { clientIds: string[] }
): Promise<{ ok: boolean; emailsSent?: number; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };
  if (opts.clientIds.length === 0) return { ok: true, emailsSent: 0 };

  const { data: responded, error: respondedErr } = await ctx.supabase
    .from("survey_responses")
    .select("client_id")
    .eq("survey_id", surveyId)
    .not("client_id", "is", null);
  if (respondedErr) return { ok: false, error: respondedErr.message };
  const respondedIds = new Set((responded ?? []).map((r) => r.client_id as string));

  const { data: clientProfiles, error: clientsErr } = await ctx.supabase
    .from("profiles")
    .select("id, auth_user_id, full_name, marketing_emails")
    .in("id", opts.clientIds)
    .eq("disabled", false);
  if (clientsErr) return { ok: false, error: clientsErr.message };

  const recipients = (clientProfiles ?? []).filter((c) => !respondedIds.has(c.id));

  const origin = await getOrigin();
  const surveyUrl = `${origin || "https://ima-yoga.vercel.app"}/sondaggi/${surveySlug}`;

  let emailsSent = 0;
  for (const profile of recipients) {
    // Email non transazionale: solo a chi ha dato il consenso.
    if (!profile.auth_user_id || !profile.marketing_emails) continue;
    const { data: userData } = await ctx.adminClient.auth.admin.getUserById(profile.auth_user_id);
    const email = userData?.user?.email;
    if (!email) continue;
    const ok = await sendSurveyReminderEmail({
      to: email,
      fullName: profile.full_name || "",
      surveyTitle,
      surveyUrl,
      unsubscribeUrl: unsubscribeUrl(origin || "https://ima-yoga.vercel.app", profile.id),
    });
    if (ok) emailsSent++;
  }

  await logAdminAction(
    ctx.supabase,
    "notify_survey_reminder",
    "surveys",
    surveyId,
    `Promemoria sondaggio "${surveyTitle}" inviato — email: ${emailsSent}.`
  );

  return { ok: true, emailsSent };
}

// Promemoria email on-demand per un evento, inviato solo ai clienti scelti
// dall'admin nella UI (già filtrati lato client per escludere chi si è già
// prenotato). Chi si è già prenotato viene ri-escluso anche qui, per
// sicurezza contro una prenotazione arrivata tra l'apertura del pannello e
// l'invio.
export async function notifyEventReminder(
  eventId: string,
  eventSlug: string,
  eventName: string,
  opts: { clientIds: string[] }
): Promise<{ ok: boolean; emailsSent?: number; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };
  if (opts.clientIds.length === 0) return { ok: true, emailsSent: 0 };

  const { data: bookings, error: bookingsErr } = await ctx.supabase
    .from("event_bookings")
    .select("client_id")
    .eq("event_id", eventId)
    .not("client_id", "is", null);
  if (bookingsErr) return { ok: false, error: bookingsErr.message };
  const bookedIds = new Set((bookings ?? []).map((b) => b.client_id as string));

  const { data: clientProfiles, error: clientsErr } = await ctx.supabase
    .from("profiles")
    .select("id, auth_user_id, full_name, marketing_emails")
    .in("id", opts.clientIds)
    .eq("disabled", false);
  if (clientsErr) return { ok: false, error: clientsErr.message };

  const recipients = (clientProfiles ?? []).filter((c) => !bookedIds.has(c.id));

  const origin = await getOrigin();
  const eventUrl = `${origin || "https://ima-yoga.vercel.app"}/eventi/${eventSlug}`;

  let emailsSent = 0;
  for (const profile of recipients) {
    // Invito a un evento non prenotato = email promozionale: solo a chi ha
    // dato il consenso.
    if (!profile.auth_user_id || !profile.marketing_emails) continue;
    const { data: userData } = await ctx.adminClient.auth.admin.getUserById(profile.auth_user_id);
    const email = userData?.user?.email;
    if (!email) continue;
    const ok = await sendEventReminderEmail({
      to: email,
      fullName: profile.full_name || "",
      eventName,
      eventUrl,
      unsubscribeUrl: unsubscribeUrl(origin || "https://ima-yoga.vercel.app", profile.id),
    });
    if (ok) emailsSent++;
  }

  await logAdminAction(
    ctx.supabase,
    "notify_event_reminder",
    "events",
    eventId,
    `Promemoria evento "${eventName}" inviato — email: ${emailsSent}.`
  );

  return { ok: true, emailsSent };
}

// Avviso a chi è prenotato (anche in lista d'attesa) quando l'admin cambia
// data, orario o luogo di un evento. Parte solo se l'admin risponde "Sì" alla
// domanda che compare dopo il salvataggio (vedi EventChangeNotifyModal).
// Nuovo appuntamento e destinatari si leggono dal database, non dal browser.
// Il push arriva a chi ha attivato le notifiche; l'avviso nell'area personale
// arriva a tutti, così lo vede anche chi non le ha attivate. Gli ospiti senza
// account non hanno né l'uno né l'altro.
export async function notifyEventChanged(
  eventId: string,
  change: EventChange
): Promise<{ ok: boolean; recipients?: number; pushed?: number; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const { data: event, error: eventErr } = await ctx.supabase
    .from("events")
    .select("name, slug, event_date, event_time, location")
    .eq("id", eventId)
    .maybeSingle();
  if (eventErr) return { ok: false, error: eventErr.message };
  if (!event) return { ok: false, error: "Evento non trovato." };

  const { data: bookings, error: bookingsErr } = await ctx.supabase
    .from("event_bookings")
    .select("client_id, profiles(auth_user_id, disabled)")
    .eq("event_id", eventId)
    .not("client_id", "is", null);
  if (bookingsErr) return { ok: false, error: bookingsErr.message };

  const recipients = new Map<string, string | null>();
  for (const b of bookings ?? []) {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    if (!profile || profile.disabled) continue;
    recipients.set(b.client_id as string, (profile.auth_user_id as string | null) ?? null);
  }
  if (recipients.size === 0) return { ok: true, recipients: 0, pushed: 0 };

  const after = { date: event.event_date, time: (event.event_time || "").slice(0, 5), location: event.location ?? "" };
  const { title, body, notice } = eventChangeMessage(event.name, change, after);
  const linkPath = `/eventi/${event.slug}`;

  await addPersonalNotices(ctx.supabase, [...recipients.keys()], notice, { kind: "custom", linkPath });

  let pushed = 0;
  await Promise.all(
    [...recipients.values()].map(async (authUserId) => {
      if (!authUserId) return;
      // Stesso tag per lo stesso evento: se l'admin lo cambia due volte, sul
      // telefono resta solo l'ultimo avviso invece di due in contraddizione.
      const res = await sendPush(ctx.adminClient, { title, body, url: linkPath, tag: `event-change-${eventId}` }, { authUserId }).catch(
        () => ({ sent: 0 })
      );
      if (res.sent > 0) pushed++;
    })
  );

  await logAdminAction(
    ctx.supabase,
    "notify_event_changed",
    "events",
    eventId,
    `Avviso cambio evento "${event.name}" — prenotati: ${recipients.size}, push: ${pushed}.`
  );

  return { ok: true, recipients: recipients.size, pushed };
}

// Email al cliente quando l'admin accetta la sua richiesta di lezione
// individuale (la lezione stessa è già stata creata e collegata prima di
// chiamare questa action — vedi IndividualClassesView). Come per le altre
// email di questo file, l'indirizzo vive in auth.users, non in profiles.
export async function notifyIndividualClassAccepted(
  clientId: string,
  details: { date: string; time: string }
): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const { data: profile } = await ctx.supabase.from("profiles").select("auth_user_id, full_name").eq("id", clientId).maybeSingle();
  if (!profile?.auth_user_id) return { ok: true };
  const { data: userData } = await ctx.adminClient.auth.admin.getUserById(profile.auth_user_id);
  const email = userData?.user?.email;
  if (!email) return { ok: true };

  const sent = await sendIndividualClassAcceptedEmail({ to: email, fullName: profile.full_name || "", date: details.date, time: details.time });

  await logAdminAction(
    ctx.supabase,
    "notify_individual_class_accepted",
    "individual_class_requests",
    null,
    `Email di accettazione lezione individuale a ${email}${sent ? "" : " (invio non riuscito)"}.`
  );

  return { ok: true };
}

// Email al cliente quando l'admin rifiuta la sua richiesta di lezione
// individuale. Nessuna lezione è stata creata: gli slot proposti restano
// disponibili per altri.
export async function notifyIndividualClassRejected(clientId: string, note: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const { data: profile } = await ctx.supabase.from("profiles").select("auth_user_id, full_name").eq("id", clientId).maybeSingle();
  if (!profile?.auth_user_id) return { ok: true };
  const { data: userData } = await ctx.adminClient.auth.admin.getUserById(profile.auth_user_id);
  const email = userData?.user?.email;
  if (!email) return { ok: true };

  const sent = await sendIndividualClassRejectedEmail({ to: email, fullName: profile.full_name || "", note });

  await logAdminAction(
    ctx.supabase,
    "notify_individual_class_rejected",
    "individual_class_requests",
    null,
    `Email di rifiuto lezione individuale a ${email}${sent ? "" : " (invio non riuscito)"}.`
  );

  return { ok: true };
}

// Esegui-ora per il promemoria lezioni, dalla pagina Log automazioni: usa
// la stessa logica dei due cron (dedup via reminder_sent_at su bookings),
// utile per non aspettare il prossimo giro schedulato dopo un errore o
// un'iscrizione dell'ultimo minuto.
export async function runClassRemindersNow(
  onlyToday: boolean
): Promise<{ ok: boolean; sent?: number; skipped?: number; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const jobName = onlyToday ? "class-reminders-same-day" : "class-reminders";
  const result = await runClassRemindersJob(ctx.adminClient, { jobName, onlyToday });

  if (result.ok) {
    await logAdminAction(
      ctx.supabase,
      "run_class_reminders",
      "cron_job_logs",
      null,
      `Promemoria lezioni eseguito manualmente (${onlyToday ? "solo oggi" : "oggi e domani"}) — email: ${result.sent}.`
    );
  }

  return result;
}

// ---------------------------------------------------------
// Notifiche push (vedi PushSettings.tsx e src/lib/push.ts)
// ---------------------------------------------------------
export async function savePushSubscription(
  subscription: PushSubscriptionInput,
  userAgent: string
): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const {
    data: { user },
  } = await ctx.supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato." };

  return storePushSubscription(ctx.adminClient, subscription, user.id, userAgent);
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const { error: deleteError } = await ctx.adminClient.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (deleteError) return { ok: false, error: deleteError.message };
  return { ok: true };
}

export async function sendTestPush(endpoint: string): Promise<{ ok: boolean; error?: string }> {
  const { ctx, error } = await requireAdminContext();
  if (!ctx) return { ok: false, error };

  const result = await sendPush(
    ctx.adminClient,
    { title: "ima yoga", body: "Le notifiche su questo dispositivo funzionano.", url: "/admin/impostazioni", tag: "push-test" },
    { admins: true },
    endpoint
  );
  if (result.error) return { ok: false, error: result.error };
  if (result.sent === 0) return { ok: false, error: "Invio non riuscito: prova a disattivare e riattivare le notifiche." };
  return { ok: true };
}
