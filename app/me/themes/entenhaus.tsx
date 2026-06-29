"use client";

import { motion } from "framer-motion";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

// ─── Palette ──────────────────────────────────────────────────────────────────
const GOLD        = "#C9A560";
const GOLD_BRIGHT = "#E5C77D";
const GOLD_SOFT   = "#7E6738";
const GOLD_DEEP   = "#5C4A28";
const RED         = "#B02A24";
const RED_BRIGHT  = "#C8392F";
const RED_DEEP    = "#7A1B15";
const CREAM       = "#F0E4CC";
const CREAM_MUTE  = "#9C8B70";
const INK         = "#2A1812";
const CARD        = "#1C100B";
const CARD2       = "#251610";
const LINE        = "rgba(201,166,107,.2)";
const LINE_STRONG = "rgba(201,166,107,.42)";

// ─── SVG helpers ──────────────────────────────────────────────────────────────

function DuckSVG({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={style}>
      <path d="M6 30 C6 22, 14 18, 22 18 C30 18, 40 21, 42 28 C43 33, 40 37, 34 38 L14 38 C9 38, 6 35, 6 30 Z" />
      <path d="M5 28 Q1 26, 0 28 Q2 30, 5 31 Z" />
      <path d="M34 22 Q36 14, 32 10 L36 8 Q40 12, 38 22 Z" />
      <circle cx="34" cy="8" r="4.5" />
      <path d="M37 7 L43 7 L43 10 L37 10 Z" opacity=".75" />
      <circle cx="34" cy="7" r=".9" fill={INK} />
      <path d="M16 24 Q22 22, 28 24 Q26 28, 22 28 Q18 28, 16 24 Z" opacity=".5" />
    </svg>
  );
}

function CornerSVG() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
      style={{ width: 24, height: 24, color: GOLD, opacity: 0.55 }}>
      <path d="M2 14 V4 C2 2.9 2.9 2 4 2 H14" />
    </svg>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────

export function EntenhausBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div className="absolute inset-0" style={{
        background: `radial-gradient(80% 50% at 50% 0%, rgba(176,42,36,.08) 0%, transparent 60%),
          radial-gradient(70% 40% at 50% 100%, rgba(201,165,96,.05) 0%, transparent 60%),
          #120808`,
      }} />
      {/* Large duck watermark */}
      <div className="absolute" style={{
        fontFamily: "'Noto Serif SC', serif",
        fontWeight: 900,
        fontSize: "clamp(300px, 80vw, 520px)",
        color: GOLD,
        opacity: 0.025,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -45%)",
        lineHeight: 1,
        userSelect: "none",
        pointerEvents: "none",
      }}>
        鴨
      </div>
    </div>
  );
}

// ─── Loyalty Card ─────────────────────────────────────────────────────────────

