import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";
import { InstagramIcon } from "./InstagramIcon";
import { DonationCallout } from "./DonationCallout";
import { NewsletterForm } from "./NewsletterForm";
import { CONTACT, type CoverAccess } from "./data";

export function Footer({ access, onHome }: { access: CoverAccess; onHome: () => void }) {
  return (
    <footer id="contatti" className="cover-footer">
      <NewsletterForm />
      <DonationCallout />
      <div className="cover-footer-row">
        <Logo compact href={access.home} onHome={onHome} />
        <div className="cover-footer-links">
          <a href={CONTACT.instagramUrl} className="cover-social" aria-label="Instagram">
            <InstagramIcon size={15} />
          </a>
          <a href={CONTACT.whatsappUrl} className="cover-social" aria-label="WhatsApp">
            <MessageCircle size={15} />
          </a>
          <a href={`mailto:${CONTACT.email}`} className="cover-social" aria-label="Email">
            <Mail size={15} />
          </a>
          <Link href={access.href} className="cover-footer-link">
            {access.label}
          </Link>
        </div>
        <p className="cover-footer-copy">
          © {new Date().getFullYear()} ima yoga ·{" "}
          <Link href="/privacy" className="cover-footer-legal">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/termini" className="cover-footer-legal">
            Termini
          </Link>
        </p>
      </div>
    </footer>
  );
}
