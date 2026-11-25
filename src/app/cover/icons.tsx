// Icone al tratto delle carte di copertina, ricalcate sul disegno di
// riferimento. Tutte condividono lo stesso riquadro (coordinate di una carta
// 230×275, viewBox sulla zona dell'icona), così le proporzioni tra un'icona e
// l'altra restano quelle originali. Colore: currentColor; l'unica nota d'oro
// è il secondo profilo di "Chi sono" (.cover-icon-accent).

function IconFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="cover-icon"
      viewBox="36 38 160 126"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Un'onda sinusoidale intera: il movimento della pratica.
export function LezioniIcon() {
  return (
    <IconFrame>
      <path d="M56 112 C60.9 107.3 65.8 102.6 70.8 99.3 C75.7 95.9 80.6 94 85.5 94 C90.4 94 95.3 95.9 100.2 99.3 C105.2 102.6 110.1 107.3 115 112 C119.9 116.7 124.8 121.4 129.8 124.7 C134.7 128.1 139.6 130 144.5 130 C149.4 130 154.3 128.1 159.2 124.7 C164.2 121.4 169.1 116.7 174 112" />
    </IconFrame>
  );
}

export function MeditazioneIcon() {
  return (
    <IconFrame>
      <circle cx="115" cy="113" r="37" />
    </IconFrame>
  );
}

export function CalendarioIcon() {
  return (
    <IconFrame>
      <rect x="80" y="75" width="77" height="77" />
    </IconFrame>
  );
}

// Un sentiero che si apre: le occasioni fuori dal calendario abituale.
export function EventiIcon() {
  return (
    <IconFrame>
      <path d="M42 158 C 52 128, 86 110, 112 94 C 124 86, 118 76, 108 70 C 102 66, 108 58, 120 56" />
      <path d="M120 63 C 112 65, 112 70, 122 76 C 134 84, 138 96, 140 108 C 142 128, 162 146, 190 158" />
    </IconFrame>
  );
}

// I due volti della vecchia carta "Chi sono": profilo ricavato dal contorno
// dell'illustrazione originale, il secondo è lo specchio del primo.
export function ChiSonoIcon() {
  return (
    <IconFrame>
      <path d="M115 42 C103.7 42 94.6 43.5 87.1 46.5 C79.5 49.5 74 54 71 61 C68.5 68 66 78 65.3 88 C63.5 93.5 60 98.5 58 102.5 C57.4 104.2 58.4 106.3 60.5 107.2 C61.7 107.7 62.6 108.3 62.8 109.3 C62.6 111 61.4 112.6 61.8 113.9 C62.3 115 64 115.5 64 116.6 C64 117.8 62.9 118.6 63.4 119.9 C64 121.2 66.4 121.8 66.4 123.3 C66.4 125.5 65.2 127.8 66.2 130 C67.6 132.6 71.5 133 75.8 132.4 C79.2 131.8 82.5 130 85.2 132.3 C88.2 135.5 90.5 146 91.6 157" />
      <path
        className="cover-icon-accent"
        d="M115 42 C126.3 42 135.4 43.5 142.9 46.5 C150.5 49.5 156 54 159 61 C161.5 68 164 78 164.7 88 C166.5 93.5 170 98.5 172 102.5 C172.6 104.2 171.6 106.3 169.5 107.2 C168.3 107.7 167.4 108.3 167.2 109.3 C167.4 111 168.6 112.6 168.2 113.9 C167.7 115 166 115.5 166 116.6 C166 117.8 167.1 118.6 166.6 119.9 C166 121.2 163.6 121.8 163.6 123.3 C163.6 125.5 164.8 127.8 163.8 130 C162.4 132.6 158.5 133 154.2 132.4 C150.8 131.8 147.5 130 144.8 132.3 C141.8 135.5 139.5 146 138.4 157"
      />
    </IconFrame>
  );
}

// Una vetta, o due mani che si incontrano.
export function ContattiIcon() {
  return (
    <IconFrame>
      <path d="M52 140 C 90 128, 112 110, 118 73 C 124 110, 146 128, 182 140" />
    </IconFrame>
  );
}
