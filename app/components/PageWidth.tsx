"use client";

import { usePathname } from "next/navigation";

// Seitenbreite: Kunden-, Betrieb- und Mitarbeiter-Seiten sind bewusst schmal
// (Handy-Layout, auch am PC zentriert). Der Admin-Bereich bringt ein eigenes
// Layout mit (Handy: Navigation unten, PC: Seitenleiste) und braucht die volle
// Breite, sonst wirkt er am PC eingequetscht.
const FULL_WIDTH_PREFIXES = ["/zk7-verwaltung-9x2"];

export function PageWidth({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const fullWidth = FULL_WIDTH_PREFIXES.some(p => pathname.startsWith(p));
  return (
    <div className={fullWidth ? "min-h-screen relative" : "max-w-sm mx-auto min-h-screen relative"}>
      {children}
    </div>
  );
}
