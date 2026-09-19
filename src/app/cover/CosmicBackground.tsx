// Sfondo cosmico a più livelli: nebulosa, stelle, orbite — tutto CSS/SVG,
// nessun canvas/WebGL. Ogni livello si muove in modo indipendente e molto
// lento (vedi .cosmic-* in globals.css). Puramente decorativo (aria-hidden).

// Posizioni generate una volta sola con un PRNG seeded, così SSR e client
// producono lo stesso markup (niente Math.random a ogni render).
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeStars(count: number, seed: number) {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand() * 100,
    y: rand() * 100,
    size: 0.6 + rand() * 1.6,
    delay: rand() * 8,
    duration: 3 + rand() * 5,
  }));
}

const STARS_FAR = makeStars(70, 42);
const STARS_NEAR = makeStars(28, 137);

export function CosmicBackground({ variant = "hero" }: { variant?: "hero" | "section" }) {
  return (
    <div className={`cosmic-bg cosmic-bg-${variant}`} aria-hidden="true">
      <div className="cosmic-layer cosmic-nebula-1" />
      <div className="cosmic-layer cosmic-nebula-2" />

      <svg className="cosmic-layer cosmic-stars-far" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {STARS_FAR.map((s) => (
          <circle
            key={s.id}
            cx={s.x}
            cy={s.y}
            r={s.size * 0.09}
            fill="var(--ink)"
            className="cosmic-star"
            style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
          />
        ))}
      </svg>

      <svg className="cosmic-layer cosmic-stars-near" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {STARS_NEAR.map((s) => (
          <circle
            key={s.id}
            cx={s.x}
            cy={s.y}
            r={s.size * 0.14}
            fill="var(--gold)"
            className="cosmic-star"
            style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
          />
        ))}
      </svg>

      <svg className="cosmic-layer cosmic-orbits" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <circle cx="50" cy="46" r="30" className="cosmic-orbit-ring" style={{ animationDuration: "120s" }} />
        <circle cx="50" cy="46" r="40" className="cosmic-orbit-ring" style={{ animationDuration: "180s", animationDirection: "reverse" }} />
      </svg>

      <div className="cosmic-layer cosmic-glow" />
    </div>
  );
}
