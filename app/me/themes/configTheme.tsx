"use client";

// ── Config-Design: generisches Theme aus DB-Daten (shops.designConfig) ────────
// Rendert Karte, Belohnungs-Banner und Meilensteine komplett aus einer
// Farb-/Bild-Konfiguration — kein Code und kein Deploy pro Shop nötig.
// Logik (Tiers inkl. Basis-Stufe, maxStamps, Slots) gespiegelt aus beatesGrill.

import { motion } from "framer-motion";
import { QrCode, Gift, Award } from "lucide-react";
import { getStampIcon } from "@/app/me/components";
import {
  makePhotoBackground, DEFAULT_COLORS,
  type ThemeConfig, type ThemeColors,
  type ThemeCardProps, type ThemeBannerProps, type ThemeMilestonesProps,
} from "./registry";

export interface ShopDesignConfig {
  accent:    string;
  text:      string;
  textBody:  string;
  cardBg:    string;
  bgType:    "color" | "gradient" | "image";
  bgColor?:  string;
  bgColor2?: string;
  bgImageUrl?: string;
  logoUrl?:  string;
  // Logo-Größe auf der Karte: s/m/l (Altfeld, nicht mehr gerendert)
  logoSize?: "s" | "m" | "l";
  // Shopname zusätzlich unter dem Logo anzeigen
  logoShowName?: boolean;
  // Logo-Höhe in px (Altfeld, nicht mehr gerendert)
  logoHeight?: number;
  // Logo-Breite in % der Karte (fehlend = 80); Höhe gedeckelt, Karte wächst nicht
  logoWidth?: number;
  // Kleiner Zusatz-Text unter Logo/Shopname (z.B. Ladenname oder Slogan)
  tagline?: string;
  // QR-Darstellung: "button" (großer Button unter der Karte, Standard),
  // "icon" (kleines Icon oben in der Karte) oder "both" (beides)
  qrStyle?: "button" | "icon" | "both";
  stampIcon?: string;
  // Stempel-Form: circle/square/diamond/hex (fehlend = circle)
  stampShape?: string;
  // Stempel-Umrandung: eigene Farbe (Hex, fehlend = Akzentfarbe)
  stampBorderColor?: string;
  // Stempel-Umrandung: "thin" (fein, Default) oder "bold" (fett)
  stampBorderStyle?: "thin" | "bold";
  // Altfeld, wird nicht mehr gerendert (Glow/Papier abgeschafft)
  cardStyle?: string;
  // Ecken-Verzierung in Akzentfarbe: "none" | "thin" | "double" | "swirl"
  // (Altwerte: "full" → thin, "lines" → none)
  decor?: string;
}

// Hex #rrggbb + Alpha-Suffix (z.B. "28"). Nicht-Hex-Werte unverändert lassen.
function alpha(hex: string, a: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex + a : hex;
}

// Letztes Wort per geschütztem Leerzeichen anbinden, damit z.B. ein einzelnes
// "!" nicht allein in einer neuen Zeile landet.
function noOrphan(s: string): string {
  return s.replace(/\s+(\S+)\s*$/, " $1");
}

function buildColors(cfg: ShopDesignConfig): ThemeColors {
  return {
    ...DEFAULT_COLORS,
    accent:      cfg.accent,
    accentDim:   alpha(cfg.accent, "AA"),
    accentFaint: alpha(cfg.accent, "35"),
    text:        cfg.text,
    textBody:    cfg.textBody,
    cardBg:      cfg.cardBg,
    dark:        cfg.cardBg,
    divider:     alpha(cfg.accent, "22"),
    gradient:    `linear-gradient(135deg, ${cfg.accent}, ${alpha(cfg.accent, "99")})`,
    card:    { background: cfg.cardBg, border: `1px solid ${alpha(cfg.accent, "28")}` },
    sub:     { background: cfg.cardBg, border: `1px solid ${alpha(cfg.accent, "22")}` },
    input:   { background: cfg.cardBg, border: `1px solid ${alpha(cfg.accent, "30")}`, color: cfg.text },
    badge:   { background: alpha(cfg.accent, "22"), border: `1px solid ${alpha(cfg.accent, "40")}`, color: cfg.accent },
    subCard: { background: alpha(cfg.cardBg, "88"), borderRadius: "0.75rem", padding: "0.75rem" },
  };
}

