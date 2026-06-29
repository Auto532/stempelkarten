"use client";

import { motion } from "framer-motion";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

// ─── Palette ──────────────────────────────────────────────────────────────────
const GOLD_HI   = "#f4efe4";
const GOLD      = "#d7d2c6";
const GOLD_LO   = "#8d877b";
const CREAM     = "#f1e9d6";
const CREAM_DIM = "#c3bdb0";
const MUTED     = "#888377";
const MUTED_DIM = "#565248";
const LINE      = "#2b2b2b";

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function ScissorsSVG({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M9.3 16.6 L18.4 3.6" />
      <path d="M14.7 16.6 L5.6 3.6" />
      <circle cx="6.8" cy="18.9" r="2.7" />
      <circle cx="17.2" cy="18.9" r="2.7" />
      <circle cx="12" cy="12.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function CornerOrnament({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.3"
      style={{ width: 34, height: 34, color: CREAM, opacity: 0.5, position: "absolute", zIndex: 2, ...style }}>
      <path d="M2 14 C2 7 7 2 14 2" />
      <path d="M2 22 C2 11 11 2 22 2" opacity="0.55" />
      <circle cx="7" cy="7" r="2.2" fill="currentColor" stroke="none" />
      <path d="M14 2 C14 8 11 11 6 12" opacity="0.5" />
    </svg>
  );
}

function BarberCrest() {
  return (
    <svg viewBox="0 0 220 132" fill="none"
      style={{ width: 118, height: "auto", display: "block", margin: "0 auto 14px",
        color: CREAM, filter: "drop-shadow(0 2px 6px rgba(0,0,0,.5))" }}>
      <defs>
        <clipPath id="bpClip">
          <rect x="102" y="50" width="16" height="50" rx="6" />
        </clipPath>
      </defs>
      {/* crossed razors */}
      <g transform="translate(110,58)">
        <g transform="rotate(-31)">
          <path d="M14 -3.4 L72 -3 L72 3 L14 3 Q9 3 9 -0.2 Q9 -3.4 14 -3.4 Z" fill="currentColor" />
          <line x1="10" y1="3.6" x2="4" y2="6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="76" cy="0" r="3.2" fill="currentColor" />
        </g>
        <g transform="scale(-1,1)">
          <g transform="rotate(-31)">
            <path d="M14 -3.4 L72 -3 L72 3 L14 3 Q9 3 9 -0.2 Q9 -3.4 14 -3.4 Z" fill="currentColor" />
            <line x1="10" y1="3.6" x2="4" y2="6.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="76" cy="0" r="3.2" fill="currentColor" />
          </g>
        </g>
      </g>
      {/* barber pole */}
      <circle cx="110" cy="47" r="5.2" fill="currentColor" />
      <rect x="102" y="50" width="16" height="50" rx="6" fill="#141414" stroke="currentColor" strokeWidth="2" />
      <g clipPath="url(#bpClip)" stroke="currentColor" strokeWidth="3.4" opacity="0.9">
        <line x1="96" y1="58" x2="124" y2="46" />
        <line x1="96" y1="70" x2="124" y2="58" />
        <line x1="96" y1="82" x2="124" y2="70" />
        <line x1="96" y1="94" x2="124" y2="82" />
        <line x1="96" y1="106" x2="124" y2="94" />
      </g>
      <circle cx="110" cy="103" r="5.2" fill="currentColor" />
    </svg>
  );
}

