"use client";

import { motion } from "framer-motion";
import { Gift, Award, QrCode } from "lucide-react";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

const PINK   = "#f0006e";
const BERRY  = "#a8004d";
const PINK3  = "#ffd6e9";
const MINT   = "#72c8ac";
const GOLD   = "#efb84d";
const TEXT   = "#2c1020";
const MUTED  = "#8c6578";
const SURFACE = "#fffafe";
const SURFACE2 = "#fff1f8";

function IceCreamIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none">
      <ellipse cx="12" cy="9" rx="5" ry="5" fill="currentColor" />
      <path d="M9 13.5L12 22l3-8.5" fill="currentColor" opacity="0.7" />
      <ellipse cx="12" cy="9" rx="2" ry="2" fill="white" opacity="0.3" />
    </svg>
  );
}

export function EiszauberBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div className="absolute inset-0" style={{
        background: "radial-gradient(circle at 15% 18%, rgba(255,79,160,.42), transparent 28%), radial-gradient(circle at 85% 12%, rgba(255,100,180,.55), transparent 24%), radial-gradient(circle at 50% 55%, rgba(255,150,200,.22), transparent 35%), radial-gradient(circle at 70% 88%, rgba(114,200,172,.18), transparent 26%), linear-gradient(180deg,#ffe8f5 0%,#ffd6ee 100%)"
      }} />
      <svg className="absolute inset-0 w-full h-full opacity-70" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="eiszauber-pattern" x="0" y="0" width="180" height="180" patternUnits="userSpaceOnUse">
            <path d="M48 40c10-12 28-12 38 0 6 8 6 18 0 26L67 88 48 66c-6-8-6-18 0-26Z" fill="#ffb8d8" />
            <path d="M118 98c8-9 21-9 29 0 5 6 5 14 0 20l-15 18-14-18c-5-6-5-14 0-20Z" fill="#ffc8a0" />
            <circle cx="129" cy="52" r="10" fill="#ffaad4" />
            <path d="M34 128c7-9 20-9 27 0 4 5 4 12 0 17l-13 16-14-16c-4-5-4-12 0-17Z" fill="#c8f0e0" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#eiszauber-pattern)" />
      </svg>
    </div>
  );
}

