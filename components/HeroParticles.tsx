"use client";

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 7) % 100}%`,
  top: `${(i * 23 + 11) % 100}%`,
  size: 3 + (i % 4),
  delay: `${(i % 8) * 0.6}s`,
  duration: `${4 + (i % 5)}s`,
  color: ["#00e676", "#ffd700", "#ff3333", "#3388ff"][i % 4],
}));

export function HeroParticles() {
  return (
    <div className="hero-particles" aria-hidden>
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className="hero-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}