function makeBackground(cfg: ShopDesignConfig) {
  if (cfg.bgType === "image" && cfg.bgImageUrl) return makePhotoBackground(cfg.bgImageUrl);
  const bg = cfg.bgType === "gradient"
    ? `linear-gradient(180deg, ${cfg.bgColor ?? "#09090b"} 0%, ${cfg.bgColor2 ?? cfg.bgColor ?? "#09090b"} 100%)`
    : (cfg.bgColor ?? "#09090b");
  return function ConfigBackground() {
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute inset-0" style={{ background: bg }} />
        {/* dezenter Akzent-Schein oben, macht auch flache Farben lebendig */}
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 80% 45% at 50% 0%, ${alpha(cfg.accent, "14")}, transparent 70%)` }} />
      </div>
    );
  };
}

type DecorVariant = "none" | "thin" | "double" | "swirl" | "bracket" | "dots" | "ornate";

// Ecken-Verzierung: Altwerte aus der ersten Version auf die neuen Stile mappen
export function normalizeDecor(decor?: string): DecorVariant {
  if (decor === "thin" || decor === "double" || decor === "swirl"
    || decor === "bracket" || decor === "dots" || decor === "ornate") return decor;
  if (decor === "full") return "thin";
  return "none";
}

// Eck-Ornament in Akzentfarbe, wird 4× rotiert platziert
function CornerOrnament({ color, variant }: { color: string; variant: Exclude<DecorVariant, "none"> }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
      style={{ width: 22, height: 22, color, opacity: 0.55 }}>
      {variant === "thin" && <path d="M2 14 V4 C2 2.9 2.9 2 4 2 H14" />}
      {variant === "double" && (
        <>
          <path d="M2 16 V4 C2 2.9 2.9 2 4 2 H16" />
          <path d="M6 14 V7 C6 6.45 6.45 6 7 6 H14" strokeWidth="1" />
        </>
      )}
      {variant === "swirl" && (
        <>
          <path d="M2 18 C2 7 7 2 18 2" />
          <circle cx="20" cy="2" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="2" cy="20" r="1.4" fill="currentColor" stroke="none" />
        </>
      )}
      {variant === "bracket" && <path d="M2 2 H12 L2 12 Z" fill="currentColor" stroke="none" />}
      {variant === "dots" && (
        <>
          <circle cx="3" cy="3" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="9.5" cy="3" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="3" cy="9.5" r="1.2" fill="currentColor" stroke="none" />
        </>
      )}
      {variant === "ornate" && (
        <>
          <path d="M2 15 V5 C2 3.3 3.3 2 5 2 H15" />
          <path d="M2 9 C6 9 9 6 9 2" strokeWidth="0.9" />
          <circle cx="4" cy="4" r="1.3" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  );
}

// Stempelformen als clip-path (clip-path frisst Borders, deshalb bei leeren
// Stempeln zweilagig: äußere Form in Akzent, innere minimal kleiner in Kartenfarbe)
const CLIP_SHAPES: Record<string, string> = {
  hex:     "polygon(50% 0%, 94% 25%, 94% 75%, 50% 100%, 6% 75%, 6% 25%)",
  octagon: "polygon(30% 2%, 70% 2%, 98% 30%, 98% 70%, 70% 98%, 30% 98%, 2% 70%, 2% 30%)",
  star:    "polygon(50% 2%, 61% 36%, 97% 36%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 3% 36%, 39% 36%)",
  shield:  "polygon(4% 4%, 96% 4%, 96% 58%, 50% 97%, 4% 58%)",
};

// Spaltenzahl so wählen, dass die Stempel möglichst gleichmäßig auf die Reihen
// verteilt sind (10 → 5+5 statt 7+3). Bevorzugt volle letzte Reihe, Ton bei ~5.
function evenCols(n: number): number {
  if (n <= 5) return n;
  let best = 5, bestScore = Infinity;
  for (const c of [5, 6, 4, 7, 3]) {
    if (c > n) continue;
    const rem = n % c;
    const score = rem === 0 ? 0 : c - rem;
    if (score < bestScore) { bestScore = score; best = c; }
  }
  return best;
}

function makeCard(cfg: ShopDesignConfig) {
  const A = cfg.accent, T = cfg.text, TB = cfg.textBody, C = cfg.cardBg;
  const corner = normalizeDecor(cfg.decor);
  const Icon = getStampIcon(cfg.stampIcon);
  const shape = cfg.stampShape ?? "circle";
  const qrStyle = cfg.qrStyle ?? "button";
  // Stempel-Umrandung: eigene Farbe (sonst Akzent) + Stärke. "bold" = dickere
  // Linie mit höherer Deckkraft, damit die leeren Stempel deutlicher wirken.
  const BC = cfg.stampBorderColor ?? A;
  const bold = cfg.stampBorderStyle === "bold";
  const bw = bold ? "2px" : "1px";

  return function ConfigLoyaltyCard({ shopName, stampsRequired, currentStamps, animateIndex, onShowQR, hideQR, rewardTiers, stampValue, cardNumber, milestoneBadge }: ThemeCardProps) {
    const activeTiers = rewardTiers?.some(t => t.enabled)
      ? [{ stamps: stampsRequired, text: "", enabled: true }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
      : [];
    const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;
    const cols = evenCols(maxStamps);

    return (
      <>
      <div className="relative overflow-hidden rounded-3xl"
        style={{ background: C, border: `1px solid ${alpha(A, "30")}` }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${alpha(A, "0C")}, transparent)` }} />
        {corner !== "none" && (
          <>
            <div className="absolute pointer-events-none" style={{ top: 9, left: 9 }}><CornerOrnament color={A} variant={corner} /></div>
            <div className="absolute pointer-events-none" style={{ top: 9, right: 9, transform: "rotate(90deg)" }}><CornerOrnament color={A} variant={corner} /></div>
            <div className="absolute pointer-events-none" style={{ bottom: 9, right: 9, transform: "rotate(180deg)" }}><CornerOrnament color={A} variant={corner} /></div>
            <div className="absolute pointer-events-none" style={{ bottom: 9, left: 9, transform: "rotate(270deg)" }}><CornerOrnament color={A} variant={corner} /></div>
          </>
        )}
        <div className="relative p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: TB }}>Stempelkarte</p>
                {cardNumber !== undefined && (
                  <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                    style={{ background: alpha(A, "18"), color: TB }}>
                    #{String(cardNumber).padStart(3, "0")}
                  </span>
                )}
                {milestoneBadge && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: alpha(A, "20"), color: A }}>{milestoneBadge}</span>
                )}
              </div>
              {cfg.logoUrl ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cfg.logoUrl} alt={shopName} className="mt-2 block object-contain object-left"
                    style={{ maxWidth: `${cfg.logoWidth ?? 80}%`, maxHeight: 130, width: "auto", height: "auto" }} />
                  {cfg.logoShowName && (
                    <h2 className="text-base font-bold leading-tight mt-1.5" style={{ color: T }}>{shopName}</h2>
                  )}
                </>
              ) : (
                <h2 className="text-lg font-bold leading-tight" style={{ color: T }}>{shopName}</h2>
              )}
              {cfg.tagline && (
                <p className="text-xs mt-1.5 font-bold" style={{ color: TB, textWrap: "pretty" }}>{noOrphan(cfg.tagline)}</p>
              )}
            </div>
            {/* Kleines QR-Icon in der Kopfzeile (bei "icon" oder "both") */}
            {(qrStyle === "icon" || qrStyle === "both") && !hideQR && onShowQR && (
              <button onClick={onShowQR} className="shrink-0 mt-4 w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: C, border: `1px solid ${alpha(A, "30")}` }}>
                <QrCode size={26} style={{ color: A }} />
              </button>
            )}
          </div>
          <div className="grid gap-2 mb-4 w-max" style={{ gridTemplateColumns: `repeat(${cols}, max-content)` }}>
            {Array.from({ length: maxStamps }).map((_, i) => {
              const filled = i < currentStamps;
              const isAnimating = i === animateIndex;
              const isTier = activeTiers.some(t => t.stamps === i + 1);
              const inner = filled
                ? <Icon size={13} style={{ color: C }} />
                : isTier ? <Gift size={11} style={{ color: alpha(A, "70") }} /> : null;

              if (CLIP_SHAPES[shape]) {
                const clip = CLIP_SHAPES[shape];
                return (
                  <motion.div key={i}
                    animate={isAnimating ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-8 h-8 flex items-center justify-center">
                    <div className="absolute inset-0"
                      style={{ clipPath: clip, background: filled ? A : isTier ? alpha(BC, bold ? "80" : "55") : alpha(BC, bold ? "60" : "30") }} />
                    {!filled && <div className="absolute" style={{ inset: bold ? "2.5px" : "1.5px", clipPath: clip, background: C }} />}
                    <div className="relative">{inner}</div>
                  </motion.div>
                );
              }
              if (shape === "diamond") {
                return (
                  <motion.div key={i}
                    animate={isAnimating ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-8 h-8 flex items-center justify-center">
                    <div className="absolute inset-[3px]"
                      style={{
                        transform: "rotate(45deg)", borderRadius: 6,
                        ...(filled
                          ? { background: A, border: `${bw} solid ${alpha(BC, "60")}` }
                          : isTier ? { border: `${bw} solid ${alpha(BC, bold ? "70" : "40")}`, background: C }
                          : { border: `${bw} solid ${alpha(BC, bold ? "55" : "26")}`, background: alpha(C, "88") }),
                      }} />
                    <div className="relative">{inner}</div>
                  </motion.div>
                );
              }
              return (
                <motion.div key={i}
                  animate={isAnimating ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-8 h-8 flex items-center justify-center"
                  style={{
                    borderRadius: shape === "square" ? 9 : 9999,
                    ...(filled
                      ? { background: A, border: `${bw} solid ${alpha(BC, "60")}` }
                      : isTier ? { border: `${bw} solid ${alpha(BC, bold ? "70" : "40")}`, background: C }
                      : { border: `${bw} solid ${alpha(BC, bold ? "55" : "22")}`, background: alpha(C, "88") }),
                  }}>
                  {inner}
                </motion.div>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span style={{ color: TB }}>{currentStamps} / {maxStamps} Stempel</span>
              <span style={{ color: A }}>{Math.round(Math.min(currentStamps / maxStamps, 1) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: alpha(A, "18") }}>
              <motion.div initial={{ width: 0 }}
                animate={{ width: `${Math.min(currentStamps / maxStamps * 100, 100)}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: A }} />
            </div>
            {stampValue ? (
              <p className="text-[10px] mt-1.5" style={{ color: TB }}>
                1 Stempel pro €{stampValue} Einkauf
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {/* Großer QR-Button unter der Karte (bei "button" oder "both") */}
      {qrStyle !== "icon" && !hideQR && onShowQR && (
        <button onClick={onShowQR}
          className="w-full mt-3 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: A, color: C, boxShadow: `0 4px 18px ${alpha(A, "40")}` }}>
          <QrCode size={18} /> QR-Code zeigen
        </button>
      )}
      </>
    );
  };
}

function makeBanner(cfg: ShopDesignConfig) {
  const A = cfg.accent, T = cfg.text, TB = cfg.textBody, C = cfg.cardBg;

  return function ConfigRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
    // Basis-Stufe immer einschließen, auch wenn Bonus-Stufen aktiv sind
    const activeTiers = rewardTiers?.some(t => t.enabled)
      ? [{ stamps: stampsRequired, text: rewardText, enabled: true }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
      : [];
    if (activeTiers.length > 0) {
      return (
        <div className="rounded-2xl px-4 py-3 space-y-2.5" style={{ background: C, border: `1px solid ${alpha(A, "22")}` }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TB }}>Belohnungen</p>
          {activeTiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                style={{ background: A, color: C }}>{i + 1}</div>
              <div>
                <p className="text-[10px]" style={{ color: TB }}>nach {tier.stamps} Stempeln</p>
                <p className="text-sm font-semibold" style={{ color: T }}>{tier.text}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: C, border: `1px solid ${alpha(A, "22")}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: alpha(A, "18"), border: `1px solid ${alpha(A, "30")}` }}>
          <Gift size={16} style={{ color: A }} />
        </div>
        <div>
          <p className="text-[10px]" style={{ color: TB }}>nach {stampsRequired} Stempeln</p>
          <p className="text-sm font-semibold" style={{ color: T }}>{rewardText}</p>
        </div>
      </div>
    );
  };
}

function makeMilestones(cfg: ShopDesignConfig) {
  const A = cfg.accent, T = cfg.text, TB = cfg.textBody, C = cfg.cardBg;

  return function ConfigMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
    const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
    if (active.length === 0) return null;
    return (
      <div className="rounded-2xl px-4 py-4" style={{ background: C, border: `1px solid ${alpha(A, "22")}` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: TB }}>Meilensteine</p>
        <div className="space-y-3">
          {active.map((m, i) => {
            const reached = totalStampsEver >= m.stamps;
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={reached ? { background: A } : { background: C, border: `1px solid ${alpha(A, "28")}` }}>
                  {reached ? <Award size={13} style={{ color: C }} /> : <span className="text-[10px] font-bold" style={{ color: TB }}>{m.stamps}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: reached ? T : TB }}>{m.text}</p>
                  {!reached && <p className="text-[10px]" style={{ color: alpha(A, "70") }}>noch {m.stamps - totalStampsEver} Stempel</p>}
                </div>
                {reached && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: alpha(A, "18"), color: A, border: `1px solid ${alpha(A, "30")}` }}>✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };
}

export function makeConfigTheme(cfg: ShopDesignConfig): ThemeConfig {
  return {
    label:      "Eigenes Design",
    colors:     buildColors(cfg),
    Background: makeBackground(cfg),
    Card:       makeCard(cfg),
    Banner:     makeBanner(cfg),
    Milestones: makeMilestones(cfg),
  };
}
