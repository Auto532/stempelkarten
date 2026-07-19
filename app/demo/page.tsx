"use client";

// ── Live-Demo für den Verkauf ─────────────────────────────────────────────────
// Betriebe scannen den QR-Code des Partners und landen hier: interaktive
// Stempelkarte OHNE Registrierung, ohne App, ohne Datenbank — Stempel geben,
// Animation sehen, Designs durchschalten. Rein clientseitig.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Stamp, RotateCcw } from "lucide-react";
import { getShopTheme, THEME_LIST, type ThemeConfig } from "@/app/me/themes/registry";
import type { ShopDesignConfig } from "@/app/me/themes/configTheme";

const MAX_STAMPS = 15;

// Config-Design-Beispiele (zeigen, dass auch ohne Signature-Theme viel geht)
const CONFIG_DEMOS: { id: string; label: string; color: string; config: ShopDesignConfig }[] = [
  {
    id: "standard", label: "Standard", color: "#fbbf24",
    config: { accent: "#fbbf24", text: "#f4f4f5", textBody: "#a1a1aa", cardBg: "#18181b", bgType: "gradient", bgColor: "#09090b", bgColor2: "#1c1917", stampIcon: "stamp", cardStyle: "glow" },
  },
  {
    id: "ozean", label: "Ozean", color: "#60a5fa",
    config: { accent: "#60a5fa", text: "#eff6ff", textBody: "#94a3b8", cardBg: "#0f172a", bgType: "gradient", bgColor: "#020617", bgColor2: "#0f1e3a", stampIcon: "fish", cardStyle: "glow" },
  },
  {
    id: "rose", label: "Rosé", color: "#ec4899",
    config: { accent: "#ec4899", text: "#2c1020", textBody: "#8c6578", cardBg: "#fff7fb", bgType: "gradient", bgColor: "#ffeef7", bgColor2: "#ffd6e9", stampIcon: "heart", cardStyle: "classic" },
  },
  {
    id: "wald", label: "Wald", color: "#4ade80",
    config: { accent: "#4ade80", text: "#ecfdf5", textBody: "#86a596", cardBg: "#0e1f14", bgType: "gradient", bgColor: "#06120a", bgColor2: "#10291a", stampIcon: "leaf", cardStyle: "glow" },
  },
  {
    id: "sonne", label: "Sonne", color: "#f59e0b",
    config: { accent: "#f59e0b", text: "#451a03", textBody: "#a16207", cardBg: "#fffdf7", bgType: "gradient", bgColor: "#fffbeb", bgColor2: "#fde9c8", stampIcon: "sun", cardStyle: "classic" },
  },
  {
    id: "nacht", label: "Nachtviolett", color: "#a78bfa",
    config: { accent: "#a78bfa", text: "#f5f3ff", textBody: "#8b7fb8", cardBg: "#150d29", bgType: "gradient", bgColor: "#0b0716", bgColor2: "#1e1038", stampIcon: "sparkles", cardStyle: "glow" },
  },
  {
    id: "ruby", label: "Ruby", color: "#f87171",
    config: { accent: "#f87171", text: "#fef2f2", textBody: "#b07a7a", cardBg: "#200a0c", bgType: "gradient", bgColor: "#160607", bgColor2: "#2b0d10", stampIcon: "crown", cardStyle: "glow" },
  },
  {
    id: "mint", label: "Mint", color: "#10b981",
    config: { accent: "#10b981", text: "#064e3b", textBody: "#059669", cardBg: "#ffffff", bgType: "gradient", bgColor: "#ecfdf5", bgColor2: "#d1fae5", stampIcon: "droplets", cardStyle: "classic" },
  },
];

const DEMO_SHOP_NAMES: Record<string, string> = {
  "beates-grill": "Beate's Grill", "asia-taste": "Asia Taste", "barber": "Oldschool Barbershop",
  "block13": "Block 13", "entenhaus": "Entenhaus", "eiszauber": "Eiszauber", "bakery": "Meisterbäckerei",
};

