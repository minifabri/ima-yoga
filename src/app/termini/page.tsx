import Link from "next/link";

export const metadata = {
  title: "ima yoga: termini del servizio",
};

export default function TerminiPage() {
  return (
    <main className="flex-1 flex justify-center p-5" style={{ background: "var(--bg)" }}>
      <div
        className="w-full p-6 sm:p-8 rounded-2xl"
        style={{ maxWidth: 720, background: "var(--card)", border: "1px solid var(--border)", margin: "24px 0" }}
      >
        <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, color: "var(--heading)" }}>
          Termini del servizio
        </div>
        <p className="mt-1 mb-6" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
          Ultimo aggiornamento: 14 ottobre 2026
        </p>

        <div className="flex flex-col gap-5" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink)" }}>
          <Section title="1. Chi offre il servizio">
            <p>
              ima yoga è il progetto di Fabrizia Binetti, insegnante di yoga, che lo porta avanti come persona fisica, senza
              attività commerciale. Contatti: <a href="mailto:blasta.fb@gmail.com" style={linkStyle}>blasta.fb@gmail.com</a>.
            </p>
          </Section>

          <Section title="2. Il servizio">
            <p>Tramite il sito e l&apos;app puoi consultare il calendario, prenotare lezioni di gruppo ed eventi, chiedere lezioni individuali, rispondere a sondaggi e seguire sequenze di pratica preparate per te.</p>
            <p>Le lezioni e i pacchetti di lezioni sono offerti a titolo gratuito. Per alcuni eventi può essere indicato un contributo: in quel caso l&apos;importo è mostrato prima della prenotazione e si versa di persona, non tramite l&apos;app. Le donazioni sono libere e facoltative, avvengono su PayPal e non danno diritto a prestazioni.</p>
          </Section>

          <Section title="3. Account">
            <p>Per prenotare le lezioni serve un account personale. Devi avere almeno 16 anni; chi è più giovane può partecipare solo tramite un genitore o tutore che ci contatta direttamente. Sei responsabile di custodire la tua password e di fornire dati corretti.</p>
            <p>Puoi eliminare il tuo account in qualsiasi momento dalla tua area. Possiamo sospendere un account usato in modo scorretto o in violazione di questi termini.</p>
          </Section>

          <Section title="4. Prenotazioni e disdette">
            <p>I posti sono limitati: quando una lezione è piena puoi metterti in lista d&apos;attesa e, se si libera un posto, passi in automatico tra i prenotati. Se non puoi partecipare, disdici dall&apos;app il prima possibile, così il posto passa a qualcun altro. Per alcuni eventi la disdetta online può essere disattivata: in quel caso scrivici.</p>
            <p>Lezioni ed eventi possono essere spostati o annullati (per esempio per malattia o cause di forza maggiore): ti avvisiamo appena possibile e, se avevi versato un contributo per un evento annullato, ti viene restituito.</p>
          </Section>

          <Section title="5. Salute e responsabilità">
            <p>Lo yoga è un&apos;attività fisica. Prima di iniziare, e in caso di gravidanza, infortuni, patologie o dubbi sul tuo stato di salute, consulta il tuo medico. Informa l&apos;insegnante di qualsiasi condizione rilevante prima della lezione.</p>
            <p>Durante la pratica rispetta i tuoi limiti: fermati in caso di dolore o malessere. Le indicazioni dell&apos;insegnante e le sequenze nell&apos;app non sostituiscono in alcun modo un parere medico o fisioterapico. Quando pratichi da sola/o con le sequenze dell&apos;app, lo fai in autonomia e sotto la tua responsabilità.</p>
            <p>Restano ferme le responsabilità che la legge non consente di escludere, in particolare per dolo o colpa grave.</p>
          </Section>

          <Section title="6. Contenuti">
            <p>Testi, immagini, sequenze e materiali dell&apos;app appartengono a ima yoga o ai rispettivi autori: puoi usarli per la tua pratica personale, ma non copiarli, ridistribuirli o usarli a fini commerciali senza permesso. I link a playlist e servizi esterni (es. Spotify, YouTube) portano a siti di terzi, con i loro termini.</p>
            <p>Quello che scrivi nell&apos;app (richieste, segnalazioni, risposte ai sondaggi) lo legge solo l&apos;insegnante: ti chiediamo di non inserire contenuti offensivi o dati di altre persone senza il loro consenso.</p>
          </Section>

          <Section title="7. Privacy">
            <p>Come trattiamo i tuoi dati è spiegato nell&apos;<Link href="/privacy" style={linkStyle}>Informativa Privacy</Link>.</p>
          </Section>

          <Section title="8. Modifiche e legge applicabile">
            <p>Possiamo aggiornare questi termini; la data in cima alla pagina indica l&apos;ultima versione e, per modifiche importanti, te lo segnaliamo nella tua area. Si applica la legge italiana; restano salvi i diritti che ti riconosce il Codice del Consumo, compreso il foro del tuo luogo di residenza.</p>
          </Section>

          <p className="mt-2">
            <Link href="/privacy" style={linkStyle}>Informativa Privacy</Link>
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
