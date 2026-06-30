"use client";

import { useState } from "react";

const COLORS = ["#22c55e", "#eab308", "#ef4444", "#3b82f6", "#a855f7", "#f97316"];

export function ConfettiBurst({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [burst, setBurst] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => {
        setBurst(true);
        setTimeout(() => setBurst(false), 900);
      }}
    >
      {burst &&
        Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="confetti-particle pointer-events-none absolute left-1/2 top-1/2 z-20"
            style={{
              backgroundColor: COLORS[i % COLORS.length],
              animationDelay: `${i * 25}ms`,
              transform: `rotate(${i * 26}deg)`,
            }}
          />
        ))}
      {children}
    </div>
  );
}