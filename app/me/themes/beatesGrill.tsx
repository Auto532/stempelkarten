"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, Gift, Award, Flame } from "lucide-react";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

const A  = "#E8A020";
const AD = "#A06815";
const AF = "#5A3808";
const T  = "#F5E8C0";
const TB = "#D4B870";
const BG = "#0A0400";
const C  = "#120900";
const D  = "#1C1005";

export function BeatesGrillBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div className="absolute inset-0" style={{ background: BG }} />

      {/* Flame blobs */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div key={i}
          className="absolute bottom-0"
          style={{
            left: `${i * 22 - 8}%`,
            width: "38%",
            height: "50%",
            background: `radial-gradient(ellipse at 50% 100%, ${i % 2 === 0 ? "#E07818" : "#C03008"} 0%, #7A100488 45%, transparent 75%)`,
            filter: "blur(22px)",
          }}
          animate={{
            scaleY: [1, 1.18, 0.88, 1.1, 1],
            scaleX: [1, 0.94, 1.06, 0.96, 1],
            y: [0, -10, 5, -7, 0],
            opacity: [0.55, 0.75, 0.45, 0.70, 0.55],
          }}
          transition={{ duration: 2.2 + i * 0.35, repeat: Infinity, delay: i * 0.45, ease: "easeInOut" }}
        />
      ))}

      {/* Inner bright core */}
      <motion.div className="absolute bottom-0 left-0 right-0 h-24"
        style={{ background: "radial-gradient(ellipse 60% 100% at 50% 100%, #E8A02030, transparent)" }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating embers */}
      {[...Array(10)].map((_, i) => (
        <motion.div key={i}
          className="absolute rounded-full"
          style={{
            width: i % 4 === 0 ? 3 : 2,
            height: i % 4 === 0 ? 3 : 2,
            background: i % 3 === 0 ? "#F5C040" : i % 3 === 1 ? A : "#FF6820",
            left: `${6 + i * 9}%`,
            bottom: `${12 + (i % 4) * 6}%`,
          }}
          animate={{
            y: [0, -(110 + i * 32)],
            x: [0, (i % 2 === 0 ? 1 : -1) * (12 + i * 5)],
            opacity: [0, 0.9, 0],
            scale: [0.5, 1.3, 0],
          }}
          transition={{ duration: 2.8 + i * 0.38, repeat: Infinity, delay: i * 0.52, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

export function BeatesGrillLoyaltyCard({ shopName, stampsRequired, currentStamps, animateIndex, onShowQR, hideQR, rewardTiers, accentColor, stampValue, cardNumber, milestoneBadge }: ThemeCardProps) {
  const accent = accentColor ?? A;
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{ background: `linear-gradient(145deg, ${D}, ${C})`, border: `1px solid ${accent}28`, boxShadow: `0 8px 32px ${accent}0D` }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${accent}0C, transparent)` }} />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: AD }}>Stempelkarte</p>
              {cardNumber !== undefined && (
                <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                  style={{ background: `${accent}18`, color: `${AD}` }}>
                  #{String(cardNumber).padStart(3, "0")}
                </span>
              )}
              {milestoneBadge && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${accent}20`, color: accent }}>{milestoneBadge}</span>
              )}
            </div>
            <h2 className="text-lg font-bold leading-tight" style={{ color: T }}>{shopName}</h2>
          </div>
          {!hideQR && onShowQR && (
            <button onClick={onShowQR} className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: C, border: `1px solid ${accent}28` }}>
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
                  ? { background: `linear-gradient(135deg, ${accent}, #B07010)`, boxShadow: `0 0 10px ${accent}50`, border: `1px solid ${accent}60` }
                  : isTier ? { border: `1px solid ${accent}35`, background: C }
                  : { border: `1px solid ${AF}55`, background: `${BG}88` }}>
                {filled && <Flame size={13} style={{ color: "#1A0800" }} />}
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
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BG }}>
            <motion.div initial={{ width: 0 }}
              animate={{ width: `${Math.min(currentStamps / maxStamps * 100, 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(to right, ${accent}, #B07010)` }} />
          </div>
          {stampValue ? (
            <p className="text-[10px] mt-1.5" style={{ color: AD }}>
              1 Stempel pro €{stampValue} Einkauf
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BeatesGrillRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const activeTiers = rewardTiers?.some(t => t.enabled)
    ? [{ stamps: stampsRequired, text: rewardText, enabled: true }, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [];
  if (activeTiers.length > 0) {
    return (
      <div className="rounded-2xl px-4 py-3 space-y-2.5" style={{ background: C, border: `1px solid ${A}18` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: AD }}>Belohnungen</p>
        {activeTiers.map((tier, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
              style={{ background: `linear-gradient(135deg, ${A}, #B07010)`, color: "#1A0800" }}>{i + 1}</div>
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
    <div className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: C, border: `1px solid ${A}18` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${A}18`, border: `1px solid ${A}30` }}>
        <Gift size={16} style={{ color: A }} />
      </div>
      <div>
        <p className="text-[10px]" style={{ color: AD }}>nach {stampsRequired} Stempeln</p>
        <p className="text-sm font-semibold" style={{ color: T }}>{rewardText}</p>
      </div>
    </div>
  );
}

export function BeatesGrillMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (active.length === 0) return null;
  return (
    <div className="rounded-2xl px-4 py-4" style={{ background: C, border: `1px solid ${A}18` }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: AD }}>Meilensteine</p>
      <div className="space-y-3">
        {active.map((m, i) => {
          const reached = totalStampsEver >= m.stamps;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={reached ? { background: `linear-gradient(135deg, ${A}, #B07010)` } : { background: D, border: `1px solid ${A}28` }}>
                {reached ? <Award size={13} style={{ color: "#1A0800" }} /> : <span className="text-[10px] font-bold" style={{ color: AD }}>{m.stamps}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: reached ? T : TB }}>{m.text}</p>
                {!reached && <p className="text-[10px]" style={{ color: AF }}>noch {m.stamps - totalStampsEver} Stempel</p>}
              </div>
              {reached && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${A}18`, color: A, border: `1px solid ${A}30` }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