export function EntenhausLoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex,
  onShowQR, hideQR, rewardTiers, stampValue, cardNumber, milestoneBadge,
}: ThemeCardProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;
  const cols = maxStamps <= 6 ? 3 : maxStamps <= 8 ? 4 : 5;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500;1,600&family=Noto+Serif+SC:wght@700;900&display=swap" rel="stylesheet" />

      <div style={{
        position: "relative",
        background: `linear-gradient(180deg, ${CARD2} 0%, ${CARD} 100%)`,
        borderRadius: 22,
        padding: "30px 22px 22px",
        border: "1px solid rgba(201,166,107,.14)",
        boxShadow: "0 1px 0 rgba(255,255,255,.02) inset, 0 30px 50px -20px rgba(0,0,0,.6)",
        overflow: "hidden",
      }}>
        {/* Corner ornaments */}
        <div style={{ position: "absolute", top: 10, left: 10 }}><CornerSVG /></div>
        <div style={{ position: "absolute", top: 10, right: 10, transform: "rotate(90deg)" }}><CornerSVG /></div>
        <div style={{ position: "absolute", bottom: 10, right: 10, transform: "rotate(180deg)" }}><CornerSVG /></div>
        <div style={{ position: "absolute", bottom: 10, left: 10, transform: "rotate(270deg)" }}><CornerSVG /></div>

        {/* Authenticity seal */}
        <div style={{
          position: "absolute",
          top: 18, right: 18,
          width: 38, height: 38,
          background: RED_DEEP,
          border: `1px solid ${RED_BRIGHT}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Noto Serif SC', serif",
          fontWeight: 900,
          color: CREAM,
          fontSize: 22,
          transform: "rotate(-6deg)",
          boxShadow: "0 0 0 1px rgba(0,0,0,.4), 0 6px 14px -4px rgba(176,42,36,.5)",
          zIndex: 3,
        }}>
          福
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Label row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingRight: 56 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase", color: RED_BRIGHT, fontWeight: 700 }}>
              Digitale Stempelkarte
            </span>
            {cardNumber !== undefined && (
              <span style={{
                fontSize: 10, letterSpacing: "0.14em", color: GOLD,
                background: "rgba(201,165,96,.08)", border: `1px solid ${LINE_STRONG}`,
                borderRadius: 999, padding: "3px 10px", fontWeight: 600,
              }}>
                №&nbsp;{String(cardNumber).padStart(3, "0")}
              </span>
            )}
            {milestoneBadge && (
              <span style={{
                fontSize: 9, color: GOLD_BRIGHT, background: `${GOLD}18`,
                border: `1px solid ${GOLD}40`, borderRadius: 4, padding: "2px 7px", fontWeight: 700,
              }}>
                {milestoneBadge}
              </span>
            )}
          </div>

          {/* Restaurant name */}
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(36px,11vw,48px)",
            lineHeight: 0.95,
            fontWeight: 600,
            color: CREAM,
            letterSpacing: ".002em",
            marginBottom: 10,
          }}>
            {shopName.includes(" ") ? (
              <>
                {shopName.split(" ").slice(0, -1).join(" ")}
                {" "}
                <span style={{ color: GOLD_BRIGHT, fontStyle: "italic", fontWeight: 500 }}>
                  {shopName.split(" ").slice(-1)}
                </span>
              </>
            ) : (
              <span style={{ color: GOLD_BRIGHT, fontStyle: "italic" }}>{shopName}</span>
            )}
          </div>

          {/* Stamp count */}
          <div style={{ fontSize: 13, color: CREAM_MUTE, fontWeight: 400 }}>
            <strong style={{ color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontSize: 16 }}>
              {currentStamps}
            </strong>
            {" "}von{" "}
            <strong style={{ color: GOLD, fontFamily: "'Cormorant Garamond', serif", fontSize: 16 }}>
              {maxStamps}
            </strong>
            {" "}Stempeln
          </div>

          {/* QR Button */}
          {!hideQR && onShowQR && (
            <div style={{ marginTop: 22 }}>
              <button onClick={onShowQR} style={{
                width: "100%", border: "none", cursor: "pointer",
                background: `linear-gradient(180deg, ${RED_BRIGHT}, ${RED} 60%, ${RED_DEEP})`,
                color: CREAM,
                borderRadius: 14, padding: "16px",
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 700, fontSize: 18,
                letterSpacing: "1px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
                boxShadow: `0 6px 20px rgba(176,42,36,.4), inset 0 1px 0 rgba(255,255,255,.08)`,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3M21 14v7h-7" strokeLinecap="round" />
                </svg>
                QR-Code vorzeigen
              </button>
            </div>
          )}

          {/* Ornamental divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0", opacity: 0.6 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD} 50%, transparent)` }} />
            <div style={{ width: 6, height: 6, background: GOLD, transform: "rotate(45deg)", flexShrink: 0 }} />
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD} 50%, transparent)` }} />
          </div>

          {/* Stamp grid */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "12px 10px", margin: "8px 0 26px" }}>
            {Array.from({ length: maxStamps }).map((_, i) => {
              const filled = i < currentStamps;
              const isAnimating = i === animateIndex;
              const isTier = activeTiers.some(t => t.stamps === i + 1);
              const isLast = !activeTiers.length && i + 1 === maxStamps;
              const isReward = isTier || isLast;

              return (
                <motion.div key={i}
                  animate={isAnimating ? { scale: [1, 1.35, 1] } : {}}
                  transition={{ duration: 0.45 }}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative",
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                    fontSize: 20,
                    ...(filled && isReward ? {
                      background: `linear-gradient(135deg, ${RED}, ${RED_DEEP})`,
                      border: `1px solid ${RED_BRIGHT}`,
                      boxShadow: `0 0 0 1px rgba(201,165,96,.35), 0 6px 16px -4px rgba(176,42,36,.45)`,
                    } : filled ? {
                      background: `rgba(201,165,96,.12)`,
                      border: `1px solid ${GOLD}`,
                      boxShadow: `0 4px 10px rgba(201,165,96,.15)`,
                    } : isReward ? {
                      background: `linear-gradient(135deg, ${RED}, ${RED_DEEP})`,
                      border: `1px solid ${RED_BRIGHT}`,
                      boxShadow: `0 0 0 1px rgba(201,165,96,.35), 0 6px 16px -4px rgba(176,42,36,.45)`,
                    } : {
                      background: "rgba(201,165,96,.03)",
                      border: "1px solid rgba(201,165,96,.22)",
                    }),
                  }}
                >
                  {/* inner frame on empty/reward */}
                  {!filled && !isReward && (
                    <div style={{ position: "absolute", inset: 3, border: ".5px solid rgba(201,165,96,.18)", borderRadius: 2 }} />
                  )}
                  {filled ? (
                    <DuckSVG style={{ width: "60%", height: "60%", color: isReward ? CREAM : GOLD }} />
                  ) : isReward ? (
                    <span style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 900, color: CREAM, fontSize: 22, fontStyle: "normal", position: "relative", zIndex: 2 }}>
                      鴨
                    </span>
                  ) : (
                    <span style={{ color: GOLD_DEEP, fontSize: 18, position: "relative", zIndex: 1 }}>{i + 1}</span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Footer text */}
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 12,
            color: GOLD_SOFT,
            letterSpacing: ".04em",
            textAlign: "center",
          }}>
            — Deine Stempelkarte —
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Reward Banner ────────────────────────────────────────────────────────────

export function EntenhausRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const tiers = rewardTiers?.some(t => t.enabled)
    ? [{ stamps: stampsRequired, text: rewardText, enabled: true as const }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [{ stamps: stampsRequired, text: rewardText, enabled: true as const }];

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 12,
      background: `linear-gradient(180deg, ${CARD2}, ${CARD})`,
      border: "1px solid rgba(201,166,107,.2)",
      borderRadius: 16,
      padding: 18,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${RED_BRIGHT}, ${GOLD})` }} />
      {tiers.map((tier, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 46, height: 46, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: GOLD_BRIGHT,
          }}>
            <DuckSVG style={{ width: 38, height: 38, color: GOLD_BRIGHT }} />
          </div>
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.24em", textTransform: "uppercase", color: CREAM_MUTE, fontWeight: 700, marginBottom: 5 }}>
              Ab {tier.stamps} Stempeln
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: CREAM, lineHeight: 1.05 }}>
              {tier.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export function EntenhausMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (!active.length) return null;

  return (
    <div style={{
      background: `linear-gradient(180deg, ${CARD2}, ${CARD})`,
      border: "1px solid rgba(201,166,107,.2)",
      borderRadius: 16,
      padding: "20px 18px 8px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <DuckSVG style={{ width: 16, height: 16, color: GOLD, flexShrink: 0 }} />
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", color: CREAM }}>
          Treue-Meilensteine
        </span>
      </div>
      {active.map((m, i) => {
        const reached = totalStampsEver >= m.stamps;
        const progress = Math.min(totalStampsEver / m.stamps, 1) * 100;
        return (
          <div key={i} style={{
            padding: "14px 0",
            borderBottom: i < active.length - 1 ? `1px solid ${LINE}` : "none",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              border: reached ? `1px solid ${GOLD}` : `1px solid ${LINE}`,
              background: reached ? "rgba(201,165,96,.1)" : "rgba(0,0,0,.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Cormorant Garamond', serif", fontWeight: 700,
              color: reached ? GOLD_BRIGHT : GOLD, fontSize: 15,
            }}>
              {reached ? "✓" : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                <span style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 16, color: reached ? CREAM : CREAM_MUTE }}>
                  {m.text}
                </span>
                <span style={{ fontSize: 12, color: CREAM_MUTE }}>
                  {Math.min(totalStampsEver, m.stamps)} / {m.stamps}
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 3, background: "rgba(201,165,96,.1)", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${progress}%`, background: `linear-gradient(90deg, ${RED_BRIGHT}, ${GOLD_BRIGHT})`, transition: "width 0.8s ease" }} />
              </div>
              {!reached && (
                <div style={{ marginTop: 6, fontSize: 11, color: CREAM_MUTE }}>
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
