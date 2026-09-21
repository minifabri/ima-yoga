import Link from "next/link";
import { AtSign, Mail, MessageCircle } from "lucide-react";
import { Logo } from "./Logo";
import { CONTACT } from "./data";

export function Footer() {
  return (
    <footer id="contatti" className="cover-footer">
      <Logo compact />
      <div className="cover-footer-links">
        <a href={CONTACT.instagramUrl} className="cover-social" aria-label="Instagram">
          <AtSign size={15} />
        </a>
        <a href={CONTACT.whatsappUrl} className="cover-social" aria-label="WhatsApp">
          <MessageCircle size={15} />
        </a>
        <a href={`mailto:${CONTACT.email}`} className="cover-social" aria-label="Email">
          <Mail size={15} />
        </a>
        <Link href="/login" className="cover-footer-link">
          Accedi
        </Link>
      </div>
      <p className="cover-footer-copy">© {new Date().getFullYear()} ima yoga</p>
    </footer>
  );
}
