"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Gift, Settings, X, Check, ChevronRight,
  Trophy, Pencil, AlertCircle, Info, Stamp,
} from "lucide-react";
import { StampOverlay, getActiveTiers, hexToRgba, getStampIcon } from "./components";
import { errMsg } from "@/app/lib/errMsg";

// ─── Profanity filter ─────────────────────────────────────────────────────────

const BAD_WORDS = [
  // Deutsch
  "scheiße","scheisse","scheiß","arsch","arschloch","fotze","fick","ficken","wichser",
  "hurensohn","hure","nutte","schlampe","bastard","vollidiot","idiot","depp","trottel",
  "wichse","verdammt","pisser","pissnelke","kacke","kacker","spast","spasti","mongo",
  "nazi","hitler","kz","penner","loser","versager","neger","kanake","türke","jude",
  // English
  "fuck","shit","bitch","asshole","cunt","nigger","faggot","retard","whore","slut",
  "bastard","dick","cock","pussy","ass","damn","hell","crap","motherfucker","fucker",
];

function containsProfanity(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
  return BAD_WORDS.some(w => normalized.includes(w.replace(/[^a-zäöüß]/g, "")));
}

// ─── Color presets ────────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  { name: "Gold",    value: "#c9973a" },
  { name: "Blau",    value: "#5b89b4" },
  { name: "Lila",    value: "#8b7bbf" },
  { name: "Grün",    value: "#5f9e7a" },
  { name: "Rose",    value: "#b87070" },
  { name: "Terrak.", value: "#b5694a" },
  { name: "Teal",    value: "#4a9494" },
  { name: "Olive",   value: "#7a8f4a" },
  { name: "Sand",    value: "#b8a98a" },
  { name: "Slate",   value: "#94a3b8" },
];

// ─── Level System ────────────────────────────────────────────────────────────

const LEVELS = [
  { min: 0,   max: 9,        label: "Neuling"     },
  { min: 10,  max: 24,       label: "Stammgast"   },
  { min: 25,  max: 49,       label: "Treue-Kunde" },
  { min: 50,  max: 99,       label: "Loyaler"     },
  { min: 100, max: 199,      label: "VIP"         },
  { min: 200, max: Infinity, label: "Legende"     },
];

// Allgemeines Level im /me-Bereich: zählt ALLE gesammelten Stempel (shop-übergreifend)
const GLOBAL_LEVELS = [
  { min: 0,   max: 19,       label: "Neuling"    },
  { min: 20,  max: 49,       label: "Entdecker"  },
  { min: 50,  max: 99,       label: "Stammgast"  },
  { min: 100, max: 199,      label: "Loyaler"    },
  { min: 200, max: 399,      label: "VIP"        },
  { min: 400, max: Infinity, label: "Legende"    },
];

