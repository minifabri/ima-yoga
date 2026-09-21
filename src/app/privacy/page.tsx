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
          Ultimo aggiornamento: 18 settembre 2026
        </p>

        <div className="flex flex-col gap-5" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
          <p style={{ background: "var(--subtle)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "var(--ink-soft)" }}>
            Bozza informativa: se possibile, fai rivedere il testo da un professionista (commercialista o legale)
            prima di considerarla definitiva.
          </p>

          <Section title="1. Titolare del trattamento">
            <p>
              Fabrizia Binetti
              <br />
              Email di contatto: <a href="mailto:blasta.fb@gmail.com" style={linkStyle}>blasta.fb@gmail.com</a>
            </p>
          </Section>

          <Section title="2. Quali dati raccogliamo e perché">
            <p><strong>Dati dell&apos;account.</strong> Quando crei un account (email e password, oppure con Google) raccogliamo nome e cognome, email, telefono (facoltativo). Se ti registri con Google, riceviamo da Google nome, email e foto profilo (se presente) — usiamo questi dati solo per creare e riconoscere il tuo account, non abbiamo accesso alla tua password Google.</p>
            <p><strong>Dati di prenotazione.</strong> Le lezioni ed eventi che prenoti, le presenze, i pacchetti acquistati: servono a gestire il servizio che ci hai richiesto.</p>
            <p><strong>Log di sicurezza.</strong> Per i tentativi di accesso registriamo indirizzo IP e user agent del browser, a scopo di sicurezza e prevenzione di abusi.</p>
            <p><strong>Statistiche di utilizzo.</strong> Un identificativo anonimo salvato nel tuo browser (non un cookie di profilazione, non ci segue su altri siti) ci aiuta a contare le visite. Usiamo anche Vercel Analytics, che raccoglie statistiche aggregate sulle pagine visitate senza cookie e senza identificare le singole persone.</p>
          </Section>

          <Section title="3. Base giuridica del trattamento">
            <p>Trattiamo i tuoi dati per eseguire il servizio che ci richiedi (prenotare e gestire le lezioni), per obblighi di legge dove applicabili, e per il nostro legittimo interesse a mantenere il servizio sicuro e funzionante.</p>
          </Section>

          <Section title="4. Con chi condividiamo i dati">
            <p>Ci appoggiamo ad alcuni fornitori che trattano i dati per nostro conto, solo per fornire il servizio:</p>
            <ul className="list-disc pl-5 flex flex-col gap-1">
              <li><strong>Supabase</strong> — database e autenticazione (server nell&apos;Unione Europea, Francoforte)</li>
              <li><strong>Google</strong> — solo se scegli di accedere/registrarti con il tuo account Google</li>
              <li><strong>Resend</strong> — invio delle email transazionali (conferme, promemoria lezione)</li>
              <li><strong>Vercel</strong> — hosting del sito e statistiche di utilizzo aggregate e anonime</li>
            </ul>
            <p>Non vendiamo né condividiamo i tuoi dati con terzi per finalità pubblicitarie.</p>
          </Section>

          <Section title="5. Conservazione dei dati">
            <p>Conserviamo i tuoi dati finché il tuo account resta attivo. Puoi chiedere la cancellazione del tuo account e dei relativi dati in qualsiasi momento.</p>
          </Section>

          <Section title="6. I tuoi diritti">
            <p>Puoi chiederci in qualsiasi momento di accedere ai tuoi dati, correggerli, cancellarli, riceverne una copia, oppure opporti al trattamento, scrivendo a <a href="mailto:blasta.fb@gmail.com" style={linkStyle}>blasta.fb@gmail.com</a>. Hai anche diritto di proporre reclamo al Garante per la protezione dei dati personali.</p>
          </Section>

          <Section title="7. Minori">
            <p>Il servizio non è pensato per essere usato da minori di 16 anni senza il consenso di un genitore o tutore.</p>
          </Section>

          <Section title="8. Modifiche a questa informativa">
            <p>Possiamo aggiornare questa informativa nel tempo; la data in cima alla pagina indica l&apos;ultimo aggiornamento.</p>
          </Section>

          <p className="mt-2">
            <Link href="/login" style={linkStyle}>← Torna al login</Link>
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
