import Link from "next/link";

export const metadata = {
  title: "ima yoga: informativa privacy",
};

export default function PrivacyPage() {
  return (
    <main className="flex-1 flex justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 sm:p-8 rounded-2xl"
        style={{ maxWidth: 720, background: "var(--card)", border: "1px solid var(--border)", margin: "24px 0" }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}>
          Informativa Privacy
        </div>
        <p className="mt-1 mb-6" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Ultimo aggiornamento: 14 ottobre 2026
        </p>

        <div className="flex flex-col gap-5" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
          <Section title="1. Titolare del trattamento">
            <p>
              Fabrizia Binetti, insegnante di yoga (persona fisica, attività non commerciale)
              <br />
              Email di contatto: <a href="mailto:blasta.fb@gmail.com" style={linkStyle}>blasta.fb@gmail.com</a>
            </p>
          </Section>

          <Section title="2. Quali dati raccogliamo e perché">
            <p><strong>Dati dell&apos;account.</strong> Quando crei un account (email e password, oppure con Google) raccogliamo nome e cognome, email, telefono (facoltativo) e la tua dichiarazione di avere almeno 16 anni. Se ti registri con Google, riceviamo da Google nome, email e foto profilo (se presente): li usiamo solo per creare e riconoscere il tuo account, non abbiamo accesso alla tua password Google.</p>
            <p><strong>Dati di prenotazione.</strong> Le lezioni ed eventi che prenoti, le presenze, i pacchetti regalati: servono a gestire il servizio che ci hai richiesto.</p>
            <p><strong>Prenotazioni agli eventi senza account.</strong> Se prenoti un evento senza registrarti, raccogliamo nome e cognome ed email. Se porti qualcuno con te, ci indichi anche il nome della persona che ti accompagna (informala tu che ce lo comunichi). Usiamo questi dati solo per gestire quella prenotazione e scriverti in merito all&apos;evento.</p>
            <p><strong>Messaggi dal form contatti.</strong> Nome, email e testo del messaggio ci arrivano via email e li usiamo solo per risponderti.</p>
            <p><strong>Richieste e segnalazioni.</strong> Quando chiedi una lezione individuale o ci segnali un problema, salviamo le note e i messaggi che scrivi, per poterti rispondere.</p>
            <p><strong>Sondaggi.</strong> Se rispondi a un sondaggio con il tuo account, le risposte sono collegate al tuo profilo. Senza account puoi lasciare il tuo nome oppure rispondere in forma anonima.</p>
            <p><strong>Sequenze personalizzate e informazioni sulla salute.</strong> La tua insegnante può preparare per te sequenze di pratica personalizzate. Se le racconti di infortuni, dolori, gravidanza o altre condizioni fisiche, può annotarle per adattare la pratica. Sono dati particolari (art. 9 GDPR): li usiamo solo se dai il consenso dalla tua area, alla voce «Privacy e consensi». Sono visibili solo a te e alla tua insegnante, non vengono mai condivisi con altri allievi e puoi revocare il consenso in qualsiasi momento.</p>
            <p><strong>Email su eventi e sondaggi.</strong> Solo se lo scegli (alla registrazione o in «Privacy e consensi») ti scriviamo per invitarti a nuovi eventi e sondaggi. Ogni email contiene un link per non riceverle più. Le email legate alle tue prenotazioni (conferme, promemoria delle lezioni) fanno parte del servizio e arrivano comunque.</p>
            <p><strong>Notifiche push.</strong> Solo se le attivi tu dal telefono: salviamo l&apos;indirizzo tecnico che il browser ci fornisce per recapitarle. Puoi disattivarle quando vuoi.</p>
            <p><strong>Log di sicurezza.</strong> Per accessi e operazioni sull&apos;account registriamo indirizzo IP e user agent del browser, a scopo di sicurezza e prevenzione di abusi.</p>
            <p><strong>Statistiche di utilizzo.</strong> Un identificativo casuale salvato nel tuo browser (localStorage, non un cookie di profilazione, non ti segue su altri siti e non viene collegato al tuo account) ci aiuta a contare le visite. Usiamo anche Vercel Analytics, che raccoglie statistiche aggregate sulle pagine visitate senza cookie e senza identificare le singole persone.</p>
            <p><strong>Donazioni.</strong> Se scegli di fare una donazione, avviene interamente su PayPal: noi non riceviamo i tuoi dati di pagamento. PayPal tratta i tuoi dati come titolare autonomo, secondo la sua informativa.</p>
          </Section>

          <Section title="3. Base giuridica del trattamento">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Esecuzione del servizio</strong> (art. 6.1.b GDPR): account, prenotazioni, email di servizio, richieste, sondaggi.</li>
              <li><strong>Consenso</strong> (art. 6.1.a e 9.2.a GDPR): email su eventi e sondaggi, informazioni sulla salute, notifiche push. Puoi revocarlo in qualsiasi momento, senza conseguenze sul resto del servizio.</li>
              <li><strong>Legittimo interesse</strong> (art. 6.1.f GDPR): sicurezza del servizio (log) e statistiche anonime di utilizzo.</li>
            </ul>
          </Section>

          <Section title="4. Con chi condividiamo i dati">
            <p>Ci appoggiamo ad alcuni fornitori che trattano i dati per nostro conto, solo per fornire il servizio:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Supabase</strong> — database e autenticazione (server nell&apos;Unione Europea, Francoforte)</li>
              <li><strong>Vercel</strong> — hosting del sito e statistiche aggregate e anonime (Vercel Inc., USA)</li>
              <li><strong>Resend</strong> — invio delle email (Resend Inc., USA)</li>
              <li><strong>Google</strong> — solo se scegli di accedere/registrarti con il tuo account Google (Google LLC, USA)</li>
              <li><strong>Servizi push di Apple, Google o Mozilla</strong> — solo se attivi le notifiche, per recapitarle al tuo dispositivo</li>
            </ul>
            <p>Alcuni di questi fornitori hanno sede negli Stati Uniti: il trasferimento dei dati avviene sulla base della decisione di adeguatezza UE-USA (EU-U.S. Data Privacy Framework) per le aziende certificate o, in alternativa, delle Clausole Contrattuali Standard approvate dalla Commissione Europea.</p>
            <p>Non vendiamo né condividiamo i tuoi dati con terzi per finalità pubblicitarie.</p>
          </Section>

          <Section title="5. Conservazione dei dati">
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Account e prenotazioni:</strong> finché l&apos;account resta attivo. Se elimini l&apos;account, cancelliamo l&apos;accesso, nome, telefono, note e consensi; lo storico delle lezioni svolte resta solo in forma anonima.</li>
              <li><strong>Informazioni sulla salute:</strong> finché il consenso è attivo; alla revoca o alla cancellazione dell&apos;account smettiamo di usarle e le eliminiamo.</li>
              <li><strong>Prenotazioni senza account e risposte ai sondaggi:</strong> per il tempo necessario a gestire l&apos;evento o il sondaggio; puoi chiederne la cancellazione quando vuoi.</li>
              <li><strong>Messaggi dal form contatti:</strong> nella casella email dell&apos;insegnante, per il tempo necessario a risponderti.</li>
              <li><strong>IP e user agent dei log di sicurezza:</strong> 12 mesi, poi vengono cancellati automaticamente.</li>
              <li><strong>Statistiche delle visite:</strong> 25 mesi, poi vengono cancellate automaticamente.</li>
            </ul>
          </Section>

          <Section title="6. Cookie e archiviazione nel browser">
            <p>Usiamo solo strumenti tecnici, necessari al funzionamento del sito, per cui non serve il tuo consenso (art. 122 Codice Privacy):</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Cookie di sessione di Supabase</strong> — ti tengono collegata/o al tuo account.</li>
              <li><strong>localStorage</strong> — ricorda il tema chiaro/scuro scelto e l&apos;identificativo casuale per contare le visite (vedi sopra).</li>
            </ul>
            <p>Non usiamo cookie di profilazione, pubblicitari o di terze parti, né strumenti che registrano le sessioni di navigazione.</p>
          </Section>

          <Section title="7. I tuoi diritti">
            <p>Puoi chiederci in qualsiasi momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne il trattamento, riceverne una copia (portabilità), oppure opporti al trattamento, scrivendo a <a href="mailto:blasta.fb@gmail.com" style={linkStyle}>blasta.fb@gmail.com</a>. Rispondiamo entro un mese. Puoi anche eliminare da sola/o il tuo account dalla tua area e gestire i consensi alla voce «Privacy e consensi».</p>
            <p>Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" style={linkStyle} target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).</p>
          </Section>

          <Section title="8. Minori">
            <p>Il servizio è riservato a chi ha almeno 16 anni: alla registrazione ti chiediamo di dichiararlo. Chi ha meno di 16 anni può partecipare alle lezioni solo tramite un genitore o tutore, che ci contatta direttamente. Se scopriamo che un account appartiene a una persona più giovane, lo eliminiamo.</p>
          </Section>

          <Section title="9. Modifiche a questa informativa">
            <p>Possiamo aggiornare questa informativa nel tempo; la data in cima alla pagina indica l&apos;ultimo aggiornamento. Se le modifiche sono importanti, te lo segnaliamo nella tua area.</p>
          </Section>

          <p className="mt-2">
            <Link href="/termini" style={linkStyle}>Termini del servizio</Link>
            {" · "}
            <Link href="/" style={linkStyle}>← Torna al sito</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: 15.5, fontWeight: 600, color: "var(--heading)", marginBottom: 6 }}>{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

const linkStyle: React.CSSProperties = { color: "var(--primary-dark)", fontWeight: 600 };
