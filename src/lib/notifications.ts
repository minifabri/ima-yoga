"use server";

import {
  eventReminderEmailHtml,
  individualClassRejectedEmailHtml,
  sequenceAssignedEmailHtml,
  surveyPublishedEmailHtml,
  surveyReminderEmailHtml,
} from "./emailTemplates";

// Avvisa l'admin via email quando una classe raggiunge il numero massimo di
// iscritti. Se RESEND_API_KEY o ADMIN_NOTIFICATION_EMAIL non sono configurate
// (vedi .env.local.example), non fa nulla — non deve mai bloccare una
// prenotazione per un problema di invio email.
export async function notifyClassFull(details: { className: string; date: string; time: string; capacity: number }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !to) return;

  // Parse e formattazione sullo stesso fuso esplicito (UTC): senza,
  // new Date(...) usa il fuso locale del runtime per interpretare la
  // stringa e toLocaleDateString può finire per usarne un altro, dando
  // un giorno della settimana sbagliato per la data giusta — è già
  // successo in produzione ("domenica 14" per un 14 che era lunedì).
  const dateLabel = new Date(`${details.date}T00:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to,
        subject: `Classe piena — ${details.className}, ${dateLabel}`,
        html: `
          <div style="font-family:Helvetica,Arial,sans-serif; font-size:14px; color:#362D4A; line-height:1.6;">
            <p><strong>${details.className}</strong> del ${dateLabel} alle ${details.time} ha raggiunto il numero massimo di iscritti (${details.capacity}).</p>
            <p style="color:#867CA0; font-size:12.5px;">Da qui in poi chi si prenota entra in lista d'attesa.</p>
          </div>
        `,
      }),
    });
  } catch {
    // vedi commento sopra: un errore di invio non deve mai propagarsi al chiamante
  }
}

// Avvisa l'admin via email quando un cliente invia una richiesta di lezione
// individuale (la notifica in-app arriva a parte, via notify_admin() dentro
// la RPC request_individual_class — questa è solo l'email di cortesia).
export async function notifyIndividualClassRequest(details: { clientName: string; notes: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !to) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to,
        subject: `Nuova richiesta di lezione individuale — ${details.clientName}`,
        html: `
          <div style="font-family:Helvetica,Arial,sans-serif; font-size:14px; color:#362D4A; line-height:1.6;">
            <p><strong>${details.clientName}</strong> ha richiesto una lezione individuale.</p>
            ${details.notes ? `<p style="color:#362D4A;">Nota: ${details.notes}</p>` : ""}
            <p style="color:#867CA0; font-size:12.5px;">Vai a «Lezioni individuali» nell'area admin per accettare o rifiutare.</p>
          </div>
        `,
      }),
    });
  } catch {
    // vedi commento in notifyClassFull: un errore di invio non deve mai propagarsi al chiamante
  }
}

// Conferma di prenotazione a un evento, sia per registrati che per ospiti
// (che non hanno un'area personale dove vedere lo stato della prenotazione).
export async function sendEventBookingConfirmationEmail(details: {
  to: string;
  fullName: string;
  eventName: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  status: "booked" | "waitlist";
  plusOne: boolean;
  plusOneName?: string | null;
  isGuest: boolean;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !details.to) return false;

  // Parse e formattazione sullo stesso fuso esplicito (UTC): senza,
  // new Date(...) usa il fuso locale del runtime per interpretare la
  // stringa e toLocaleDateString può finire per usarne un altro, dando
  // un giorno della settimana sbagliato per la data giusta — è già
  // successo in produzione ("domenica 14" per un 14 che era lunedì).
  const dateLabel = new Date(`${details.date}T00:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ima-yoga.vercel.app";
  const isWaitlist = details.status === "waitlist";
  const statusLine = isWaitlist
    ? "Sei in <strong>lista d'attesa</strong>: ti avviseremo se si libera un posto."
    : "La tua prenotazione è confermata.";
  // Chi ha un account può gestire/cancellare la prenotazione da solo dalla
  // propria area (e per lui vale la pena mostrare il bottone per andarci);
  // chi ha prenotato da ospite non ha un'area dove farlo, e deve invece
  // scrivere direttamente.
  const manageParagraph = details.isGuest
    ? `<p style="font-size:14px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">Per modificare o cancellare la prenotazione, scrivici direttamente.</p>`
    : "";
  const areaButton = details.isGuest
    ? ""
    : `<a href="${siteUrl}/area"
         style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
        Vai alla tua area
      </a>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: `Prenotazione evento — ${details.eventName}`,
        html: `
          <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
              <tr>
                <td style="padding:36px 32px 28px 32px; text-align:center;">
                  <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
                    ima yoga
                  </div>
                  <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
                    ${isWaitlist ? "Lista d'attesa" : "Prenotazione evento"}
                  </div>

                  <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 8px 0; text-align:left;">
                    Ciao ${details.fullName.split(" ")[0]}!
                  </p>
                  <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 20px 0; text-align:left;">
                    ${statusLine}
                  </p>
                  <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">
                    <strong>${details.eventName}</strong><br/>${dateLabel} alle ${details.time}${details.plusOne ? `<br/>+1: ${details.plusOneName}` : ""}
                  </p>
                  ${manageParagraph}

                  ${areaButton}

                  <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:28px 0 0 0;">
                    A presto ✨
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px; background:#F2EDF9; text-align:center;">
                  <span style="font-size:11px; color:#867CA0;">ima yoga</span>
                </td>
              </tr>
            </table>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Avviso al cliente che un nuovo sondaggio è stato pubblicato — inviato in
// blocco dall'admin al momento della pubblicazione (vedi admin/actions.ts
// notifySurveyPublished), non è transazionale come le altre email di questo
// file.
export async function sendSurveyPublishedEmail(details: {
  to: string;
  fullName: string;
  surveyTitle: string;
  surveyUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !details.to) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: `Nuovo sondaggio — ${details.surveyTitle}`,
        html: surveyPublishedEmailHtml(details),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Promemoria on-demand per chi non ha ancora risposto a un sondaggio —
// inviato dall'admin quando vuole (vedi admin/actions.ts
// notifySurveyReminder), a differenza di sendSurveyPublishedEmail che parte
// una sola volta al momento della pubblicazione.
export async function sendSurveyReminderEmail(details: {
  to: string;
  fullName: string;
  surveyTitle: string;
  surveyUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !details.to) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: `Il sondaggio "${details.surveyTitle}" aspetta ancora 🤍`,
        html: surveyReminderEmailHtml(details),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Promemoria on-demand per chi non si è ancora iscritto a un evento —
// inviato dall'admin quando vuole (vedi admin/actions.ts
// notifyEventReminder).
export async function sendEventReminderEmail(details: {
  to: string;
  fullName: string;
  eventName: string;
  eventUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !details.to) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: `${details.eventName} si avvicina e... 🤍`,
        html: eventReminderEmailHtml(details),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Avviso al cliente che l'insegnante gli ha assegnato una nuova sequenza —
// inviato dall'admin al salvataggio (vedi admin/actions.ts
// notifySequenceAssigned), solo ai clienti appena aggiunti all'assegnazione.
export async function sendSequenceAssignedEmail(details: {
  to: string;
  fullName: string;
  sequenceName: string;
  sequenceUrl: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !details.to) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: `Nuova sequenza — ${details.sequenceName}`,
        html: sequenceAssignedEmailHtml(details),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Conferma al cliente che la sua richiesta di lezione individuale è stata
// accettata — inline (non in emailTemplates.ts) perché, come
// sendClassReminderEmail, ha bisogno della data formattata sullo stesso
// fuso esplicito (UTC) usato in tutto il file.
export async function sendIndividualClassAcceptedEmail(details: {
  to: string;
  fullName: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !details.to) return false;

  const dateLabel = new Date(`${details.date}T00:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ima-yoga.vercel.app";
  const firstName = details.fullName.split(" ")[0] || "!";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: `La tua lezione individuale è confermata — ${dateLabel} 🤍`,
        html: `
          <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
              <tr>
                <td style="padding:36px 32px 28px 32px; text-align:center;">
                  <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
                    ima yoga
                  </div>
                  <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
                    Lezione individuale confermata
                  </div>

                  <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 8px 0; text-align:left;">
                    Ciao ${firstName}!
                  </p>
                  <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">
                    La tua richiesta è confermata: ci vediamo <strong>${dateLabel}</strong> alle <strong>${details.time}</strong>, solo per te.
                  </p>

                  <a href="${siteUrl}/area/prenotazioni"
                     style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
                    Vai alla tua area
                  </a>

                  <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:28px 0 0 0;">
                    A presto ✨
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px; background:#F2EDF9; text-align:center;">
                  <span style="font-size:11px; color:#867CA0;">ima yoga</span>
                </td>
              </tr>
            </table>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendIndividualClassRejectedEmail(details: { to: string; fullName: string; note: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !details.to) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ima-yoga.vercel.app";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: "Aggiornamento sulla tua richiesta di lezione individuale",
        html: individualClassRejectedEmailHtml({ fullName: details.fullName, note: details.note, areaUrl: `${siteUrl}/area/prenotazioni` }),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Promemoria al cliente ~24h prima della lezione (vedi cron in
// app/api/cron/class-reminders). Ritorna true solo se l'invio è andato a
// buon fine, così il chiamante marca reminder_sent_at solo in quel caso.
// isToday copre il caso di recupero (il cron di ieri non è partito, o ha
// fallito): in quel caso la lezione è oggi e non domani, e il testo deve
// dirlo correttamente invece di continuare a parlare di "domani".
export async function sendClassReminderEmail(details: {
  to: string;
  firstName: string;
  className: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  isToday?: boolean;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  // Parse e formattazione sullo stesso fuso esplicito (UTC): senza,
  // new Date(...) usa il fuso locale del runtime per interpretare la
  // stringa e toLocaleDateString può finire per usarne un altro, dando
  // un giorno della settimana sbagliato per la data giusta — è già
  // successo in produzione ("domenica 14" per un 14 che era lunedì).
  const dateLabel = new Date(`${details.date}T00:00:00Z`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ima-yoga.vercel.app";
  const relativeDay = details.isToday ? "oggi" : "domani";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: `Ci vediamo ${details.isToday ? "stasera" : "domani"} per ${details.className} 🤍`,
        html: `
          <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
              <tr>
                <td style="padding:36px 32px 28px 32px; text-align:center;">
                  <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
                    ima yoga
                  </div>
                  <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
                    Promemoria lezione
                  </div>

                  <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 8px 0; text-align:left;">
                    Ciao ${details.firstName}!
                  </p>
                  <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 20px 0; text-align:left;">
                    Ti ricordo che ${relativeDay}, <strong>${dateLabel}</strong>, ti aspetto per <strong>${details.className}</strong> alle <strong>${details.time}</strong>.
                  </p>
                  <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:0 0 20px 0; text-align:left;">
                    Ricorda di portare il tuo tappetino e un asciugamano. Arriva con 5 minuti di anticipo, se arrivi prima, per favore aspetta senza suonare: potrebbero esserci altre lezioni o altre attività in corso.
                  </p>
                  <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">
                    Se non riesci più a venire, cancella dalla tua area il prima possibile. Dopo un certo orario il sistema non permette più la cancellazione online, in quel caso scrivimi direttamente.
                  </p>

                  <a href="${siteUrl}/area"
                     style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
                    Vai alla tua area
                  </a>

                  <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:28px 0 0 0;">
                    A presto ✨
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px; background:#F2EDF9; text-align:center;">
                  <span style="font-size:11px; color:#867CA0;">ima yoga</span>
                </td>
              </tr>
            </table>
          </div>
        `,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
