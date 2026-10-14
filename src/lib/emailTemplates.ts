// Corpo HTML delle email transazionali, separato dall'invio vero e proprio
// (in notifications.ts, "use server") così che l'admin possa importarlo da
// un componente client per l'anteprima senza toccare Resend.

const FOOTER_SPAN = `<span style="font-size:11px; color:#867CA0;">ima yoga</span>`;

// Email non legate a una prenotazione (nuove classi, inviti a eventi e sondaggi): per legge
// ognuna deve permettere di disiscriversi, con un link nel piè di pagina.
export function withUnsubscribeFooter(html: string, unsubscribeUrl: string | null | undefined): string {
  if (!unsubscribeUrl) return html;
  return html.replace(
    FOOTER_SPAN,
    `${FOOTER_SPAN}<br /><a href="${unsubscribeUrl}" style="font-size:11px; color:#867CA0; text-decoration:underline;">Non voglio più ricevere email su nuove classi, eventi e sondaggi</a>`
  );
}

export function surveyPublishedEmailHtml(details: { fullName: string; surveyTitle: string; surveyUrl: string }): string {
  const firstName = details.fullName.split(" ")[0] || "!";
  return `
    <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
        <tr>
          <td style="padding:36px 32px 28px 32px; text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
              ima yoga
            </div>
            <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
              Nuovo sondaggio
            </div>

            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 8px 0; text-align:left;">
              Ciao ${firstName}!
            </p>
            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">
              È disponibile un nuovo sondaggio: <strong>${details.surveyTitle}</strong>. Sarà più breve di uno shavasana, promesso.
            </p>

            <a href="${details.surveyUrl}"
               style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
              Rispondi al sondaggio
            </a>

            <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:28px 0 0 0;">
              Grazie ✨
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
  `;
}

export function surveyReminderEmailHtml(details: { fullName: string; surveyTitle: string; surveyUrl: string }): string {
  const firstName = details.fullName.split(" ")[0] || "!";
  return `
    <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
        <tr>
          <td style="padding:36px 32px 28px 32px; text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
              ima yoga
            </div>
            <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
              Promemoria sondaggio
            </div>

            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 8px 0; text-align:left;">
              Ciao ${firstName}!
            </p>
            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">
              Ti va di dedicare un minuto al sondaggio <strong>${details.surveyTitle}</strong>? Le tue risposte mi aiutano a capire come indirizzare meglio le energie su ima yoga.
            </p>

            <a href="${details.surveyUrl}"
               style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
              Rispondi al sondaggio
            </a>

            <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:28px 0 0 0;">
              Grazie ✨
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
  `;
}

export function eventReminderEmailHtml(details: { fullName: string; eventName: string; eventUrl: string }): string {
  const firstName = details.fullName.split(" ")[0] || "!";
  return `
    <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
        <tr>
          <td style="padding:36px 32px 28px 32px; text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
              ima yoga
            </div>
            <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
              Promemoria iscrizione
            </div>

            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">
              C'è ancora un posto per te, ${firstName}. Ti va di esserci?
            </p>

            <a href="${details.eventUrl}"
               style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
              Iscriviti all'evento
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
  `;
}

// Nessuna data qui (a differenza dell'accettazione, vedi
// sendIndividualClassAcceptedEmail in notifications.ts): il rifiuto non ha un
// orario da mostrare, solo l'eventuale nota dell'admin — stesso motivo per
// cui questo template vive qui e non inline come le email che parlano di date.
export function individualClassRejectedEmailHtml(details: { fullName: string; note: string; areaUrl: string }): string {
  const firstName = details.fullName.split(" ")[0] || "!";
  return `
    <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
        <tr>
          <td style="padding:36px 32px 28px 32px; text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
              ima yoga
            </div>
            <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
              Richiesta lezione individuale
            </div>

            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 8px 0; text-align:left;">
              Ciao ${firstName}!
            </p>
            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 20px 0; text-align:left;">
              Purtroppo non riesco a confermare la tua richiesta di lezione individuale per le date proposte.
            </p>
            ${details.note ? `<p style="font-size:14px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">${details.note}</p>` : ""}

            <a href="${details.areaUrl}"
               style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
              Richiedi un'altra data
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
  `;
}

export function sequenceAssignedEmailHtml(details: { fullName: string; sequenceName: string; sequenceUrl: string }): string {
  const firstName = details.fullName.split(" ")[0] || "!";
  return `
    <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
        <tr>
          <td style="padding:36px 32px 28px 32px; text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
              ima yoga
            </div>
            <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
              Nuova sequenza
            </div>

            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 8px 0; text-align:left;">
              Ciao ${firstName}!
            </p>
            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 28px 0; text-align:left;">
              Ti ho preparato una nuova sequenza: <strong>${details.sequenceName}</strong>.
            </p>

            <a href="${details.sequenceUrl}"
               style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
              Vai alla sequenza
            </a>

            <p style="font-size:14px; line-height:1.6; color:#362D4A; margin:28px 0 0 0;">
              Buona pratica ✨
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
  `;
}

// Avviso di nuove classi pubblicate (vedi app/api/new-classes/notify): un
// unico riepilogo anche quando l'admin ne pubblica tante di fila.
export function newClassesEmailHtml(details: {
  fullName: string;
  classes: { dateLabel: string; time: string; name: string }[];
  calendarUrl: string;
}): string {
  const firstName = details.fullName.split(" ")[0] || "!";
  const MAX_ROWS = 12;
  const shown = details.classes.slice(0, MAX_ROWS);
  const hidden = details.classes.length - shown.length;
  const intro =
    details.classes.length === 1
      ? "È in calendario una nuova classe:"
      : `Sono in calendario ${details.classes.length} nuove classi:`;
  const rows = shown
    .map(
      (c) => `
              <tr>
                <td style="padding:6px 0; font-size:14px; color:#362D4A; border-bottom:1px solid #F2EDF9;">
                  <strong>${c.name}</strong><br />
                  <span style="font-size:13px; color:#867CA0;">${c.dateLabel} alle ${c.time}</span>
                </td>
              </tr>`
    )
    .join("");
  return `
    <div style="background-color:#FAF7F2; padding:40px 16px; font-family:Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px; margin:0 auto; background:#FFFFFF; border-radius:18px; overflow:hidden; border:1px solid #E4DAF0;">
        <tr>
          <td style="padding:36px 32px 28px 32px; text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:30px; color:#4A3A73; margin-bottom:4px;">
              ima yoga
            </div>
            <div style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#D6B36A; font-weight:700; margin-bottom:28px;">
              ${details.classes.length === 1 ? "Nuova classe" : "Nuove classi"}
            </div>

            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 8px 0; text-align:left;">
              Ciao ${firstName}!
            </p>
            <p style="font-size:15px; line-height:1.6; color:#362D4A; margin:0 0 12px 0; text-align:left;">
              ${intro}
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="text-align:left; margin:0 0 ${hidden > 0 ? 8 : 28}px 0;">${rows}
            </table>
            ${hidden > 0 ? `<p style="font-size:13px; color:#867CA0; margin:0 0 28px 0; text-align:left;">…e altre ${hidden}.</p>` : ""}

            <a href="${details.calendarUrl}"
               style="display:inline-block; background:#8E72C7; color:#FFFFFF; text-decoration:none; font-size:14px; font-weight:600; padding:12px 28px; border-radius:10px;">
              Prenota il tuo posto
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
  `;
}