// ─── Loyalty Card ─────────────────────────────────────────────────────────────
export function BarberLoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex,
  onShowQR, hideQR, rewardTiers, stampValue, cardNumber, milestoneBadge,
}: ThemeCardProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;
  const cols = maxStamps <= 6 ? 3 : maxStamps <= 8 ? 4 : 5;

  // Split name: first word(s) in script, last word in caps
  const parts = shopName.trim().split(" ");
  const scriptPart = parts.length > 1 ? parts.slice(0, -1).join(" ") : null;
  const capsPart   = parts[parts.length - 1].toUpperCase();

  return (
    <>
      {/* Font loading */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{
        position: "relative",
        background: "linear-gradient(180deg, #181818 0%, #121212 100%)",
        border: `1px solid ${LINE}`,
        borderRadius: 24,
        padding: "46px 24px 40px",
        boxShadow: "inset 0 1px 0 rgba(241,233,214,.05), 0 20px 40px rgba(0,0,0,.55)",
      }}>
        {/* inner hairline frame */}
        <div style={{
          position: "absolute", inset: 12, borderRadius: 16,
          border: "1px solid rgba(228,222,208,.16)", pointerEvents: "none",
        }} />

        {/* corner ornaments */}
        <CornerOrnament style={{ top: 6, left: 6 }} />
        <CornerOrnament style={{ top: 6, right: 6, transform: "scaleX(-1)" }} />
        <CornerOrnament style={{ bottom: 6, left: 6, transform: "scaleY(-1)" }} />
        <CornerOrnament style={{ bottom: 6, right: 6, transform: "scale(-1,-1)" }} />

        <div style={{ position: "relative", zIndex: 3, textAlign: "center" }}>

          <BarberCrest />

          {/* eyebrow row: label + card# + milestone */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 4, color: CREAM_DIM, textTransform: "uppercase", fontWeight: 500 }}>
              Stempelkarte
            </span>
            {cardNumber !== undefined && (
              <span style={{
                fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 1,
                color: GOLD_HI, background: "rgba(228,222,208,.12)",
                border: "1px solid rgba(228,222,208,.3)", borderRadius: 20,
                padding: "2px 9px", fontWeight: 600,
              }}>
                #{String(cardNumber).padStart(3, "0")}
              </span>
            )}
            {milestoneBadge && (
              <span style={{
                fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1,
                color: GOLD_HI, background: "rgba(228,222,208,.12)",
                border: "1px solid rgba(228,222,208,.3)", borderRadius: 20,
                padding: "2px 9px", fontWeight: 600,
              }}>
                {milestoneBadge}
              </span>
            )}
          </div>

          {/* shop name */}
          <div style={{ margin: "0 0 6px", lineHeight: 1 }}>
            {scriptPart ? (
              <>
                <span style={{
                  fontFamily: "'Pinyon Script', cursive",
                  fontSize: "clamp(36px,11vw,48px)", color: CREAM,
                  textShadow: "0 2px 10px rgba(0,0,0,.5)",
                  display: "block", marginBottom: 4,
                }}>
                  {scriptPart}
                </span>
                <span style={{
                  fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                  fontSize: "clamp(18px,5.5vw,24px)", letterSpacing: 4,
                  textTransform: "uppercase", color: CREAM, whiteSpace: "nowrap",
                }}>
                  {capsPart}
                </span>
              </>
            ) : (
              <span style={{
                fontFamily: "'Oswald', sans-serif", fontWeight: 700,
                fontSize: "clamp(20px,6vw,28px)", letterSpacing: 3,
                textTransform: "uppercase", color: CREAM,
              }}>
                {capsPart}
              </span>
            )}
          </div>

          {/* motto */}
          <div style={{
            display: "inline-block", margin: "18px 0 4px",
            fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 4,
            textTransform: "uppercase", color: CREAM, fontWeight: 500,
            border: "1px solid rgba(241,233,214,.4)",
            padding: "5px 18px", borderRadius: 2,
          }}>
            In Cut We Trust
          </div>

          {/* divider */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "24px 0", color: CREAM, opacity: 0.7 }}>
            <span style={{ height: 1, width: 46, background: "linear-gradient(90deg,transparent,rgba(241,233,214,.6))", display: "block" }} />
            <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.85 }}>
              <path d="M6 0l1.5 4.5L12 6 7.5 7.5 6 12 4.5 7.5 0 6l4.5-1.5z" />
            </svg>
            <span style={{ height: 1, width: 46, background: "linear-gradient(90deg,rgba(241,233,214,.6),transparent)", display: "block" }} />
          </div>

          {/* stamp grid */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, margin: "8px 0 22px" }}>
            {Array.from({ length: maxStamps }).map((_, i) => {
              const filled = i < currentStamps;
              const isAnimating = i === animateIndex;
              const isTier = activeTiers.some(t => t.stamps === i + 1);
              return (
                <motion.div key={i}
                  animate={isAnimating ? { scale: [1, 1.35, 1] } : {}}
                  transition={{ duration: 0.45 }}
                  style={{
                    aspectRatio: "1", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    ...(filled ? {
                      background: "radial-gradient(circle at 35% 30%, #2e2e2e, #161616)",
                      border: `1.5px solid ${GOLD}`,
                      boxShadow: "0 0 0 3px rgba(228,222,208,.12), inset 0 1px 2px rgba(245,240,230,.3)",
                    } : isTier ? {
                      border: "1.5px dashed rgba(228,222,208,.45)",
                      background: "rgba(228,222,208,.05)",
                    } : {
                      border: "1.5px dashed rgba(228,222,208,.28)",
                    }),
                  }}
                >
                  {filled ? (
                    <ScissorsSVG style={{ width: "54%", height: "54%", color: GOLD_HI }} />
                  ) : (
                    <span style={{ fontFamily: "'Oswald', sans-serif", color: MUTED_DIM, fontSize: 13, fontWeight: 500 }}>
                      {i + 1}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* count */}
          <div style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: 2, fontSize: 13, color: CREAM_DIM, textTransform: "uppercase", marginBottom: 24 }}>
            <b style={{ color: GOLD_HI }}>{currentStamps}</b> von {maxStamps} Stempel
            {stampValue ? <span style={{ color: MUTED, marginLeft: 8, fontSize: 11 }}>· €{stampValue}/Stempel</span> : null}
          </div>

          {/* QR button */}
          {!hideQR && onShowQR && (
            <button onClick={onShowQR} style={{
              width: "100%", border: "none", cursor: "pointer",
              background: `linear-gradient(180deg, ${GOLD_HI}, ${GOLD} 60%, ${GOLD_LO})`,
              color: "#111111", borderRadius: 16, padding: "17px",
              fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16,
              letterSpacing: "1.5px", textTransform: "uppercase",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
              boxShadow: "0 8px 20px rgba(228,222,208,.25), inset 0 1px 0 rgba(255,255,255,.4)",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <path d="M14 14h3v3M21 14v7h-7" strokeLinecap="round" />
              </svg>
              QR-Code vorzeigen
            </button>
          )}

          {/* footer */}
          <div style={{ marginTop: 22, fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 4, color: MUTED, textTransform: "uppercase" }}>
            — Deine Stempelkarte —
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Reward Banner ────────────────────────────────────────────────────────────
export function BarberRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const tiers = rewardTiers?.some(t => t.enabled)
    ? [{ stamps: stampsRequired, text: rewardText, enabled: true as const }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [{ stamps: stampsRequired, text: rewardText, enabled: true as const }];

  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(180deg, #161616, #101010)",
      border: `1px solid ${LINE}`, borderRadius: 18, padding: 18,
    }}>
      <div style={{ position: "absolute", inset: 6, borderRadius: 13, border: "1px solid rgba(228,222,208,.14)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
        {tiers.map((tier, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, flexShrink: 0,
              background: "rgba(228,222,208,.1)", border: "1px solid rgba(228,222,208,.3)",
              display: "flex", alignItems: "center", justifyContent: "center", color: GOLD_HI,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 24, height: 24 }}>
                <rect x="3" y="8" width="18" height="13" rx="1.5" />
                <path d="M3 12h18M12 8v13M12 8s-1-5-4-5-2 5 4 5zM12 8s1-5 4-5 2 5-4 5z" />
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 3, color: GOLD, textTransform: "uppercase", fontWeight: 500, marginBottom: 3 }}>
                Ab {tier.stamps} Stempeln
              </div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 18, color: CREAM, letterSpacing: ".3px" }}>
                {tier.text}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Milestones ───────────────────────────────────────────────────────────────
export function BarberMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (!active.length) return null;

  return (
    <div style={{
      background: "linear-gradient(180deg, #161616, #101010)",
      border: `1px solid ${LINE}`, borderRadius: 18, padding: "20px 18px 8px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <ScissorsSVG style={{ width: 18, height: 18, color: GOLD, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 14, letterSpacing: 3, textTransform: "uppercase", color: CREAM }}>
          Treue-Meilensteine
        </span>
      </div>

      {active.map((m, i) => {
        const reached  = totalStampsEver >= m.stamps;
        const progress = Math.min(totalStampsEver / m.stamps, 1) * 100;
        return (
          <div key={i} style={{
            padding: "14px 0",
            borderBottom: i < active.length - 1 ? "1px solid rgba(228,222,208,.08)" : "none",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              border: reached ? `1px solid ${GOLD}` : `1px solid ${LINE}`,
              background: reached ? "rgba(228,222,208,.08)" : "#131313",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Oswald', sans-serif", color: reached ? GOLD_HI : GOLD, fontWeight: 600, fontSize: 15,
            }}>
              {reached ? "✓" : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 500, fontSize: 16, color: reached ? CREAM : CREAM_DIM, letterSpacing: ".5px" }}>
                  {m.text}
                </span>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: MUTED, letterSpacing: 1 }}>
                  {Math.min(totalStampsEver, m.stamps)} / {m.stamps}
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 5, background: "#242424", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 5, width: `${progress}%`, background: `linear-gradient(90deg, ${GOLD_LO}, ${GOLD_HI})`, transition: "width 0.8s ease" }} />
              </div>
              {!reached && (
                <div style={{ marginTop: 6, fontSize: 11, color: MUTED, fontFamily: "'Oswald', sans-serif", letterSpacing: 1 }}>
                  noch {m.stamps - totalStampsEver} Stempel
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
