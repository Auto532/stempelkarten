"use client";

import { motion } from "framer-motion";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

// ─── Palette ──────────────────────────────────────────────────────────────────
const GOLD_HI = "#e8c96a";
const GOLD    = "#c9a227";
const TEXT    = "#f2ede4";
const TEXT_DIM = "rgba(242,237,228,.55)";
const TEXT_MUT = "rgba(242,237,228,.4)";
const CARD    = "#17150f";
const SUB     = "#1c1a13";
const BORDER  = "rgba(255,255,255,.08)";

function GiftSVG() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8">
      <rect x="3" y="8" width="18" height="4" />
      <path d="M5 12v8h14v-8M12 8v12" />
    </svg>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────
export function Block13Background() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-1]" style={{ background: "#0a0908" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(201,162,39,.06) 0%, transparent 65%)",
      }} />
    </div>
  );
}

// ─── Loyalty Card ─────────────────────────────────────────────────────────────
export function Block13LoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex,
  onShowQR, hideQR, rewardTiers, stampValue, cardNumber, milestoneBadge,
}: ThemeCardProps) {
  const activeTiers = rewardTiers?.some(t => t.enabled)
    ? [{ stamps: stampsRequired, text: "", enabled: true }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;
  const tierStamps = new Set(activeTiers.map(t => t.stamps));
  const cols = maxStamps <= 6 ? 3 : maxStamps <= 8 ? 4 : 5;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <div style={{
        background: CARD, borderRadius: 14,
        border: "1px solid rgba(255,255,255,.06)",
        padding: "24px 20px 22px",
        position: "relative",
      }}>
        {/* Gold accent line */}
        <div style={{
          position: "absolute", top: 0, left: 20, right: 20, height: 2,
          background: "linear-gradient(90deg, transparent, #c9a227, transparent)",
        }} />

        {/* Header: name + QR */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{
                fontFamily: "'Manrope',sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: ".18em", color: TEXT_DIM, textTransform: "uppercase",
              }}>
                Digitale Karte
              </span>
              {cardNumber !== undefined && (
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontSize: 10, fontWeight: 700,
                  letterSpacing: ".08em", color: GOLD,
                  background: "rgba(201,162,39,.12)", border: "1px solid rgba(201,162,39,.3)",
                  borderRadius: 4, padding: "2px 8px",
                }}>
                  #{String(cardNumber).padStart(3, "0")}
                </span>
              )}
              {milestoneBadge && (
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontSize: 10, fontWeight: 700,
                  color: GOLD, background: "rgba(201,162,39,.12)",
                  border: "1px solid rgba(201,162,39,.3)", borderRadius: 4, padding: "2px 8px",
                }}>
                  {milestoneBadge}
                </span>
              )}
            </div>
            <div style={{
              fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 34,
              lineHeight: 1, letterSpacing: ".02em", textTransform: "uppercase",
              color: TEXT, marginBottom: 10,
            }}>
              {shopName}
            </div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, fontWeight: 600, color: TEXT_DIM }}>
              <strong style={{ color: TEXT }}>{currentStamps}</strong>
              {" "}von{" "}
              <strong style={{ color: TEXT }}>{maxStamps}</strong>
              {" "}Blöcken gestempelt
            </div>
          </div>

          {!hideQR && onShowQR && (
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <button onClick={onShowQR} style={{
                width: 76, height: 76, background: TEXT, borderRadius: 8,
                border: "none", cursor: "pointer",
                display: "grid", placeItems: "center",
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#0d0c0a" strokeWidth="2" style={{ width: 36, height: 36 }}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <path d="M14 14h3v3M21 14v7h-7" strokeLinecap="round" />
                </svg>
              </button>
              <div style={{
                marginTop: 8, fontFamily: "'Manrope',sans-serif", fontSize: 10, fontWeight: 700,
                letterSpacing: ".1em", textTransform: "uppercase", color: GOLD,
              }}>
                QR zeigen
              </div>
            </div>
          )}
        </div>

        {/* Stamp section label */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 10px" }}>
          <span style={{
            fontFamily: "'Manrope',sans-serif", fontSize: 10, letterSpacing: ".24em",
            fontWeight: 700, color: TEXT_MUT, textTransform: "uppercase",
          }}>
            Deine Blöcke
          </span>
          <div style={{ flex: 1, height: 1, background: BORDER }} />
        </div>

        {/* Stamp grid */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
          {Array.from({ length: maxStamps }).map((_, i) => {
            const filled = i < currentStamps;
            const isTier = tierStamps.has(i + 1);
            const isAnimating = i === animateIndex;
            return (
              <motion.div key={i}
                animate={isAnimating ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                style={{
                  position: "relative", aspectRatio: "1",
                  display: "grid", placeItems: "center",
                  borderRadius: 6,
                  ...(filled ? {
                    background: `linear-gradient(180deg, ${GOLD_HI}, ${GOLD})`,
                  } : isTier ? {
                    border: `1.5px dashed ${GOLD}`,
                  } : {
                    border: "1.5px solid rgba(255,255,255,.12)",
                  }),
                }}
              >
                {filled ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#0d0c0a" strokeWidth="2.5"
                    style={{ width: "55%", height: "55%" }}>
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isTier ? (
                  <GiftSVG />
                ) : (
                  <span style={{ fontFamily: "'Oswald',sans-serif", fontSize: 13, color: "rgba(242,237,228,.3)" }}>
                    {i + 1}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Stamp value banner */}
        {stampValue && (
          <div style={{
            marginTop: 18,
            background: `linear-gradient(120deg, ${GOLD_HI}, ${GOLD})`,
            borderRadius: 10, padding: "12px 15px",
            display: "flex", alignItems: "center", gap: 12, color: "#0d0c0a",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 7,
              background: "#0d0c0a", color: GOLD_HI,
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="2" y="6" width="20" height="12" /><circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <div style={{
                fontFamily: "'Manrope',sans-serif", fontSize: 9.5, letterSpacing: ".18em",
                fontWeight: 700, textTransform: "uppercase", opacity: .65,
              }}>
                Stempelwert
              </div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15, fontWeight: 700 }}>
                1 Stempel = €{stampValue} Einkauf
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Reward Banner ────────────────────────────────────────────────────────────
export function Block13RewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const tiers = rewardTiers?.some(t => t.enabled)
    ? [{ stamps: stampsRequired, text: rewardText, enabled: true as const }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [{ stamps: stampsRequired, text: rewardText, enabled: true as const }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {tiers.map((tier, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 13,
          background: SUB, borderRadius: 8,
          borderLeft: `2px solid ${GOLD}`,
          padding: "13px 15px",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: "rgba(201,162,39,.14)", color: GOLD,
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3" y="8" width="18" height="4" />
              <path d="M5 12v8h14v-8M12 8v12M12 8s-4 0-4-3c0-1.5 1-2 2-2 2 0 2 5 2 5s0-5 2-5c1 0 2 .5 2 2 0 3-4 3-4 3z" />
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: "'Manrope',sans-serif", fontSize: 9.5, letterSpacing: ".18em",
              fontWeight: 700, color: TEXT_MUT, textTransform: "uppercase",
            }}>
              Ab {tier.stamps} Stempeln
            </div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 15.5, fontWeight: 700, color: TEXT }}>
              {tier.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Milestones ───────────────────────────────────────────────────────────────
export function Block13MilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (!active.length) return null;

  const BLOCKS = 10;

  return (
    <div style={{
      background: CARD, borderRadius: 10,
      borderTop: "1px solid rgba(201,162,39,.25)",
      padding: "20px 18px 8px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="1.8">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span style={{
          fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 13,
          letterSpacing: ".18em", textTransform: "uppercase", color: TEXT,
        }}>
          Treue-Meilensteine
        </span>
      </div>

      {active.map((m, i) => {
        const reached = totalStampsEver >= m.stamps;
        const filledBlocks = Math.round(Math.min(totalStampsEver / m.stamps, 1) * BLOCKS);
        return (
          <div key={i} style={{
            padding: "14px 0",
            borderBottom: i < active.length - 1 ? `1px solid ${BORDER}` : "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {reached && (
                  <span style={{
                    background: GOLD, color: "#0d0c0a",
                    fontFamily: "'Oswald',sans-serif", fontWeight: 600, fontSize: 10,
                    padding: "2px 7px", borderRadius: 3, textTransform: "uppercase", letterSpacing: ".06em",
                  }}>
                    ✓
                  </span>
                )}
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 14,
                  color: reached ? TEXT : TEXT_DIM,
                }}>
                  {m.text}
                </span>
              </div>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: TEXT_MUT, fontWeight: 600 }}>
                {Math.min(totalStampsEver, m.stamps)}/{m.stamps}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${BLOCKS}, 1fr)`, gap: 3 }}>
              {Array.from({ length: BLOCKS }).map((_, j) => (
                <i key={j} style={{
                  display: "block", height: 5, borderRadius: 2,
                  background: j < filledBlocks
                    ? `linear-gradient(180deg, ${GOLD_HI}, ${GOLD})`
                    : BORDER,
                }} />
              ))}
            </div>
            {!reached && (
              <div style={{ marginTop: 6, fontFamily: "'Manrope',sans-serif", fontSize: 11, color: TEXT_MUT }}>
                noch {m.stamps - totalStampsEver} Stempel
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
