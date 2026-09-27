import type { Metadata } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-display",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ima yoga",
  description: "Calendario classi, prenotazioni e gestionale — ima yoga",
};

// Il tema scuro è quello di default (bare :root in globals.css): basta impostare
// l'attributo quando serve il chiaro, sia per scelta esplicita salvata sia,
// in assenza di una scelta, perché il sistema operativo dell'utente è in chiaro.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('ima-yoga-theme');var light=t?t==='light':window.matchMedia('(prefers-color-scheme: light)').matches;if(light){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${cormorant.variable} ${montserrat.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