export function EiszauberLoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex, onShowQR, hideQR,
  rewardTiers, accentColor, stampValue, cardNumber, milestoneBadge,
}: ThemeCardProps) {
  const accent = accentColor ?? PINK;
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;

  return (
    <div className="relative rounded-[30px] overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgba(255,255,255,.9), rgba(255,248,252,.98))", border: `1px solid ${accent}22`, boxShadow: `0 8px 30px ${BERRY}14, 0 2px 10px rgba(44,16,32,.06)` }}>

      {/* top gradient stripe */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}, #ff7bb9, #ffcf63 88%)` }} />

      {/* glow orb top-right */}
      <div className="absolute right-[-30px] top-[-30px] w-36 h-36 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}22, transparent 70%)` }} />

      <div className="relative p-5">
        {/* Badge + QR row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-2"
              style={{ background: PINK3, color: BERRY }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
              <span className="text-[10px] font-black uppercase tracking-widest">Stempelkarte</span>
              {cardNumber !== undefined && (
                <span className="text-[10px] font-bold opacity-60">#{String(cardNumber).padStart(3, "0")}</span>
              )}
              {milestoneBadge && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${accent}20`, color: accent }}>{milestoneBadge}</span>
              )}
            </div>
            <h2 className="text-2xl font-black leading-tight tracking-tight" style={{ color: TEXT }}>
              {shopName.includes(" ") ? (
                <>
                  {shopName.split(" ").slice(0, -1).join(" ")}{" "}
                  <span style={{ color: BERRY }}>{shopName.split(" ").slice(-1)}</span>
                </>
              ) : <span style={{ color: BERRY }}>{shopName}</span>}
            </h2>
          </div>
          {!hideQR && onShowQR && (
            <button onClick={onShowQR}
              className="shrink-0 w-14 h-14 rounded-[18px] flex items-center justify-center"
              style={{ background: SURFACE2, border: `1px solid ${accent}20`, boxShadow: `0 4px 12px ${BERRY}10` }}>
              <QrCode size={24} style={{ color: accent }} />
            </button>
          )}
        </div>

        {/* Stamp grid */}
        <div className="rounded-[22px] p-4 mb-3"
          style={{ background: "linear-gradient(180deg,#fff7fb,#ffeff7)", border: `1px solid ${accent}18` }}>
          <div className="grid grid-cols-5 gap-2.5">
            {Array.from({ length: maxStamps }).map((_, i) => {
              const filled = i < currentStamps;
              const isAnimating = i === animateIndex;
              const isGoal = activeTiers.some(t => t.stamps === i + 1) || (!activeTiers.length && i + 1 === stampsRequired);
              return (
                <motion.div key={i}
                  animate={isAnimating ? { scale: [1, 1.35, 1] } : {}}
                  transition={{ duration: 0.45 }}
                  className="aspect-square rounded-full flex items-center justify-center font-bold"
                  style={filled
                    ? { background: `linear-gradient(135deg, ${accent}, ${BERRY})`, boxShadow: `0 6px 16px ${accent}35`, color: "white" }
                    : isGoal
                    ? { background: `linear-gradient(135deg, #ffd978, ${GOLD})`, color: "#7a4c00", border: `1px solid ${GOLD}70` }
                    : { border: `1.8px solid ${accent}35`, background: "rgba(255,255,255,.85)", color: MUTED, fontSize: "13px" }
                  }>
                  {filled
                    ? <IceCreamIcon className="w-4 h-4" style={{ color: "white" }} />
                    : isGoal
                    ? <Gift size={14} style={{ color: "#7a4c00" }} />
                    : <span className="text-[12px]">{i + 1}</span>
                  }
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span style={{ color: MUTED }}>{currentStamps} / {maxStamps} Stempel</span>
            </div>
            <span style={{ color: accent }}>{Math.round(Math.min(currentStamps / maxStamps, 1) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: `${accent}22` }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(currentStamps / maxStamps * 100, 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}, ${BERRY})` }}
            />
          </div>
          {stampValue ? (
            <p className="text-[10px] mt-1 font-semibold" style={{ color: BERRY }}>
              1 Stempel = €{stampValue} Einkauf
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EiszauberRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];

  if (activeTiers.length > 0) {
    return (
      <div className="rounded-[22px] px-4 py-3.5 space-y-2.5"
        style={{ background: SURFACE, border: `1px solid ${PINK}22`, boxShadow: `0 4px 16px ${BERRY}0a` }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Belohnungen</p>
        {activeTiers.map((tier, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
              style={{ background: `linear-gradient(135deg, ${PINK}, ${BERRY})`, color: "white" }}>{i + 1}</div>
            <div>
              <p className="text-[10px] font-semibold" style={{ color: MUTED }}>nach {tier.stamps} Stempeln</p>
              <p className="text-sm font-bold" style={{ color: TEXT }}>{tier.text}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[22px] px-4 py-3.5 flex items-center gap-3"
      style={{ background: SURFACE, border: `1px solid ${PINK}22`, boxShadow: `0 4px 16px ${BERRY}0a` }}>
      <div className="w-10 h-10 rounded-[14px] shrink-0 flex items-center justify-center"
        style={{ background: "#e8fbf4", border: `1px solid ${MINT}44` }}>
        <Gift size={18} style={{ color: MINT }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: MUTED }}>ab {stampsRequired} Stempeln</p>
        <p className="text-base font-bold" style={{ color: TEXT }}>{rewardText}</p>
      </div>
    </div>
  );
}

export function EiszauberMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (active.length === 0) return null;

  const colors = [
    { bg: "#f7e6d1", text: "#9b641c", bar: "linear-gradient(90deg,#d8954f,#efc58b)" },
    { bg: "#eef2f5", text: "#647686", bar: "linear-gradient(90deg,#90a8ba,#c8d6df)" },
    { bg: "#fff0c7", text: "#a77908", bar: "linear-gradient(90deg,#efb84d,#ffd978)" },
  ];

  return (
    <div className="rounded-[22px] px-4 py-4"
      style={{ background: SURFACE, border: `1px solid ${PINK}22`, boxShadow: `0 4px 16px ${BERRY}0a` }}>
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill={PINK} className="shrink-0">
          <path d="M12 3l2.8 5.67L21 9.6l-4.5 4.39 1.06 6.21L12 17.27 6.44 20.2 7.5 14 3 9.6l6.2-.93L12 3z" />
        </svg>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: MUTED }}>Treue-Meilensteine</p>
      </div>
      <div className="space-y-3">
        {active.map((m, i) => {
          const reached = totalStampsEver >= m.stamps;
          const col = colors[i % colors.length];
          const progress = Math.min(totalStampsEver / m.stamps, 1) * 100;
          return (
            <div key={i} className="rounded-[18px] p-3"
              style={{ background: reached ? `${PINK}0a` : SURFACE2, border: `1px solid ${PINK}14` }}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-7 h-7 rounded-[10px] shrink-0 flex items-center justify-center text-[11px] font-black"
                  style={{ background: col.bg, color: col.text }}>
                  {i + 1}
                </div>
                <span className="font-bold text-sm flex-1" style={{ color: TEXT }}>{m.text}</span>
                {reached && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                    style={{ background: `${PINK}18`, color: BERRY }}>✓</span>
                )}
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f6dce8" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: col.bar }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] font-bold" style={{ color: MUTED }}>
                <span>{reached ? "Erreicht!" : `noch ${m.stamps - totalStampsEver} Stempel`}</span>
                <span>{Math.min(totalStampsEver, m.stamps)} / {m.stamps}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
