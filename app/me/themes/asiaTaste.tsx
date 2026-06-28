"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { QrCode, Gift, Award } from "lucide-react";
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

const TERRA  = "#D2603A";
const TERRAB = "#F0844F";
const NOODLE = "#F4D9AE";
const GREEN  = "#6FB083";
const CREAM  = "#F5ECD6";
const MUTED  = "#8AA391";
const BG     = "#0c1410";
const PANEL  = "#16211a";
const PANEL2 = "#101813";

function BowlIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
      <path d="M14 8c-1.6 1.6 1.6 2.6 0 4.2M18 7c-1.6 1.6 1.6 2.6 0 4.2M22 8c-1.6 1.6 1.6 2.6 0 4.2"
        stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity={0.75} />
      <path d="M7 17h22c0 5.4-4.6 9.4-11 9.4S7 22.4 7 17Z" stroke={color} strokeWidth="2" fill="none" />
      <path d="M9 20c2 1.4 4 2 9 2s7-.6 9-2" stroke={color} strokeWidth="1.4" fill="none" opacity={0.85} />
    </svg>
  );
}

export function AsiaTasteBackground() {
  const [sparkles, setSparkles] = useState<Array<{ id: number; x: number; dur: number; delay: number; size: number }>>([]);

  useEffect(() => {
    setSparkles(Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      dur: 6 + Math.random() * 6,
      delay: Math.random() * 9,
      size: 2 + Math.random() * 2,
    })));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div className="absolute inset-0" style={{ background: BG }} />
      <div className="absolute inset-0" style={{
        background: [
          "radial-gradient(75% 50% at 50% 116%, #c8542f55 0%, #2e4d3a33 42%, transparent 66%)",
          "radial-gradient(80% 55% at 14% 4%, #25402f 0%, transparent 52%)",
          "radial-gradient(60% 40% at 90% 30%, #3a2517 0%, transparent 55%)",
        ].join(", "),
      }} />

      {/* Terra glow — links */}
      <motion.div className="absolute rounded-full"
        style={{ width: 280, height: 280, left: -80, top: "5%", background: "#d2603a33", filter: "blur(60px)" }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Green glow — rechts */}
      <motion.div className="absolute rounded-full"
        style={{ width: 240, height: 240, right: -70, bottom: "8%", background: "#6fb08326", filter: "blur(60px)" }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
      />

      {/* Fließende Nudel-Stränge */}
      <motion.div className="absolute" style={{ top: "-8%", left: "-15%", width: "80%", height: "118%" }}
        animate={{ y: [0, -16, 0], rotate: [0, 1.4, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}>
        <svg viewBox="0 0 300 600" fill="none" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 6px #f0844f44)" }}>
          <defs>
            <linearGradient id="at-ng" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#F4D9AE" stopOpacity="0" />
              <stop offset=".5" stopColor="#F0B98A" stopOpacity=".85" />
              <stop offset="1" stopColor="#C8542F" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="url(#at-ng)" fill="none" strokeLinecap="round">
            <motion.path
              d="M-20 40 C120 120 40 200 150 250 C260 300 90 360 200 430 C290 490 150 540 60 610"
              strokeWidth="2.6" strokeDasharray="18 10"
              animate={{ strokeDashoffset: [0, -280] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            <motion.path
              d="M-40 90 C100 150 30 230 130 290 C240 350 70 400 180 470"
              strokeWidth="1.5" strokeDasharray="18 10"
              animate={{ strokeDashoffset: [0, -280] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <motion.path
              d="M-10 10 C140 90 60 170 170 220 C250 260 120 320 150 380"
              strokeWidth="1.1" strokeDasharray="18 10"
              animate={{ strokeDashoffset: [0, -280] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
            />
          </g>
        </svg>
      </motion.div>

      {/* Aufsteigende Funken */}
      {sparkles.map(s => (
        <motion.div key={s.id} className="absolute rounded-full"
          style={{
            left: `${s.x}%`, bottom: -8,
            width: s.size, height: s.size,
            background: "#F6C98E",
            boxShadow: "0 0 7px 1px #f0a06f99",
          }}
          animate={{ y: [0, "-92vh"], opacity: [0, 0.9, 0.4, 0] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
}

export function AsiaTasteLoyaltyCard({ shopName, stampsRequired, currentStamps, animateIndex, onShowQR, hideQR, rewardTiers, accentColor, stampValue, cardNumber, milestoneBadge }: ThemeCardProps) {
  const accent = accentColor ?? TERRA;
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  const maxStamps = activeTiers.length > 0 ? activeTiers[activeTiers.length - 1].stamps : stampsRequired;

  return (
    <div className="relative rounded-3xl overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${PANEL}, ${PANEL2})`,
        border: `1px solid ${GREEN}26`,
        boxShadow: "0 26px 60px -28px #000, inset 0 1px 0 #ffffff0a",
      }}>

      {/* Licht-Sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div className="absolute top-0 h-full"
          style={{
            width: "50%",
            background: "linear-gradient(100deg, transparent, #ffffff0e, transparent)",
            skewX: -18,
          }}
          initial={{ x: "-120%" }}
          animate={{ x: "440%" }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }}
        />
      </div>

      {/* Top-Glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 40% at 50% 0%, ${accent}0C, transparent)` }} />

      <div className="relative p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: GREEN }}>Stempelkarte</p>
              {cardNumber !== undefined && (
                <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                  style={{ background: `${GREEN}18`, color: `${GREEN}99` }}>
                  #{String(cardNumber).padStart(3, "0")}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold leading-tight" style={{ color: CREAM }}>{shopName}</h2>
          </div>
          {!hideQR && onShowQR && (
            <button onClick={onShowQR}
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: PANEL2, border: `1px solid ${GREEN}50` }}>
              <QrCode size={26} style={{ color: GREEN }} />
            </button>
          )}
        </div>

        {/* Stempel-Münzen */}
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {Array.from({ length: maxStamps }).map((_, i) => {
            const filled = i < currentStamps;
            const isAnimating = i === animateIndex;
            const isTier = activeTiers.some(t => t.stamps === i + 1);
            return (
              <motion.div key={i}
                animate={isAnimating ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 0.5 }}
                className="aspect-square">
                {filled ? (
                  <div className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: "radial-gradient(circle at 50% 40%, #5a2e18, #1a1009)",
                      boxShadow: `0 0 0 2px ${TERRAB}, 0 0 18px 2px #f0844f66, inset 0 0 13px #f0844f33`,
                    }}>
                    <BowlIcon color={CREAM} />
                  </div>
                ) : isTier ? (
                  <div className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                      background: `radial-gradient(circle at 50% 40%, #1f3a2a, ${PANEL2})`,
                      boxShadow: `0 0 0 2px ${GREEN}, 0 0 12px 2px #6fb08340`,
                    }}>
                    <Gift size={13} style={{ color: GREEN }} />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-full"
                    style={{ background: `linear-gradient(135deg, ${NOODLE}, ${TERRA} 45%, #7FB890 100%)`, padding: 2 }}>
                    <div className="w-full h-full rounded-full flex items-center justify-center"
                      style={{ background: "#13201a" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>{i + 1}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Fortschritt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span style={{ color: MUTED }}>{currentStamps} / {maxStamps} Stempel</span>
              {milestoneBadge && (
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: `${accent}20`, color: accent }}>{milestoneBadge}</span>
              )}
            </div>
            <span style={{ color: TERRAB }}>{Math.round(Math.min(currentStamps / maxStamps, 1) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: BG }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(currentStamps / maxStamps * 100, 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(to right, ${TERRA}, ${GREEN})` }}
            />
          </div>
          {stampValue ? (
            <p className="text-[10px] mt-1.5" style={{ color: MUTED }}>
              1 Stempel pro €{stampValue} Einkauf
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AsiaTasteRewardBanner({ rewardText, stampsRequired, rewardTiers }: ThemeBannerProps) {
  const activeTiers = rewardTiers?.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps) ?? [];
  if (activeTiers.length > 0) {
    return (
      <div className="rounded-2xl px-4 py-3 space-y-2.5"
        style={{ background: "linear-gradient(150deg, #1c130c, #0f1611)", border: `1px solid ${TERRA}2e` }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: GREEN }}>Belohnungen</p>
        {activeTiers.map((tier, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
              style={{ background: `linear-gradient(135deg, ${NOODLE}, ${TERRAB})`, color: "#1a0800" }}>{i + 1}</div>
            <div>
              <p className="text-[10px]" style={{ color: MUTED }}>nach {tier.stamps} Stempeln</p>
              <p className="text-sm font-semibold" style={{ color: CREAM }}>{tier.text}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-2xl px-4 py-4 flex items-center gap-4"
      style={{ background: "linear-gradient(150deg, #1c130c, #0f1611)", border: `1px solid ${TERRA}2e` }}>
      {/* Drehendes Crescent + Geschenk */}
      <div className="relative w-14 h-14 flex-none flex items-center justify-center">
        <motion.div className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 220deg, #F0A06F, ${TERRA} 40%, transparent 60%)`,
            WebkitMask: "radial-gradient(circle at 50% 50%, transparent 52%, #000 54%)",
            mask: "radial-gradient(circle at 50% 50%, transparent 52%, #000 54%)",
            opacity: 0.8,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
        <Gift size={24} style={{ color: TERRAB, filter: `drop-shadow(0 0 6px ${TERRA}88)` }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: GREEN }}>Deine Belohnung</p>
        <p className="text-sm font-semibold leading-snug" style={{ color: CREAM }}>{rewardText}</p>
        <p className="text-[10px] mt-1" style={{ color: MUTED }}>nach {stampsRequired} Stempeln</p>
      </div>
    </div>
  );
}

export function AsiaTasteMilestonesSection({ milestones, totalStampsEver }: ThemeMilestonesProps) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (active.length === 0) return null;
  return (
    <div className="rounded-2xl px-4 py-4"
      style={{ background: "linear-gradient(150deg, #1c130c, #0f1611)", border: `1px solid ${TERRA}2e` }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: GREEN }}>Meilensteine</p>
      <div className="space-y-3">
        {active.map((m, i) => {
          const reached = totalStampsEver >= m.stamps;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={reached
                  ? { background: `linear-gradient(135deg, ${NOODLE}, ${TERRAB})` }
                  : { background: PANEL, border: `1px solid ${GREEN}40` }}>
                {reached
                  ? <Award size={13} style={{ color: "#1a0800" }} />
                  : <span className="text-[10px] font-bold" style={{ color: MUTED }}>{m.stamps}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: reached ? CREAM : MUTED }}>{m.text}</p>
                {!reached && <p className="text-[10px]" style={{ color: "#4a6355" }}>noch {m.stamps - totalStampsEver} Stempel</p>}
              </div>
              {reached && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${GREEN}18`, color: GREEN, border: `1px solid ${GREEN}30` }}>✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
