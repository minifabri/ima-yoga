import { CONTACT } from "./data";

// Riquadro "donazione libera" della copertina: un semplice link al PayPal.Me,
// l'importo lo sceglie chi dona direttamente su PayPal. Finché in data.ts non
// c'è un link (CONTACT.paypalUrl vuoto) il riquadro non compare.
export function DonationCallout() {
  if (!CONTACT.paypalUrl) return null;

  return (
    <div className="online-callout" id="sostieni">
      <h2>Sostieni Ima Yoga.</h2>
      <p>
        Se quello che condivido ti è utile e ti va di sostenerlo, puoi lasciare una donazione libera: scegli tu
        l&apos;importo, in modo sicuro con PayPal.
      </p>
      <a href={CONTACT.paypalUrl} className="cover-cta-ghost" target="_blank" rel="noopener noreferrer">
        Dona con PayPal <span aria-hidden="true">✦</span>
      </a>
    </div>
  );
}
