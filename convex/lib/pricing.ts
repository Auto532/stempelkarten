// Preisstufen nach Anzahl Kunden (verschiedene E-Mail-Adressen). KOPIE von affiliate-app/convex/pricing.ts
// (dort ist die einzige verbindliche Quelle, dort wird auch abgerechnet).
// Bei Preisänderungen BEIDE Dateien anpassen.

export type Tier = "free" | "starter" | "business" | "premium";

export const TIERS: readonly { id: Tier; name: string; monthly: number; maxCards: number | null }[] = [
  { id: "free",     name: "Free",     monthly: 0,  maxCards: 25  },
  { id: "starter",  name: "Starter",  monthly: 10, maxCards: 75  },
  { id: "business", name: "Business", monthly: 20, maxCards: 200 },
  { id: "premium",  name: "Premium",  monthly: 30, maxCards: null },
] as const;

export function tierInfo(tier: Tier) {
  return TIERS.find(t => t.id === tier) ?? TIERS[0];
}

export function tierForCardCount(cardCount: number): Tier {
  const n = Math.max(0, Math.floor(cardCount || 0));
  for (const t of TIERS) {
    if (t.maxCards === null || n <= t.maxCards) return t.id;
  }
  return "premium";
}

// "bis 25 Kunden" / "26 bis 75 Kunden" / "ab 201 Kunden"
export function tierRangeLabel(tier: Tier): string {
  const idx = TIERS.findIndex(t => t.id === tier);
  const t   = TIERS[idx];
  if (t.maxCards === null) return `ab ${(TIERS[idx - 1]?.maxCards ?? 0) + 1} Kunden`;
  if (idx === 0) return `bis ${t.maxCards} Kunden`;
  return `${(TIERS[idx - 1].maxCards ?? 0) + 1} bis ${t.maxCards} Kunden`;
}
