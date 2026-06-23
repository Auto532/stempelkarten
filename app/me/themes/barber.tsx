"use client";

import { motion } from "framer-motion";
import { QrCode, Gift } from "lucide-react";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

// ─── Farben ───────────────────────────────────────────────────────────────────
const GOLD  = "#cca352";
const GOLD2 = "#e8d08d";
const GOLD3 = "#8b6a2a";
const BG    = "#050506";
const CARD  = "#0f0f11";
const CREAM = "#f0e8d0";
const MUTED = "#6b5535";

// ─── Schere-Icon ──────────────────────────────────────────────────────────────
function ScissorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

// ─── Background ───────────────────────────────────────────────────────────────
export function BarberBackground() {
  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none" style={{ background: BG }}>
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 80% 55% at 50% 10%, rgba(204,163,82,0.09) 0%, transparent 65%)"
      }} />
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse 50% 35% at 85% 85%, rgba(204,163,82,0.04) 0%, transparent 55%)"
      }} />
    </div>
  );
}

// ─── Loyalty Card ─────────────────────────────────────────────────────────────
export function BarberLoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex,
  onShowQR, hideQR, rewardTiers, stampValue, cardNumber,
}: ThemeCardProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;
  const cols = maxStamps <= 6 ? 3 : maxStamps <= 8 ? 4 : 5;

  return (
    <div
      className="relative rounded-3xl overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${CARD}, ${BG})`,
        border: `1px solid ${GOLD}28`,
        boxShadow: `0 24px 60px rgba(0,0,0,0.85), 0 0 0 1px ${GOLD}0C`,
      }}
    >
      {/* Top-Glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 75% 45% at 50% 0%, ${GOLD}0E, transparent)` }} />

      <div className="relative p-6">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[8px] font-bold uppercase tracking-[0.28em]" style={{ color: MUTED }}>
              Stempelkarte
            </span>
            {cardNumber !== undefined && (
              <span className="text-[8px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                style={{ background: `${GOLD}14`, color: GOLD3 }}>
                #{String(cardNumber).padStart(3, "0")}
              </span>
            )}
          </div>

          <h2
            className="text-[26px] font-black tracking-tight leading-none mb-3"
            style={{
              background: `linear-gradient(135deg, ${GOLD2} 0%, ${GOLD} 50%, ${GOLD3} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {shopName}
          </h2>

          {/* Barber-Pole Streifen */}
          <div className="h-[2px] w-full rounded-full"
            style={{
              background: `repeating-linear-gradient(45deg, ${GOLD}80, ${GOLD}80 5px, ${CARD} 5px, ${CARD} 10px)`,
              opacity: 0.6,
            }}
          />
        </div>

        {/* Stempel-Raster */}
        <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: maxStamps }).map((_, i) => {
            const filled = i < currentStamps;
            const isNew  = animateIndex === i;
            return (
              <motion.div
                key={i}
                className="aspect-square rounded-full flex items-center justify-center"
                style={{
                  background: filled
                    ? `radial-gradient(circle at top left, ${GOLD}1C, transparent 70%)`
                    : "#080809",
                  border: filled
                    ? `1px solid ${GOLD}55`
                    : `2px dashed ${GOLD}20`,
                  boxShadow: filled ? `0 0 14px ${GOLD}1A` : undefined,
                }}
                animate={isNew ? { scale: [1, 1.32, 0.94, 1.06, 1] } : {}}
                transition={{ duration: 0.42 }}
              >
                {filled && (
                  <motion.div
                    initial={isNew ? { scale: 0, rotate: -30 } : { scale: 1 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, delay: isNew ? 0.05 : 0 }}
                    className="w-[58%] h-[58%]"
                    style={{ color: GOLD }}
                  >
                    <ScissorIcon className="w-full h-full" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Zähler + Stempelwert */}
        <p className="text-center text-[11px] mb-5" style={{ color: MUTED }}>
          {currentStamps} von {maxStamps} Stempel
          {stampValue ? <> · €{stampValue} pro Stempel</> : null}
        </p>

        {/* QR-Button */}
        {!hideQR && onShowQR && (
          <button
            onClick={onShowQR}
            className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold active:scale-[0.98] transition-transform"
            style={{
              background: `linear-gradient(135deg, ${GOLD2}, ${GOLD}, ${GOLD3})`,
              color: "#1a1000",
              boxShadow: `0 6px 24px ${GOLD}28`,
            }}
          >
            <QrCode size={15} />
            QR-Code vorzeigen
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Reward Banner ────────────────────────────────────────────────────────────
export function BarberRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const tiers = activeTiers.length > 0 ? activeTiers : [{ stamps: stampsRequired, text: rewardText, enabled: true as const }];

  return (
    <div className="space-y-2">
      {tiers.map((tier, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{
            background: `linear-gradient(to right, ${GOLD}0A, transparent)`,
            border: `1px solid ${GOLD}20`,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${GOLD}14`, border: `1px solid ${GOLD}2C` }}
          >
            <Gift size={18} style={{ color: GOLD }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: MUTED }}>
              Ab {tier.stamps} Stempeln
            </p>
            <p className="text-sm font-bold truncate" style={{ color: CREAM }}>{tier.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Milestones ───────────────────────────────────────────────────────────────
export function BarberMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (!active.length) return null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: CARD, border: `1px solid ${GOLD}18` }}>
      <div className="px-5 py-4 flex items-center gap-2.5" style={{ borderBottom: `1px solid ${GOLD}14` }}>
        <div style={{ color: GOLD }}>
          <ScissorIcon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: MUTED }}>
          Treue-Meilensteine
        </span>
      </div>
      <div className="p-4 space-y-4">
        {active.map((m, i) => {
          const reached  = totalStampsEver >= m.stamps;
          const progress = Math.min(totalStampsEver / m.stamps, 1);
          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                style={reached
                  ? { background: `${GOLD}20`, border: `1px solid ${GOLD}50`, color: GOLD }
                  : { background: "#111", border: "1px solid #1e1e1e", color: "#444" }
                }
              >
                {reached ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm truncate font-medium" style={{ color: reached ? CREAM : "#555" }}>
                    {m.text}
                  </p>
                  <span className="text-[10px] ml-2 shrink-0 tabular-nums" style={{ color: reached ? GOLD : "#444" }}>
                    {totalStampsEver} / {m.stamps}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: `${GOLD}12` }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: reached ? GOLD : `${GOLD}55` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
