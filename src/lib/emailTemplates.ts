// Corpo HTML delle email transazionali, separato dall'invio vero e proprio
// (in notifications.ts, "use server") così che l'admin possa importarlo da
// un componente client per l'anteprima senza toccare Resend.

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
