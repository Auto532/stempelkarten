"use client";

import { motion } from "framer-motion";
import { Gift, Award, QrCode } from "lucide-react";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

const A   = "#b45309";  // satteres Amber
const AD  = "#7c2d12";  // dunkles Rotbraun
const AF  = "#3b0d00";  // sehr dunkles Braun
const T   = "#1a0700";  // fast Schwarz für maximalen Kontrast
const TB  = "#3b0d00";  // dunkelbraun sekundär
const C   = "#fffdf0";  // warmes Weiß — Card hebt sich klar ab
const C2  = "#fef9d0";

function BroetchenIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor" />
      <path d="M7 10.5C9 8.5 15 8.5 17 10.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}


export function BakeryLoyaltyCard({ shopName, stampsRequired, currentStamps, animateIndex, onShowQR, hideQR, rewardTiers, accentColor, stampValue, cardNumber, milestoneBadge }: ThemeCardProps) {
  const accent = accentColor ?? A;
  const activeTiers = rewardTiers?.some(t => t.enabled)
    ? [{ stamps: stampsRequired, text: "", enabled: true }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{ background: C, border: `2px solid ${accent}70`, boxShadow: `0 8px 32px ${accent}30, 0 2px 8px rgba(0,0,0,0.08)` }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${accent}18, transparent)` }} />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: AD }}>Stempelkarte</p>
              {cardNumber !== undefined && (
                <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                  style={{ background: `${accent}18`, color: AD }}>
                  #{String(cardNumber).padStart(3, "0")}
                </span>
              )}
              {milestoneBadge && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${accent}20`, color: accent }}>{milestoneBadge}</span>
              )}
            </div>
            <h2 className="text-xl font-black leading-tight" style={{ color: T }}>{shopName}</h2>
          </div>
          {!hideQR && onShowQR && (
            <button onClick={onShowQR} className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: C2, border: `1px solid ${accent}40` }}>
              <QrCode size={26} style={{ color: accent }} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: maxStamps }).map((_, i) => {
            const filled = i < currentStamps;
            const isAnimating = i === animateIndex;
            const isTier = activeTiers.some(t => t.stamps === i + 1);
            return (
              <motion.div key={i}
                animate={isAnimating ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.5 }}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={filled
                  ? { background: `linear-gradient(135deg, ${accent}, ${AD})`, boxShadow: `0 0 12px ${accent}50`, border: `2px solid ${accent}80` }
                  : isTier
                  ? { border: `2px solid ${accent}70`, background: `${accent}18` }
                  : { border: `2px dashed ${accent}55`, background: "rgba(255,255,255,0.8)" }}>
                {filled && <BroetchenIcon className="w-4 h-4" style={{ color: "white" }} />}
                {!filled && isTier && <Gift size={11} style={{ color: AF }} />}
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span style={{ color: TB }}>{currentStamps} / {maxStamps} Stempel</span>
            </div>
            <span style={{ color: accent }}>{Math.round(Math.min(currentStamps / maxStamps, 1) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: `${accent}30` }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(currentStamps / maxStamps * 100, 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(to right, ${accent}, ${AD})` }}
            />
          </div>
          {stampValue ? (
            <p className="text-[10px] mt-1.5 font-semibold" style={{ color: AD }}>
              1 Stempel pro €{stampValue} Einkauf
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BakeryRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const activeTiers = rewardTiers?.some(t => t.enabled)
    ? [{ stamps: stampsRequired, text: rewardText, enabled: true }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [];
  if (activeTiers.length > 0) {
    return (
      <div className="rounded-2xl px-4 py-3 space-y-2.5" style={{ background: C, border: `2px solid ${A}55`, boxShadow: `0 2px 8px rgba(0,0,0,0.06)` }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: TB }}>Belohnungen</p>
        {activeTiers.map((tier, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
              style={{ background: `linear-gradient(135deg, ${A}, ${AD})`, color: "white" }}>{i + 1}</div>
            <div>
              <p className="text-[10px] font-semibold" style={{ color: AD }}>nach {tier.stamps} Stempeln</p>
              <p className="text-sm font-bold" style={{ color: T }}>{tier.text}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: C, border: `2px solid ${A}55`, boxShadow: `0 2px 8px rgba(0,0,0,0.06)` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${A}25`, border: `2px solid ${A}60` }}>
        <Gift size={16} style={{ color: A }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold" style={{ color: AD }}>nach {stampsRequired} Stempeln</p>
        <p className="text-sm font-bold" style={{ color: T }}>{rewardText}</p>
      </div>
    </div>
  );
}

export function BakeryMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (active.length === 0) return null;
  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: C, border: `2px solid ${A}55`, boxShadow: `0 2px 8px rgba(0,0,0,0.06)` }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: TB }}>Meilensteine</p>
      <div className="space-y-3">
        {active.map((m, i) => {
          const reached = totalStampsEver >= m.stamps;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={reached
                  ? { background: `linear-gradient(135deg, ${A}, ${AD})` }
                  : { background: C2, border: `2px solid ${A}60` }}>
                {reached ? <Award size={13} style={{ color: "white" }} /> : <span className="text-[10px] font-bold" style={{ color: AF }}>{m.stamps}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: reached ? T : TB }}>{m.text}</p>
                {!reached && <p className="text-[10px] font-medium" style={{ color: AD }}>noch {m.stamps - totalStampsEver} Stempel</p>}
              </div>
              {reached && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${A}25`, color: AF, border: `1px solid ${A}60` }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