function LevelCard({ shopCount, totalStamps, accent }: { shopCount: number; totalStamps: number; accent: string }) {
  const count = Math.max(shopCount, 1); // nur für die "X Läden"-Anzeige
  const idx = GLOBAL_LEVELS.findIndex(l => totalStamps <= l.max);
  const safeIdx = idx === -1 ? GLOBAL_LEVELS.length - 1 : idx;
  const level = GLOBAL_LEVELS[safeIdx];
  const nextLevel = GLOBAL_LEVELS[safeIdx + 1] ?? null;
  const progress = nextLevel
    ? (totalStamps - level.min) / (nextLevel.min - level.min)
    : 1;

  const R = 24;
  const CIRC = 2 * Math.PI * R;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-7 flex items-center gap-3.5"
    >
      {/* Kreis-Fortschritt mit Level-Nummer */}
      <div className="relative w-16 h-16 shrink-0">
        <div className="absolute inset-1.5 rounded-full"
          style={{ background: hexToRgba(accent, 0.18), filter: "blur(10px)" }} />
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90 relative">
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4.5" />
          <motion.circle
            cx="32" cy="32" r={R} fill="none" stroke={accent} strokeWidth="4.5" strokeLinecap="round"
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: CIRC * (1 - progress) }}
            transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
            style={{ filter: `drop-shadow(0 0 5px ${hexToRgba(accent, 0.7)})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[22px] font-black tabular-nums" style={{ color: accent }}>{safeIdx + 1}</span>
          <span className="text-[7px] font-bold tracking-[0.15em] text-zinc-500 mt-0.5">LEVEL</span>
        </div>
      </div>

      {/* Level-Name + Fortschrittszeile (randlos) */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xl font-extrabold tracking-tight" style={{ color: accent }}>{level.label}</span>
          <span className="text-[11px] font-semibold text-zinc-400 tabular-nums shrink-0">
            {count} {count === 1 ? "Laden" : "Läden"} · {totalStamps} Stempel
          </span>
        </div>
        <div className="mt-2.5 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${hexToRgba(accent, 0.75)}, ${accent})`, boxShadow: `0 0 10px ${hexToRgba(accent, 0.6)}` }}
          />
        </div>
        {nextLevel && (
          <p className="text-[11px] mt-1.5 font-medium text-zinc-500 tabular-nums">
            Noch <span style={{ color: hexToRgba(accent, 0.9) }}>{nextLevel.min - totalStamps}</span> Stempel bis Level {safeIdx + 2}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Background presets ───────────────────────────────────────────────────────

const BG_PRESETS = [
  { id: "none",   label: "Keine",  style: null },
  { id: "navy",   label: "Blau",   style: "linear-gradient(180deg, #060e1c 0%, #0b1a2e 100%)" },
  { id: "forest", label: "Grün",   style: "linear-gradient(180deg, #05110a 0%, #091b0e 100%)" },
  { id: "plum",   label: "Lila",   style: "linear-gradient(180deg, #0b0714 0%, #140a24 100%)" },
  { id: "ember",  label: "Braun",  style: "linear-gradient(180deg, #120900 0%, #1e1005 100%)" },
  { id: "slate",  label: "Grau",   style: "linear-gradient(180deg, #0c0c0e 0%, #17171a 100%)" },
];

// ─── ShopCard ─────────────────────────────────────────────────────────────────

type MembershipEntry = {
  membership: {
    _id: string;
    currentStamps: number;
    totalStampsEver: number;
    rewardsRedeemed: number;
    lastStampAt?: number | null;
  };
  shop?: {
    _id: string;
    name: string;
    slug?: string;
    stampsRequired: number;
    rewardText: string;
    rewardTiers?: { stamps: number; text: string; enabled: boolean }[];
    accentColor?: string;
    customDesignEnabled?: boolean;
    stampIcon?: string | null;
    theme?: string;
    bonusProgramEnabled?: boolean;
    stampValue?: number | null;
    milestonesEnabled?: boolean;
    milestones?: { stamps: number; text: string; enabled: boolean }[];
  } | null;
};

function ShopCard({ entry, index, personalAccent, onClick }: {
  entry: MembershipEntry;
  index: number;
  personalAccent: string;
  onClick: () => void;
}) {
  const shop = entry.shop;
  const membership = entry.membership;
  if (!shop) return null;

  // Overview always uses personal accent — custom design only shows when you open the shop
  const accent = personalAccent;

  // Bonus program OFF → always only base tier, regardless of rewardTiers in DB
  const activeTiers = shop.bonusProgramEnabled
    ? getActiveTiers(shop)
    : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true as const }];
  const lowestTier = activeTiers[0];
  const highestTier = activeTiers[activeTiers.length - 1];
  const totalSlots = highestTier.stamps;
  const tierCheckpoints = new Set(activeTiers.map(t => t.stamps));

  // Current tier: the one being worked toward
  const completedTiers = activeTiers.filter(t => membership.currentStamps >= t.stamps);
  const currentTierIndex = completedTiers.length; // 0 = working on tier 1, 1 = working on tier 2, …
  const prevTierStamps = completedTiers.length > 0 ? completedTiers[completedTiers.length - 1].stamps : 0;
  const nextTier = activeTiers[currentTierIndex]; // undefined when all tiers done

  const targetStamps = nextTier?.stamps ?? highestTier.stamps;
  const isReady = membership.currentStamps >= lowestTier.stamps;

  // Bar: relative progress within current tier (resets after each tier)
  const tierSize = targetStamps - prevTierStamps;
  const stampsIntoTier = Math.max(0, membership.currentStamps - prevTierStamps);
  const barProgress = nextTier
    ? Math.min(stampsIntoTier / tierSize, 1)
    : 1; // all tiers done → full bar

  // Milestones reached
  const reachedMilestones = (shop.milestonesEnabled && shop.milestones)
    ? shop.milestones.filter(m => m.enabled && membership.totalStampsEver >= m.stamps)
    : [];

  const StampIcon = getStampIcon(shop.stampIcon);
  const stepsLeft = nextTier ? nextTier.stamps - membership.currentStamps : 0;

  const shopLvlIdx = LEVELS.findIndex(l => membership.totalStampsEver <= l.max);
  const safeShopLvlIdx = shopLvlIdx === -1 ? LEVELS.length - 1 : shopLvlIdx;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.09 + 0.12, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative"
    >
      <button
        onClick={onClick}
        className="relative w-full text-left rounded-[20px] overflow-hidden"
        style={{
          background: isReady
            ? `linear-gradient(155deg, #2a2a2f 0%, #1e1e22 50%, ${hexToRgba(accent, 0.16)} 100%)`
            : "linear-gradient(155deg, #2a2a2f 0%, #1e1e22 100%)",
          border: `1px solid ${hexToRgba(accent, isReady ? 0.6 : 0.42)}`,
          boxShadow: `0 14px 32px -8px rgba(0,0,0,0.75), 0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 0 1px rgba(255,255,255,0.05)${isReady ? `, 0 0 30px ${hexToRgba(accent, 0.14)}` : ""}`,
        }}
      >
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${hexToRgba(accent, isReady ? 0.9 : 0.35)}, transparent)` }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0"
              style={{ background: hexToRgba(accent, 0.18), border: `1px solid ${hexToRgba(accent, 0.4)}` }}>
              <StampIcon size={22} style={{ color: accent }} />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-zinc-100 leading-tight truncate">{shop.name}</h2>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: hexToRgba(accent, 0.45) }}>
                {shop.stampValue ? `€${shop.stampValue} = 1 Stempel` : "Stempelkarte"}
              </p>
            </div>
          </div>
          {isReady ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shrink-0"
              style={{ background: hexToRgba(accent, 0.12), border: `1px solid ${hexToRgba(accent, 0.3)}`, color: accent }}>
              <Check size={11} strokeWidth={3} />
              BEREIT
            </span>
          ) : (
            <ChevronRight size={15} style={{ color: hexToRgba(accent, 0.3) }} className="shrink-0 mt-1" />
          )}
        </div>

        {/* Stamp dots */}
        <div className="flex flex-wrap gap-[6px] mb-4">
          {Array.from({ length: Math.min(totalSlots, 32) }).map((_, i) => {
            const filled = i < membership.currentStamps;
            const isCheckpoint = tierCheckpoints.has(i + 1);
            return (
              <div key={i}
                className="rounded-full flex items-center justify-center shrink-0"
                style={{
                  width: 20, height: 20,
                  background: filled
                    ? isCheckpoint ? accent : hexToRgba(accent, 0.65)
                    : hexToRgba(accent, 0.14),
                  border: filled ? "none" : `1.5px solid ${hexToRgba(accent, 0.3)}`,
                  boxShadow: filled && isCheckpoint ? `0 0 7px ${hexToRgba(accent, 0.5)}` : undefined,
                  outline: !filled && isCheckpoint ? `1.5px dashed ${hexToRgba(accent, 0.3)}` : undefined,
                  outlineOffset: !filled && isCheckpoint ? "1px" : undefined,
                }}
              >
                {filled && (
                  <StampIcon size={11} style={{ color: isCheckpoint ? "#0e0d0b" : "rgba(255,255,255,0.75)" }} />
                )}
              </div>
            );
          })}
          {totalSlots > 32 && (
            <span className="text-[9px] self-center" style={{ color: hexToRgba(accent, 0.4) }}>+{totalSlots - 32}</span>
          )}
        </div>

        {/* Footer: progress + reward + counter */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="h-[5px] rounded-full overflow-hidden mb-2"
              style={{ background: hexToRgba(accent, 0.15), border: "1px solid rgba(255,255,255,0.06)" }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${barProgress * 100}%` }}
                transition={{ duration: 0.7, delay: index * 0.07 + 0.2 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${hexToRgba(accent, 0.7)}, ${accent})`, boxShadow: `0 0 6px ${hexToRgba(accent, 0.4)}` }}
              />
            </div>
            <span className="text-[11px] font-semibold truncate flex items-center gap-1" style={{ color: accent }}>
              <Gift size={11} className="shrink-0" />
              <span className="truncate">{nextTier ? nextTier.text : highestTier.text}</span>
            </span>
            <span className="text-[9px] font-medium mt-0.5 block tabular-nums" style={{ color: hexToRgba(accent, 0.35) }}>
              {membership.totalStampsEver} Stempel · LVL {safeShopLvlIdx + 1}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[11px] font-bold tabular-nums" style={{ color: accent }}>
              {nextTier ? `noch ${stepsLeft}` : "✓ fertig"}
            </div>
            {membership.rewardsRedeemed > 0 && (
              <div className="text-[9px] font-medium mt-0.5 tabular-nums" style={{ color: hexToRgba(accent, 0.35) }}>
                {membership.rewardsRedeemed}× eingelöst
              </div>
            )}
          </div>
        </div>

        {/* Milestones */}
        {reachedMilestones.length > 0 && (
          <div className="mt-3 pt-2.5 flex items-center gap-2 flex-wrap"
            style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <Trophy size={10} style={{ color: hexToRgba(accent, 0.38) }} className="shrink-0" />
            {reachedMilestones.map((m, i) => (
              <span key={i} className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                style={{ background: hexToRgba(accent, 0.08), color: hexToRgba(accent, 0.6) }}>
                {m.text}
              </span>
            ))}
          </div>
        )}
      </div>
      </button>
    </motion.div>
  );
}

// ─── CardStack: alle Karten als EIN Stapel (Wallet-Look) ───────────────────────

function CardStack({ memberships, personalAccent, onOpen }: {
  memberships: MembershipEntry[];
  personalAccent: string;
  onOpen: (slug: string) => void;
}) {
  const [top, setTop] = useState(0);
  const [quickOpen, setQuickOpen] = useState(false);
  const n = memberships.length;
  // Reihenfolge ab der aktuellen Topkarte (rotiert beim Blättern)
  const ordered = Array.from({ length: n }, (_, k) => memberships[(top + k) % n]);
  const front = ordered[0];
  const behind = ordered.slice(1, 3); // bis zu 2 Karten im Stapel dahinter zeigen
  const layers = behind.length;

  return (
    <div>
      <div className="relative" style={{ marginTop: layers * 9 }}>
        {/* Karten im Stapel dahinter — schauen oben schmaler hervor */}
        {behind.map((e, j) => {
          const d = j + 1; // 1 = direkt hinter der Topkarte
          return (
            <div key={e.membership._id} aria-hidden
              className="absolute left-0 right-0 top-0 rounded-[20px] pointer-events-none"
              style={{
                height: 140,
                transform: `translateY(${-d * 9}px) scale(${1 - d * 0.045})`,
                transformOrigin: "top center",
                background: "linear-gradient(155deg, #242428, #1b1b1f)",
                border: `1px solid ${hexToRgba(personalAccent, 0.32)}`,
                boxShadow: "0 10px 24px -12px rgba(0,0,0,0.7)",
                opacity: 1 - d * 0.18,
                zIndex: -d,
              }}
            />
          );
        })}
        {/* Vorderste Karte — voll, per Touch/Maus wischbar */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.5}
          onDragEnd={(_e, info) => {
            if (info.offset.x < -55 || info.velocity.x < -350) setTop(t => (t + 1) % n);
            else if (info.offset.x > 55 || info.velocity.x > 350) setTop(t => (t - 1 + n) % n);
          }}
          className="cursor-grab active:cursor-grabbing"
        >
          <ShopCard
            key={front.membership._id}
            entry={front}
            index={0}
            personalAccent={personalAccent}
            onClick={() => onOpen(front.shop?.slug ?? "")}
          />
        </motion.div>
      </div>

      {/* Punkte-Indikator (antippbar) + Wisch-Hinweis */}
      {n > 1 && (
        <>
          <div className="flex items-center justify-center gap-2 mt-4">
            {memberships.map((_, i) => (
              <button key={i} onClick={() => setTop(i)} aria-label={`Karte ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === top ? 18 : 6, height: 6,
                  background: i === top ? personalAccent : hexToRgba(personalAccent, 0.25),
                }} />
            ))}
          </div>
          <p className="text-center text-[10px] text-zinc-600 mt-2">← wischen zum Blättern →</p>

          {/* Schnellzugriff — eingeklappt, öffnet sich auf Tipp */}
          <div className="mt-6">
            <button onClick={() => setQuickOpen(o => !o)}
              className="w-full flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Schnellzugriff</p>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                  style={{ background: hexToRgba(personalAccent, 0.15), color: personalAccent }}>{n}</span>
              </div>
              <motion.div animate={{ rotate: quickOpen ? 90 : 0 }} transition={{ duration: 0.25 }}
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: hexToRgba(personalAccent, 0.1), border: `1px solid ${hexToRgba(personalAccent, 0.2)}` }}>
                <ChevronRight size={13} style={{ color: personalAccent }} />
              </motion.div>
            </button>
            <AnimatePresence initial={false}>
              {quickOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1.5 pt-2.5">
                    {memberships.map((entry, i) => {
                      const shop = entry.shop;
                      if (!shop) return null;
                      const Icon = getStampIcon(shop.stampIcon);
                      const tiers = shop.bonusProgramEnabled
                        ? getActiveTiers(shop)
                        : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true as const }];
                      const lowest = tiers[0];
                      const ready = entry.membership.currentStamps >= lowest.stamps;
                      const nextTier = tiers.find(t => entry.membership.currentStamps < t.stamps);
                      const left = nextTier ? nextTier.stamps - entry.membership.currentStamps : 0;
                      const active = i === top;
                      return (
                        <motion.button key={entry.membership._id} onClick={() => onOpen(shop.slug ?? "")}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05, duration: 0.3 }}
                          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl transition-colors"
                          style={{
                            background: active ? hexToRgba(personalAccent, 0.14) : "#1e1e22",
                            border: `1px solid ${active ? hexToRgba(personalAccent, 0.4) : "rgba(255,255,255,0.1)"}`,
                          }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: hexToRgba(personalAccent, 0.15), border: `1px solid ${hexToRgba(personalAccent, 0.3)}` }}>
                            <Icon size={15} style={{ color: personalAccent }} />
                          </div>
                          <span className="text-[13px] font-medium text-zinc-200 truncate flex-1 text-left">{shop.name}</span>
                          {ready ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                              style={{ color: personalAccent, background: hexToRgba(personalAccent, 0.12) }}>BEREIT</span>
                          ) : (
                            <span className="text-[11px] font-semibold tabular-nums shrink-0"
                              style={{ color: hexToRgba(personalAccent, 0.6) }}>noch {left}</span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Info Panel ───────────────────────────────────────────────────────────────

function InfoPanel({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative bg-zinc-900 rounded-t-3xl px-6 pt-5 pb-10 max-w-sm w-full mx-auto"
        style={{ border: "1px solid #27272a", borderBottom: "none" }}
      >
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-zinc-100">Über die App</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
            <X size={14} className="text-zinc-400" />
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-sm text-zinc-400 leading-relaxed">
            <span className="text-zinc-200 font-semibold">LoyaltyCard</span> ist deine digitale Stempelkarten-Wallet.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Lass dich beim Einkaufen scannen, sammel Stempel bei deinen Lieblingsläden und löse deine Belohnungen direkt vor Ort ein. Ganz ohne App-Download.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Dein QR-Code ist dein Ausweis. Zeig ihn einfach an der Kasse vor.
          </p>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Sobald du Karten von <span className="text-zinc-300 font-medium">2 verschiedenen Läden</span> gesammelt hast, ist die App vollständig freigeschaltet.
          </p>
        </div>

        <div className="border-t border-zinc-800 pt-5 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-widest uppercase text-zinc-600">LoyaltyCard</span>
          <span className="text-[11px] font-semibold text-zinc-700">v1.0</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({
  customerName, qrToken, accent, onAccentChange, bgId, onBgChange, starsOn, onStarsChange, onClose,
}: {
  customerName: string;
  qrToken: string;
  accent: string;
  onAccentChange: (c: string) => void;
  bgId: string;
  onBgChange: (id: string) => void;
  starsOn: boolean;
  onStarsChange: (on: boolean) => void;
  onClose: () => void;
}) {
  const updateName = useMutation(api.customers.updateName);
  const [name, setName] = useState(customerName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const nameDirty = name.trim() !== customerName;

  const handleSaveName = async () => {
    setError("");
    const trimmed = name.trim();
    if (trimmed.length < 2) { setError("Name muss mindestens 2 Zeichen haben."); return; }
    if (trimmed.length > 40) { setError("Name darf max. 40 Zeichen lang sein."); return; }
    if (containsProfanity(trimmed)) { setError("Bitte wähle einen anderen Namen."); return; }
    setSaving(true);
    try {
      await updateName({ qrToken, name: trimmed });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      setError(errMsg(e, "Fehler beim Speichern"));
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative bg-zinc-900 rounded-t-3xl px-5 pt-5 pb-10 max-w-sm w-full mx-auto"
        style={{ border: "1px solid #27272a", borderBottom: "none" }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-zinc-100">Einstellungen</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
            <X size={14} className="text-zinc-400" />
          </button>
        </div>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Dein Name
          </label>
          <div className="relative">
            <Pencil size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              maxLength={40}
              placeholder="Dein Name"
              className="w-full pl-9 pr-4 py-3 rounded-xl bg-zinc-800 text-zinc-100 text-sm placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 mt-2">
              <AlertCircle size={12} className="text-red-400 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
          <AnimatePresence>
            {nameDirty && !saved && (
              <motion.button
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                onClick={handleSaveName} disabled={saving}
                className="mt-2.5 w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-400 text-zinc-900 disabled:opacity-60">
                {saving ? "Speichert…" : "Name speichern"}
              </motion.button>
            )}
            {saved && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-2.5 flex items-center gap-1.5 text-green-400 text-sm">
                <Check size={13} /> Gespeichert
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Accent color */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Deine Farbe
          </label>
          <div className="flex gap-2">
            {COLOR_PRESETS.map(({ name: colorName, value }) => (
              <button key={value} onClick={() => onAccentChange(value)}
                title={colorName}
                className="flex-1 h-8 rounded-lg transition-all flex items-center justify-center"
                style={{
                  background: value,
                  border: accent === value ? `2px solid white` : `2px solid transparent`,
                  boxShadow: accent === value ? `0 0 10px ${hexToRgba(value, 0.5)}` : undefined,
                  opacity: accent === value ? 1 : 0.55,
                }}>
                {accent === value && <Check size={12} className="text-zinc-900" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* Stars toggle */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sterne</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{starsOn ? "Sichtbar" : "Ausgeblendet"}</p>
          </div>
          <button
            onClick={() => onStarsChange(!starsOn)}
            className="relative rounded-full transition-colors flex items-center px-0.5 shrink-0"
            style={{ minWidth: "2.5rem", height: "1.375rem", background: starsOn ? accent : "#3f3f46" }}
          >
            <motion.div
              animate={{ x: starsOn ? 18 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-4 h-4 rounded-full bg-white shadow-sm"
            />
          </button>
        </div>

        {/* Background color */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Hintergrund
          </label>
          <div className="grid grid-cols-6 gap-2">
            {BG_PRESETS.map(({ id, label, style }) => (
              <button key={id} onClick={() => onBgChange(id)}
                className="flex flex-col items-center gap-1.5">
                <div className="w-full aspect-square rounded-xl border-2 flex items-center justify-center transition-all"
                  style={{
                    background: style ?? "#09090b",
                    borderColor: bgId === id ? "white" : "transparent",
                    boxShadow: bgId === id ? "0 0 10px rgba(255,255,255,0.2)" : undefined,
                  }}>
                  {bgId === id && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-[9px] text-zinc-500">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MePage() {
  const router = useRouter();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showStampOverlay, setShowStampOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [personalAccent, setPersonalAccent] = useState("#fbbf24");
  const [bgId, setBgId] = useState("none");
  const [starsOn, setStarsOn] = useState(true);
  const prevStampsRef = useRef<Record<string, number>>({});
  const isFirstLoad = useRef(true);
  const didRedirect = useRef(false);

  useEffect(() => {
    setMounted(true);
    setQrToken(localStorage.getItem("qrToken"));
    const stored = localStorage.getItem("meAccentColor");
    if (stored) setPersonalAccent(stored);
    const storedBg = localStorage.getItem("meBgId");
    // migrate old "default" value to "none"
    setBgId(storedBg === "default" || !storedBg ? "none" : storedBg);
    const storedStars = localStorage.getItem("meStarsOn");
    if (storedStars !== null) setStarsOn(storedStars !== "false");
  }, []);

  const handleAccentChange = useCallback((color: string) => {
    setPersonalAccent(color);
    localStorage.setItem("meAccentColor", color);
  }, []);

  const handleBgChange = useCallback((id: string) => {
    setBgId(id);
    localStorage.setItem("meBgId", id);
    const preset = BG_PRESETS.find(p => p.id === id);
    document.body.style.background = preset?.style ?? "";
  }, []);

  const handleStarsChange = useCallback((on: boolean) => {
    setStarsOn(on);
    localStorage.setItem("meStarsOn", on ? "true" : "false");
  }, []);

  useEffect(() => {
    const preset = BG_PRESETS.find(p => p.id === bgId);
    document.body.style.background = preset?.style ?? "";
    return () => { document.body.style.background = ""; };
  }, [bgId]);

  useEffect(() => {
    const sf = document.getElementById("star-field");
    if (!sf) return;
    sf.style.display = starsOn ? "" : "none";
    return () => { sf.style.display = ""; };
  }, [starsOn]);

  const data = useQuery(
    api.customers.getMembershipsForCustomer,
    qrToken ? { qrToken } : "skip"
  );

  const allMemberships = (data?.memberships ?? [])
    .slice()
    .sort((a, b) => (b.membership.lastStampAt ?? 0) - (a.membership.lastStampAt ?? 0));

  // 1 Shop → direkt weiterleiten
  useEffect(() => {
    if (didRedirect.current) return;
    if (allMemberships.length === 1 && allMemberships[0].shop?.slug) {
      didRedirect.current = true;
      router.replace(`/me/shop/${allMemberships[0].shop.slug}`);
    }
  }, [allMemberships.length, allMemberships[0]?.shop?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Stempel-Animation erkennen
  const stampsKey = allMemberships.map(e => `${e.membership._id}:${e.membership.currentStamps}`).join(",");
  useEffect(() => {
    if (!allMemberships.length) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      allMemberships.forEach(e => { prevStampsRef.current[e.membership._id] = e.membership.currentStamps; });
      return;
    }
    let anyNew = false;
    allMemberships.forEach(e => {
      const prev = prevStampsRef.current[e.membership._id] ?? e.membership.currentStamps;
      if (e.membership.currentStamps > prev) anyNew = true;
      prevStampsRef.current[e.membership._id] = e.membership.currentStamps;
    });
    if (anyNew) setShowStampOverlay(true);
  }, [stampsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  if (!qrToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-6">
            <LayoutGrid size={36} className="text-amber-400" />
          </div>
        </motion.div>
        <h1 className="text-2xl font-bold">Keine Stempelkarte</h1>
        <p className="text-zinc-500 mt-2 text-sm max-w-xs">
          Scanne den QR-Code in einem Laden um dich zu registrieren.
        </p>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  if (!data) return null;

  if (allMemberships.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  const { customer } = data;
  const totalStamps = allMemberships.reduce((s, e) => s + e.membership.totalStampsEver, 0);

  if (allMemberships.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
          <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
            <Gift size={36} className="text-amber-400" />
          </div>
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold">Hallo, {customer.name}</h1>
          <p className="text-zinc-500 mt-2 text-sm max-w-xs">
            Noch keine Stempel. Lass dich im Laden scannen!
          </p>
        </div>
      </div>
    );
  }

  // 2+ Shops → Übersicht
  return (
    <div className="min-h-screen px-5 pt-6 pb-10 max-w-sm mx-auto">
      <AnimatePresence>
        {showStampOverlay && <StampOverlay onDone={() => setShowStampOverlay(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            customerName={customer.name}
            qrToken={qrToken}
            accent={personalAccent}
            onAccentChange={handleAccentChange}
            bgId={bgId}
            onBgChange={handleBgChange}
            starsOn={starsOn}
            onStarsChange={handleStarsChange}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfo && <InfoPanel onClose={() => setShowInfo(false)} />}
      </AnimatePresence>

      {/* Topbar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="relative flex items-center justify-center mb-7">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowInfo(true)}
          className="absolute left-0 w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            border: `1px solid ${hexToRgba(personalAccent, 0.25)}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 14px rgba(0,0,0,0.45), 0 0 18px ${hexToRgba(personalAccent, 0.1)}`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <Info size={16} className="text-zinc-200" />
        </motion.button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: personalAccent, boxShadow: `0 2px 10px ${hexToRgba(personalAccent, 0.4)}` }}>
            <Stamp size={16} strokeWidth={2.5} style={{ color: "#1a1613" }} />
          </div>
          <p className="text-xl font-black tracking-tight lowercase text-zinc-100">
            loyalty<span className="text-zinc-500">card</span><span style={{ color: personalAccent }}>.</span>
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.06, rotate: 45 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettings(true)}
          className="absolute right-0 w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            border: `1px solid ${hexToRgba(personalAccent, 0.25)}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 14px rgba(0,0,0,0.45), 0 0 18px ${hexToRgba(personalAccent, 0.1)}`,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <Settings size={16} className="text-zinc-200" />
        </motion.button>
      </motion.div>

      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-zinc-500">Willkommen zurück</p>
        <h1 className="text-[2rem] leading-tight font-extrabold tracking-tight mt-0.5 text-zinc-100">
          Hallo, <span style={{ color: personalAccent }}>{customer.name}</span>
        </h1>
      </motion.div>

      {/* Level */}
      <LevelCard shopCount={allMemberships.length} totalStamps={totalStamps} accent={personalAccent} />

      {/* Shop list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
            Deine Karten
          </p>
          <p className="text-[10px] text-zinc-600">{allMemberships.length} aktiv</p>
        </div>
        <CardStack
          memberships={allMemberships}
          personalAccent={personalAccent}
          onOpen={(slug) => router.push(`/me/shop/${slug}`)}
        />
      </div>
    </div>
  );
}
