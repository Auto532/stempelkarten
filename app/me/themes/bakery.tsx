"use client";

import { motion } from "framer-motion";
import { Gift, Award, QrCode } from "lucide-react";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

const A   = "#d97706";
const AD  = "#b45309";
const AF  = "#92400e";
const T   = "#451a03";
const TB  = "#78350f";
const BG  = "#fef3c7";
const C   = "#fffbeb";
const C2  = "#fef9ee";

function BroetchenIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" fill="currentColor" />
      <path d="M7 10.5C9 8.5 15 8.5 17 10.5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function BakeryBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div className="absolute inset-0" style={{ background: `linear-gradient(175deg, ${BG} 0%, #fde68a 55%, ${BG} 100%)` }} />

      {[0, 1, 2].map((i) => (
        <motion.div key={i}
          className="absolute bottom-0"
          style={{
            left: `${i * 35 - 5}%`,
            width: "50%",
            height: "40%",
            background: `radial-gradient(ellipse at 50% 100%, ${i % 2 === 0 ? A : AD}28 0%, transparent 70%)`,
            filter: "blur(22px)",
          }}
          animate={{ opacity: [0.4, 0.75, 0.4], scaleY: [1, 1.1, 1] }}
          transition={{ duration: 3 + i * 0.6, repeat: Infinity, delay: i * 0.9, ease: "easeInOut" }}
        />
      ))}

      {[...Array(10)].map((_, i) => (
        <motion.div key={i}
          className="absolute rounded-full"
          style={{
            width: i % 3 === 0 ? 4 : 2,
            height: i % 3 === 0 ? 4 : 2,
            background: "rgba(255,255,255,0.85)",
            left: `${6 + i * 9}%`,
            bottom: `${10 + (i % 4) * 8}%`,
          }}
          animate={{
            y: [0, -(90 + i * 18)],
            x: [0, (i % 2 === 0 ? 1 : -1) * (10 + i * 4)],
            opacity: [0, 0.7, 0],
          }}
          transition={{ duration: 4.5 + i * 0.4, repeat: Infinity, delay: i * 0.65, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function BakeryLoyaltyCard({ shopName, stampsRequired, currentStamps, animateIndex, onShowQR, hideQR, rewardTiers, accentColor }: ThemeCardProps) {
  const accent = accentColor ?? A;
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{ background: C, border: `1px solid ${accent}50`, boxShadow: `0 8px 32px ${accent}22` }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${accent}14, transparent)` }} />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: AD }}>Stempelkarte</p>
            <h2 className="text-lg font-bold leading-tight" style={{ color: T }}>{shopName}</h2>
          </div>
          {!hideQR && onShowQR && (
            <button onClick={onShowQR} className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: C2, border: `1px solid ${accent}40` }}>
              <QrCode size={16} style={{ color: accent }} />
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
                  ? { background: `linear-gradient(135deg, ${accent}, ${AD})`, boxShadow: `0 0 10px ${accent}40`, border: `1px solid ${accent}60` }
                  : isTier
                  ? { border: `1px solid ${accent}50`, background: `${accent}12` }
                  : { border: `1px dashed ${accent}40`, background: "rgba(255,255,255,0.5)" }}>
                {filled && <BroetchenIcon className="w-4 h-4" style={{ color: "white" }} />}
                {!filled && isTier && <Gift size={11} style={{ color: AF }} />}
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: AD }}>{currentStamps} / {maxStamps} Stempel</span>
            <span style={{ color: accent }}>{Math.round(Math.min(currentStamps / maxStamps, 1) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${accent}20` }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(currentStamps / maxStamps * 100, 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(to right, ${accent}, ${AD})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function BakeryRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  if (activeTiers.length > 0) {
    return (
      <div className="rounded-2xl px-4 py-3 space-y-2.5" style={{ background: C, border: `1px solid ${A}30` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: AD }}>Belohnungen</p>
        {activeTiers.map((tier, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
              style={{ background: `linear-gradient(135deg, ${A}, ${AD})`, color: "white" }}>{i + 1}</div>
            <div>
              <p className="text-[10px]" style={{ color: AD }}>nach {tier.stamps} Stempeln</p>
              <p className="text-sm font-semibold" style={{ color: T }}>{tier.text}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: C, border: `1px solid ${A}30` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${A}18`, border: `1px solid ${A}40` }}>
        <Gift size={16} style={{ color: A }} />
      </div>
      <div>
        <p className="text-[10px]" style={{ color: AD }}>nach {stampsRequired} Stempeln</p>
        <p className="text-sm font-semibold" style={{ color: T }}>{rewardText}</p>
      </div>
    </div>
  );
}

export function BakeryMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (active.length === 0) return null;
  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: C, border: `1px solid ${A}30` }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: AD }}>Meilensteine</p>
      <div className="space-y-3">
        {active.map((m, i) => {
          const reached = totalStampsEver >= m.stamps;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={reached
                  ? { background: `linear-gradient(135deg, ${A}, ${AD})` }
                  : { background: C2, border: `1px solid ${A}40` }}>
                {reached ? <Award size={13} style={{ color: "white" }} /> : <span className="text-[10px] font-bold" style={{ color: AD }}>{m.stamps}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: reached ? T : TB }}>{m.text}</p>
                {!reached && <p className="text-[10px]" style={{ color: AF }}>noch {m.stamps - totalStampsEver} Stempel</p>}
              </div>
              {reached && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${A}18`, color: A, border: `1px solid ${A}40` }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
