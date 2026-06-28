"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

// ─── Palette ──────────────────────────────────────────────────────────────────
const GREEN     = "#6aa775";
const GREEN_HI  = "#8cc497";
const GREEN_D   = "#3c6b4c";
const TERRA     = "#cf6a35";
const TERRA_HI  = "#e58b50";
const TERRA_LO  = "#a9501f";
const CREAM     = "#f2ead4";
const CREAM_DIM = "#c4bea9";
const MUTED     = "#85907f";
const CARD      = "#131a15";
const CARD2     = "#161e18";
const LINE      = "#27322b";
const BG        = "#0d130f";

// ─── Bowl icon ────────────────────────────────────────────────────────────────
function BowlSVG({ size = 14, color = TERRA_HI }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 11H20.5A8.5 8.5 0 0 1 3.5 11Z" />
      <path d="M2.4 11H21.6" />
      <path d="M9 7.4c-1-1.3-1-2.6 0-3.9" />
      <path d="M12 7.4c-1-1.3-1-2.6 0-3.9" />
      <path d="M15 7.4c-1-1.3-1-2.6 0-3.9" />
    </svg>
  );
}

// ─── Crest SVG ────────────────────────────────────────────────────────────────
function AsiaCrest() {
  return (
    <svg width="96" height="96" viewBox="0 0 128 128" aria-label="Asia Taste">
      <circle cx="64" cy="64" r="60" fill={CREAM} stroke={GREEN_D} strokeWidth="4" />
      <circle cx="64" cy="64" r="53" fill="none" stroke={GREEN_D} strokeWidth="1.4" opacity=".45" />
      {/* soy bottle */}
      <g transform="rotate(-7 47 60)">
        <rect x="41" y="44" width="12" height="42" rx="4" fill={GREEN_D} />
        <rect x="44.5" y="34" width="5" height="12" fill={GREEN_D} />
        <rect x="43.5" y="30" width="7" height="5" rx="1.2" fill={TERRA} />
        <rect x="43" y="55" width="8" height="11" rx="1.5" fill={CREAM} opacity=".85" />
      </g>
      {/* noodles pack */}
      <rect x="55" y="38" width="22" height="48" rx="2.5" fill={GREEN} stroke={GREEN_D} strokeWidth="2" />
      <rect x="57" y="46" width="18" height="9" fill={CREAM} opacity=".85" />
      <g stroke={GREEN_D} strokeWidth="1.6" fill="none" opacity=".8">
        <circle cx="66" cy="70" r="3" /><circle cx="66" cy="70" r="6" />
      </g>
      {/* fanta can */}
      <rect x="77" y="46" width="15" height="40" rx="3" fill="#e7a83c" stroke={GREEN_D} strokeWidth="2" />
      <ellipse cx="84.5" cy="46" rx="7.5" ry="2.4" fill={TERRA} />
      <rect x="80.5" y="54" width="8" height="14" rx="1.4" fill={TERRA} opacity=".55" />
      {/* basket */}
      <ellipse cx="64" cy="71" rx="33" ry="7.5" fill={TERRA} stroke={GREEN_D} strokeWidth="2.6" />
      <path d="M32.5 71L40 101Q64 109 88 101L95.5 71Z" fill={TERRA} stroke={GREEN_D} strokeWidth="2.6" />
      <g stroke={GREEN_D} strokeWidth="1.5" opacity=".7" fill="none">
        <path d="M47 72L49 101" /><path d="M59 73L60 104" /><path d="M71 73L70 104" /><path d="M83 72L81 101" />
        <path d="M36 82Q64 89 92 82" /><path d="M38 92Q64 98 90 92" />
      </g>
    </svg>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────
export function AsiaTasteBackground() {
  const [bokeh, setBokeh] = useState<{ id: number; cx: number; cy: number; r: number; fill: string; op: number }[]>([]);

  useEffect(() => {
    setBokeh([
      { id: 0, cx: 70,  cy: 150, r: 3.2, fill: TERRA_HI,  op: .55 },
      { id: 1, cx: 362, cy: 245, r: 2.4, fill: CREAM,     op: .42 },
      { id: 2, cx: 300, cy: 520, r: 3.6, fill: "#e7a83c", op: .5  },
      { id: 3, cx: 108, cy: 640, r: 2.8, fill: GREEN,     op: .55 },
      { id: 4, cx: 382, cy: 760, r: 3,   fill: TERRA_HI,  op: .45 },
      { id: 5, cx: 48,  cy: 820, r: 2.2, fill: CREAM,     op: .38 },
      { id: 6, cx: 210, cy: 300, r: 2,   fill: CREAM,     op: .32 },
      { id: 7, cx: 330, cy: 600, r: 2.2, fill: "#e7a83c", op: .4  },
    ]);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div className="absolute inset-0" style={{ background: BG }} />
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% -10%, #16241a 0%, ${BG} 55%)` }} />
      {/* glows */}
      <div className="absolute rounded-full" style={{ width: 380, height: 380, background: `${TERRA}5c`, top: -100, right: -110, filter: "blur(72px)" }} />
      <div className="absolute rounded-full" style={{ width: 440, height: 440, background: `${GREEN_D}6a`, bottom: "4%", left: -140, filter: "blur(72px)" }} />
      <div className="absolute rounded-full" style={{ width: 300, height: 300, background: "#e7a83c33", top: "45%", right: -80,  filter: "blur(72px)" }} />
      <div className="absolute rounded-full" style={{ width: 320, height: 320, background: `${TERRA}3d`, bottom: -130, left: "28%", filter: "blur(72px)" }} />
      {/* flowing strands */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 430 940" preserveAspectRatio="xMidYMid slice" fill="none">
        <path d="M-30 90C130 170 60 330 200 410S360 620 300 820S250 990 370 1050"  stroke={CREAM}    strokeOpacity=".11" strokeWidth="2"   strokeLinecap="round" />
        <path d="M-60 220C120 300 40 470 220 540S430 720 360 950"                   stroke={TERRA_HI} strokeOpacity=".16" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M470 110C320 200 410 360 250 450S60 660 150 880"                   stroke={GREEN}    strokeOpacity=".13" strokeWidth="2"   strokeLinecap="round" />
        <path d="M500 430C360 490 420 640 300 720S120 900 180 1010"                 stroke={CREAM}    strokeOpacity=".08" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="2 11" />
        <path d="M-40 560C120 600 80 740 240 800S440 920 380 1030"                  stroke="#e7a83c"  strokeOpacity=".12" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 10" />
      </svg>
      {/* bokeh */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 430 940" preserveAspectRatio="xMidYMid slice">
        {bokeh.map(b => <circle key={b.id} cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} opacity={b.op} />)}
      </svg>
      {/* vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(125% 75% at 50% 36%, transparent 50%, rgba(6,10,8,.62) 100%)" }} />
    </div>
  );
}

// ─── Loyalty Card ─────────────────────────────────────────────────────────────
export function AsiaTasteLoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex, onShowQR, hideQR,
  rewardTiers, stampValue, cardNumber, milestoneBadge,
}: ThemeCardProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const maxStamps   = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;
  const tierSet     = new Set(activeTiers.map(t => t.stamps));
  const pct         = Math.round(Math.min(currentStamps / maxStamps, 1) * 100);

  const FF_BALOO  = "'Baloo 2', cursive";
  const FF_FREDKA = "'Fredoka', sans-serif";
  const FF_OUTFIT = "'Outfit', sans-serif";

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Fredoka:wght@400;500;600&family=Outfit:wght@400;500;600&display=swap" rel="stylesheet" />

      <div className="relative rounded-[26px] overflow-hidden"
        style={{
          background: "linear-gradient(180deg,#17211a 0%,#121913 100%)",
          border: `1px solid ${LINE}`,
          boxShadow: "inset 0 1px 0 rgba(242,234,212,.05), 0 20px 40px rgba(0,0,0,.45)",
        }}>

        {/* inner hairline */}
        <div className="absolute pointer-events-none" style={{ inset: 12, borderRadius: 17, border: `1px solid ${GREEN}29` }} />

        <div className="relative z-10 px-6 pt-8 pb-6 flex flex-col items-center">

          {/* Crest */}
          <div className="mb-3"><AsiaCrest /></div>

          {/* eyebrow row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap justify-center">
            <span style={{ fontFamily: FF_FREDKA, fontSize: 11, letterSpacing: "4px", color: GREEN, textTransform: "uppercase" }}>
              Stempelkarte
            </span>
            {cardNumber !== undefined && (
              <span style={{
                fontFamily: FF_FREDKA, fontSize: 11, letterSpacing: "1px",
                color: GREEN_HI, background: `${GREEN}21`, border: `1px solid ${GREEN}52`,
                borderRadius: 20, padding: "2px 9px",
              }}>
                #{String(cardNumber).padStart(3, "0")}
              </span>
            )}
            {milestoneBadge && (
              <span style={{
                fontFamily: FF_FREDKA, fontSize: 10,
                color: TERRA_HI, background: `${TERRA}22`, border: `1px solid ${TERRA}44`,
                borderRadius: 20, padding: "2px 8px",
              }}>
                {milestoneBadge}
              </span>
            )}
          </div>

          {/* Shop name */}
          <div style={{
            fontFamily: FF_BALOO, fontWeight: 800,
            fontSize: "clamp(26px,7vw,36px)", letterSpacing: 1, textTransform: "uppercase",
            color: CREAM, lineHeight: 1, textShadow: "0 2px 10px rgba(0,0,0,.4)",
            textAlign: "center",
          }}>
            {shopName}
          </div>

          {/* motto pill */}
          <div style={{
            marginTop: 12, marginBottom: 4,
            fontFamily: FF_FREDKA, fontSize: 11, letterSpacing: "2px",
            textTransform: "uppercase", color: GREEN_HI,
            border: `1px solid ${GREEN}66`, padding: "4px 14px", borderRadius: 20,
          }}>
            Asia-Markt &amp; Kiosk
          </div>

          {/* divider */}
          <div className="flex items-center gap-2 my-4" style={{ opacity: .75 }}>
            <div style={{ height: 1, width: 46, background: `linear-gradient(90deg,transparent,${GREEN}99)` }} />
            <BowlSVG size={14} color={GREEN} />
            <div style={{ height: 1, width: 46, background: `linear-gradient(90deg,${GREEN}99,transparent)` }} />
          </div>

          {/* Stamp grid */}
          <div className="w-full grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
            {Array.from({ length: maxStamps }).map((_, i) => {
              const filled = i < currentStamps;
              const isAnim = i === animateIndex;
              const isTier = tierSet.has(i + 1);
              return (
                <motion.div key={i} className="aspect-square"
                  animate={isAnim ? { scale: [1, 1.35, 1] } : {}}
                  transition={{ duration: 0.45 }}>
                  {filled ? (
                    <div className="w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle at 35% 30%,#3a2515,#1c130b)",
                        border: `1.5px solid ${TERRA}`,
                        boxShadow: `0 0 0 3px ${TERRA}1f, inset 0 1px 2px ${TERRA_HI}4d`,
                      }}>
                      <BowlSVG size={13} color={TERRA_HI} />
                    </div>
                  ) : isTier ? (
                    <div className="w-full h-full rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle at 35% 30%,#15281b,#0f1c13)",
                        border: `1.5px solid ${GREEN}`,
                        boxShadow: `0 0 14px ${GREEN}59, inset 0 1px 2px ${GREEN_HI}4d`,
                      }}>
                      <Gift size={11} style={{ color: GREEN_HI }} />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-full flex items-center justify-center"
                      style={{ border: `1.5px solid ${GREEN}47` }}>
                      <span style={{ fontFamily: FF_FREDKA, color: CREAM_DIM, fontSize: 13, fontWeight: 500 }}>{i + 1}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Progress */}
          <div className="w-full space-y-2">
            <div className="flex items-baseline justify-between">
              <span style={{ fontFamily: FF_FREDKA, fontSize: 15, color: CREAM, letterSpacing: "1px" }}>
                <b style={{ color: TERRA_HI }}>{currentStamps}</b> / {maxStamps} Stempel
              </span>
              <span style={{ fontFamily: FF_BALOO, fontWeight: 700, fontSize: 18, color: TERRA_HI }}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#20291f" }}>
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg,${TERRA_LO},${TERRA_HI})` }} />
            </div>
            {stampValue ? (
              <p style={{ fontFamily: FF_OUTFIT, fontSize: 13, color: MUTED }}>1 Stempel pro €{stampValue} Einkauf</p>
            ) : null}
          </div>

          {/* QR Button */}
          {!hideQR && onShowQR && (
            <button onClick={onShowQR} className="w-full mt-5 flex items-center justify-center gap-2.5 py-4 rounded-2xl"
              style={{
                background: `linear-gradient(180deg,${TERRA_HI},${TERRA} 55%,${TERRA_LO})`,
                color: "#2a1206",
                fontFamily: FF_FREDKA, fontWeight: 600, fontSize: 16,
                letterSpacing: "1px", textTransform: "uppercase",
                boxShadow: `0 8px 20px ${TERRA}47, inset 0 1px 0 rgba(255,255,255,.35)`,
              }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7"/>
              </svg>
              QR-Code vorzeigen
            </button>
          )}

        </div>
      </div>
    </>
  );
}

// ─── Reward Banner ────────────────────────────────────────────────────────────
export function AsiaTasteRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const FF_BALOO  = "'Baloo 2', cursive";
  const FF_FREDKA = "'Fredoka', sans-serif";

  const tiers = activeTiers.length > 0
    ? activeTiers
    : [{ stamps: stampsRequired, text: rewardText, enabled: true }];

  return (
    <div className="rounded-2xl px-4 py-4"
      style={{ background: `linear-gradient(180deg,${CARD2},#111813)`, border: `1px solid ${LINE}` }}>
      <p className="mb-3" style={{ fontFamily: FF_FREDKA, fontSize: 12, letterSpacing: "3px", textTransform: "uppercase", color: GREEN }}>
        Belohnungen
      </p>
      <div className="space-y-3">
        {tiers.map((tier, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(180deg,${TERRA_HI},${TERRA})`, color: "#2a1206", fontFamily: FF_BALOO, fontWeight: 700, fontSize: 14 }}>
              {i + 1}
            </div>
            <div>
              <p style={{ fontFamily: FF_FREDKA, fontSize: 12, color: MUTED }}>nach {tier.stamps} Stempeln</p>
              <p style={{ fontFamily: FF_BALOO, fontWeight: 600, fontSize: 16, color: CREAM, lineHeight: 1.25 }}>{tier.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Milestones ───────────────────────────────────────────────────────────────
export function AsiaTasteMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (active.length === 0) return null;
  const FF_FREDKA = "'Fredoka', sans-serif";

  return (
    <div className="rounded-2xl px-4 py-4"
      style={{ background: `linear-gradient(180deg,${CARD2},#111813)`, border: `1px solid ${LINE}` }}>
      <p className="mb-3" style={{ fontFamily: FF_FREDKA, fontSize: 12, letterSpacing: "3px", textTransform: "uppercase", color: GREEN }}>
        Meilensteine
      </p>
      <div className="space-y-3">
        {active.map((m, i) => {
          const reached  = totalStampsEver >= m.stamps;
          const progress = Math.min(totalStampsEver / m.stamps, 1);
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={reached
                  ? { background: `linear-gradient(180deg,${TERRA_HI},${TERRA})`, color: "#2a1206", fontFamily: "'Baloo 2',cursive", fontWeight: 700, fontSize: 13 }
                  : { background: CARD, border: `1px solid ${GREEN}40`, color: MUTED, fontFamily: FF_FREDKA, fontSize: 12 }}>
                {reached ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm truncate" style={{ color: reached ? CREAM : MUTED }}>{m.text}</p>
                  <span className="ml-2 shrink-0" style={{ fontFamily: FF_FREDKA, fontSize: 11, color: MUTED }}>
                    {Math.min(totalStampsEver, m.stamps)}/{m.stamps}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: `${GREEN}1a` }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: reached ? `linear-gradient(90deg,${TERRA_LO},${TERRA_HI})` : `${TERRA}80` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
