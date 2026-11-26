import { CONTACT } from "./data";

// Nota "donazione libera" in cima al footer della copertina: una sola riga,
// senza titolo né pulsante, con il link al PayPal.Me dentro la frase. L'importo lo sceglie chi
// dona direttamente su PayPal. Finché in data.ts non c'è un link
// (CONTACT.paypalUrl vuoto) la nota non compare.
export function DonationCallout() {
  if (!CONTACT.paypalUrl) return null;

  return (
    <div className="donation-note" id="sostieni">
      <p>
        Se quello che condivido ti è utile, puoi sostenere Ima Yoga con{" "}
        <a href={CONTACT.paypalUrl} target="_blank" rel="noopener noreferrer">
          una donazione libera su PayPal
        </a>
        .
      </p>
    </div>
  );
}
