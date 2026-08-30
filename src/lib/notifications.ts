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
