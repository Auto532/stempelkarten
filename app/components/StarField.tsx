"use client";
import { useMemo } from "react";

const STAR_COUNT = 90;

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function StarField() {
  const stars = useMemo(() => {
    const r = lcg(8191);
    return Array.from({ length: STAR_COUNT }, (_, i) => {
      const size = r() * 2.2 + 0.6;
      const isAmber = r() > 0.6;
      return {
        id: i,
        x: r() * 100,
        y: r() * 100,
        size,
        duration: 9 + r() * 22,
        delay: -(r() * 28),
        opacity: 0.18 + r() * 0.58,
        isAmber,
      };
    });
  }, []);

  return (
    <div
      aria-hidden
      className="fixed inset-0 overflow-hidden pointer-events-none"
    >
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            background: s.isAmber ? "#fbbf24" : "#d4d4d8",
            opacity: s.opacity,
            boxShadow: s.isAmber
              ? `0 0 ${s.size * 4}px ${s.size * 1.2}px rgba(251,191,36,0.4)`
              : `0 0 ${s.size * 3}px ${s.size}px rgba(212,212,216,0.28)`,
            animation: `starFloat ${s.duration}s ${s.delay}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}