export default function DemoPage() {
  const [designId, setDesignId] = useState("standard");
  const [currentStamps, setCurrentStamps] = useState(4);
  const [animateIndex, setAnimateIndex] = useState<number | null>(null);

  // Default-Sternenhimmel ausblenden — die Demo bringt ihren eigenen Hintergrund mit
  useEffect(() => {
    document.documentElement.setAttribute("data-shop-theme", "demo");
    return () => { document.documentElement.removeAttribute("data-shop-theme"); };
  }, []);

  const designs = useMemo(() => [
    // Normale Designs: im Preis enthalten (99 € Einrichtung inkl. Design)
    ...CONFIG_DEMOS.map(d => ({
      id: d.id, label: d.label, color: d.color, signature: false,
      theme: getShopTheme({ customDesignEnabled: true, designConfig: d.config })!,
      shopName: "Dein Laden",
    })),
    // Signature-Designs: von Hand gestaltet, gegen Aufpreis
    ...THEME_LIST.map(t => ({
      id: t.id, label: t.label, color: t.color, signature: true,
      theme: getShopTheme({ customDesignEnabled: true, theme: t.id })!,
      shopName: DEMO_SHOP_NAMES[t.id] ?? t.label,
    })),
  ], []);

  const normalDesigns    = designs.filter(d => !d.signature);
  const signatureDesigns = designs.filter(d => d.signature);

  const selected = designs.find(d => d.id === designId) ?? designs[0];
  const theme: ThemeConfig = selected.theme;
  const c = theme.colors;

  const rewardTiers = [
    { stamps: 10, text: "1x Gratis-Produkt", enabled: true },
    { stamps: MAX_STAMPS, text: "Premium-Belohnung", enabled: true },
  ];
  const milestones = [
    { stamps: 25, text: "Bronze-Stammkunde", enabled: true },
    { stamps: 60, text: "VIP-Kunde", enabled: true },
  ];

  const handleStamp = () => {
    if (currentStamps >= MAX_STAMPS) return;
    setAnimateIndex(currentStamps);
    setCurrentStamps(s => s + 1);
    setTimeout(() => setAnimateIndex(null), 600);
  };

  return (
    <div className="min-h-screen max-w-sm mx-auto px-5 pt-8 pb-16 flex flex-col gap-4 relative z-[2]">
      <theme.Background />

      {/* Header */}
      <div className="relative z-10 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: c.accentDim }}>Loatycard · Live-Demo</p>
        <h1 className="text-lg font-bold mt-1" style={{ color: c.text }}>So sehen deine Kunden ihre Stempelkarte</h1>
        <p className="text-[11px] mt-1" style={{ color: c.accentDim }}>Kein App-Download, läuft direkt im Browser. Tippe unten auf „Stempel geben".</p>
      </div>

      {/* Design-Umschalter: normale Designs (im Preis enthalten) */}
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: c.accentDim }}>
          Dein Design · im Preis enthalten
        </p>
        <div className="-mx-5 px-5 overflow-x-auto">
          <div className="flex gap-1.5 w-max pb-1">
            {normalDesigns.map(d => (
              <button key={d.id} onClick={() => setDesignId(d.id)}
                className="text-[11px] px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors"
                style={designId === d.id
                  ? { background: d.color, color: "#111", border: `1px solid ${d.color}` }
                  : { background: "rgba(127,127,127,.12)", border: "1px solid rgba(127,127,127,.25)", color: c.textBody }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Design-Umschalter: Signature-Designs (gegen Aufpreis) */}
      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: c.accentDim }}>
          ✦ Signature-Designs · gegen Aufpreis
        </p>
        <div className="-mx-5 px-5 overflow-x-auto">
          <div className="flex gap-1.5 w-max pb-1">
            {signatureDesigns.map(d => (
              <button key={d.id} onClick={() => setDesignId(d.id)}
                className="text-[11px] px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-colors"
                style={designId === d.id
                  ? { background: d.color, color: "#111", border: `1px solid ${d.color}` }
                  : { background: "rgba(127,127,127,.12)", border: "1px solid rgba(127,127,127,.25)", color: c.textBody }}>
                ✦ {d.label}
              </button>
            ))}
          </div>
        </div>
        {selected.signature && (
          <p className="text-[10px] mt-1" style={{ color: c.accentDim }}>
            Signature-Designs werden von Hand für deinen Laden gestaltet und sind nicht im normalen Preis enthalten. Preis auf Anfrage.
          </p>
        )}
      </div>

      {/* Karte */}
      <div className="relative z-10">
        <theme.Card
          shopName={selected.shopName}
          stampsRequired={10}
          currentStamps={currentStamps}
          animateIndex={animateIndex}
          qrToken="demo"
          hideQR
          rewardTiers={rewardTiers}
          stampValue={10}
          cardNumber={1}
        />
      </div>

      {/* Stempel-Button */}
      <div className="relative z-10 flex gap-2">
        <button onClick={handleStamp} disabled={currentStamps >= MAX_STAMPS}
          className="flex-1 py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
          style={{ background: c.accent, color: "#111" }}>
          <Stamp size={20} /> {currentStamps >= MAX_STAMPS ? "Karte voll! 🎉" : "Stempel geben"}
        </button>
        <button onClick={() => setCurrentStamps(0)}
          className="px-4 py-4 rounded-2xl transition-colors"
          style={{ background: c.cardBg, border: c.card.border, color: c.accentDim }}
          aria-label="Zurücksetzen">
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Belohnungen + Meilensteine */}
      <div className="relative z-10">
        <theme.Banner rewardText="1x Gratis-Produkt" stampsRequired={10} rewardTiers={rewardTiers} />
      </div>
      <div className="relative z-10">
        <theme.Milestones milestones={milestones} totalStampsEver={30 + currentStamps} />
      </div>

      {/* Footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
        className="relative z-10 rounded-2xl px-4 py-3 text-center" style={c.card}>
        <p className="text-xs font-semibold" style={{ color: c.text }}>Genau so einfach ist es für deine Kunden.</p>
        <p className="text-[11px] mt-1" style={{ color: c.accentDim }}>
          QR scannen → Karte im Browser → Stempel sammeln. Design, Farben und Logo machen wir passend zu deinem Laden.
        </p>
      </motion.div>
    </div>
  );
}
