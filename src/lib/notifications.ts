"use server";

// Avvisa l'admin via email quando una classe raggiunge il numero massimo di
// iscritti. Se RESEND_API_KEY o ADMIN_NOTIFICATION_EMAIL non sono configurate
// (vedi .env.local.example), non fa nulla — non deve mai bloccare una
// prenotazione per un problema di invio email.
export async function notifyClassFull(details: { className: string; date: string; time: string; capacity: number }) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!apiKey || !to) return;

  const dateLabel = new Date(`${details.date}T00:00:00`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

// Promemoria al cliente ~24h prima della lezione (vedi cron in
// app/api/cron/class-reminders). Ritorna true solo se l'invio è andato a
// buon fine, così il chiamante marca reminder_sent_at solo in quel caso.
export async function sendClassReminderEmail(details: {
  to: string;
  firstName: string;
  className: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const dateLabel = new Date(`${details.date}T00:00:00`).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ima-yoga.vercel.app";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "ima yoga <onboarding@resend.dev>",
        to: details.to,
        subject: `Ci vediamo domani per ${details.className} 🤍`,
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
                    Ti ricordo che domani, <strong>${dateLabel}</strong>, ti aspetto per <strong>${details.className}</strong> alle <strong>${details.time}</strong>.
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
