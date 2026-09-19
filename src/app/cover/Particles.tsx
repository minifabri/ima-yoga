// Poche particelle luminose che salgono lentissime — leggere, opacità bassa,
// non devono distrarre. Distinte dal campo stelle di CosmicBackground.

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seededRandom(777);
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: rand() * 100,
  size: 2 + rand() * 3,
  delay: rand() * 14,
  duration: 12 + rand() * 10,
  drift: (rand() - 0.5) * 40,
}));

export function Particles() {
  return (
    <div className="cosmic-particles" aria-hidden="true">
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className="cosmic-particle"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--drift": `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
