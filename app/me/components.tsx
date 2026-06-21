"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import {
  Gift, Stamp, Scissors, Coffee, Pizza, Dumbbell, Flower2,
  ShoppingBag, Car, Utensils, BookOpen, Flame, Star, Bike, Shirt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardTier = { stamps: number; text: string; enabled: boolean };

// ─── Icon-System ──────────────────────────────────────────────────────────────

export const STAMP_ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  coffee: Coffee,
  pizza: Pizza,
  dumbbell: Dumbbell,
  flower: Flower2,
  shopping: ShoppingBag,
  car: Car,
  utensils: Utensils,
  book: BookOpen,
  flame: Flame,
  star: Star,
  bike: Bike,
  shirt: Shirt,
  stamp: Stamp,
};

export function getStampIcon(key?: string | null): LucideIcon {
  if (key && STAMP_ICONS[key]) return STAMP_ICONS[key];
  return Stamp;
}

// ─── Branchen für Shop-Erstellung ─────────────────────────────────────────────

export const BRANCHEN = [
  { label: "Friseur / Barbershop", icon: "scissors" },
  { label: "Café / Kaffee", icon: "coffee" },
  { label: "Restaurant", icon: "utensils" },
  { label: "Imbiss / Pizza", icon: "pizza" },
  { label: "Bäckerei / Konditorei", icon: "flame" },
  { label: "Gym / Fitness", icon: "dumbbell" },
  { label: "Wellness / Kosmetik", icon: "flower" },
  { label: "Einzelhandel", icon: "shopping" },
  { label: "Auto / Werkstatt", icon: "car" },
  { label: "Fahrrad", icon: "bike" },
  { label: "Mode / Kleidung", icon: "shirt" },
  { label: "Buchhandlung", icon: "book" },
  { label: "Sonstiges", icon: "stamp" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function getActiveTiers(shop: {
  stampsRequired: number;
  rewardText: string;
  rewardTiers?: CardTier[];
}): CardTier[] {
  if (shop.rewardTiers && shop.rewardTiers.some(t => t.enabled)) {
    return shop.rewardTiers.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps);
  }
  return [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }];
}

// ─── Particles ────────────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 90 + (i % 4) * 18;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
});

// ─── StampOverlay ─────────────────────────────────────────────────────────────

export function StampOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      onClick={onDone}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm cursor-pointer"
    >
      {[0, 1, 2, 3].map(i => (
        <motion.div key={i}
          initial={{ scale: 0.2, opacity: 0.85 }}
          animate={{ scale: 5.5, opacity: 0 }}
          transition={{ delay: 0.1 + i * 0.11, duration: 1.0, ease: "easeOut" }}
          className="absolute w-28 h-28 rounded-full border-2 border-amber-400/55"
        />
      ))}
      {PARTICLES.map((p, i) => (
        <motion.div key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
          transition={{ delay: 0.08, duration: 0.7, ease: "easeOut" }}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#f59e0b" : "#fde68a" }}
        />
      ))}
      <div className="relative flex flex-col items-center select-none">
        <motion.div
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: [0.1, 1.2, 0.88, 1.08, 1], opacity: [0, 1, 1, 1, 1] }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="w-36 h-36 bg-amber-400 rounded-full flex items-center justify-center shadow-2xl shadow-amber-400/50"
        >
          <Stamp size={68} className="text-zinc-900" strokeWidth={1.5} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, scale: 0.4, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 280 }}
          className="text-4xl font-black text-amber-400 mt-6 tracking-tight"
        >
          Stempel!
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="text-zinc-500 text-sm mt-2"
        >
          Tippe um fortzufahren
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── QRCard ───────────────────────────────────────────────────────────────────

export function QRCard({ qrToken, customerName }: { qrToken: string; customerName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 210, margin: 1,
        color: { dark: "#09090b", light: "#fafafa" },
      });
    }
  }, [qrToken]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      className="relative mx-auto w-full max-w-xs"
    >
      <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-3xl scale-95" />
      <div className="relative bg-zinc-50 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Stempelkarte</p>
            <p className="text-zinc-900 font-bold text-lg leading-tight mt-0.5">{customerName}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
            <Gift size={18} className="text-zinc-900" />
          </div>
        </div>
        <div className="flex justify-center">
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>
        <p className="text-center text-[11px] text-zinc-400 mt-4 font-medium">
          Im Laden vorzeigen zum Stempel sammeln
        </p>
      </div>
    </motion.div>
  );
}

// ─── QRMini ───────────────────────────────────────────────────────────────────

export function QRMini({ qrToken }: { qrToken: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 72, margin: 1,
        color: { dark: "#09090b", light: "#fafafa" },
      });
    }
  }, [qrToken]);
  return (
    <div className="bg-zinc-50 rounded-xl p-1.5 inline-block shadow-md">
      <canvas ref={canvasRef} className="rounded-lg block" />
    </div>
  );
}

// ─── LoyaltyCard ─────────────────────────────────────────────────────────────

export function LoyaltyCard({
  shopName, rewardText, stampsRequired, currentStamps, rewardsRedeemed,
  totalStampsEver, animateIndex, onShowQR, qrToken, rewardTiers,
  accentColor, milestones, stampIcon,
}: {
  shopName: string;
  rewardText: string;
  stampsRequired: number;
  currentStamps: number;
  rewardsRedeemed: number;
  totalStampsEver: number;
  animateIndex: number | null;
  onShowQR: () => void;
  qrToken: string;
  rewardTiers?: CardTier[];
  accentColor?: string;
  milestones?: CardTier[];
  stampIcon?: string | null;
}) {
  const accent = accentColor ?? "#fbbf24";
  const StampIconComponent = getStampIcon(stampIcon);
  const activeMilestones = (milestones ?? []).filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  const activeTiers: CardTier[] = rewardTiers && rewardTiers.some(t => t.enabled)
    ? rewardTiers.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps)
    : [{ stamps: stampsRequired, text: rewardText, enabled: true }];
  const maxStamps = activeTiers[activeTiers.length - 1].stamps;
  const tierThresholds = new Set(activeTiers.map(t => t.stamps));
  const cols = maxStamps <= 6 ? 3 : maxStamps <= 8 ? 4 : maxStamps <= 10 ? 5 : 4;
  const iconSize = cols <= 3 ? 20 : cols <= 4 ? 17 : 13;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card-3d rounded-3xl overflow-hidden"
      style={{
        background: "rgba(8, 8, 12, 0.82)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1.5px solid ${hexToRgba(accent, 0.2)}`,
        boxShadow: `0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 ${hexToRgba(accent, 0.06)}`,
      }}
    >
      {/* Karten-Kopf */}
      <div className="px-5 pt-5 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[8px] font-semibold uppercase tracking-[0.28em] text-zinc-600 mb-1">
            Digitale Stempelkarte
          </p>
          <p className="text-zinc-100 font-bold text-xl leading-tight">{shopName}</p>
          <p className="text-[11px] text-zinc-600 mt-1">
            {currentStamps} von {maxStamps} Stempel
          </p>
        </div>
        <button onClick={onShowQR} className="shrink-0 flex flex-col items-center gap-1 group mt-0.5">
          <QRMini qrToken={qrToken} />
          <span className="text-[9px] text-zinc-700 group-hover:text-zinc-500 transition-colors">
            QR zeigen
          </span>
        </button>
      </div>

      <div className="mx-5 border-t border-white/5 mb-4" />

      {/* Stempel-Raster */}
      <div className="px-5 pb-4">
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: maxStamps }).map((_, i) => {
            const filled = i < currentStamps;
            const isNew = animateIndex === i;
            const isTierEnd = tierThresholds.has(i + 1);
            return (
              <motion.div
                key={i}
                className="aspect-square rounded-full flex items-center justify-center"
                style={{
                  background: filled
                    ? `linear-gradient(135deg, ${hexToRgba(accent, 0.28)} 0%, ${hexToRgba(accent, 0.10)} 100%)`
                    : "rgba(20, 20, 30, 0.8)",
                  border: filled
                    ? isTierEnd
                      ? `1.5px solid ${hexToRgba(accent, 0.65)}`
                      : `1px solid ${hexToRgba(accent, 0.38)}`
                    : isTierEnd
                      ? `1.5px solid ${hexToRgba(accent, 0.3)}`
                      : `1px solid rgba(255,255,255,0.06)`,
                  boxShadow: filled ? `0 2px 10px ${hexToRgba(accent, 0.18)}` : "none",
                }}
                animate={isNew ? { scale: [1, 1.35, 0.94, 1.06, 1] } : {}}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {filled ? (
                  <motion.div
                    initial={isNew ? { scale: 0, rotate: -20 } : { scale: 1 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 320, delay: isNew ? 0.06 : 0 }}
                  >
                    <StampIconComponent
                      size={iconSize}
                      strokeWidth={1.6}
                      style={{ color: hexToRgba(accent, 0.9) }}
                    />
                  </motion.div>
                ) : (
                  <span
                    className="select-none leading-none font-medium"
                    style={{
                      fontSize: "9px",
                      color: isTierEnd ? hexToRgba(accent, 0.3) : "rgba(255,255,255,0.1)",
                    }}
                  >
                    {i + 1}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Coupon-Trennlinie */}
      <div className="relative mx-4 mb-3">
        <div className="border-t border-dashed border-white/6" />
        <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-950" />
        <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-zinc-950" />
      </div>

      {/* Belohnungs-Abschnitt */}
      <div className="px-4 pb-5 space-y-2">
        {activeTiers.map((tier, i) => {
          const reached = currentStamps >= tier.stamps;
          return (
            <div
              key={i}
              className="rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-500"
              style={{
                background: reached ? hexToRgba(accent, 0.08) : "rgba(255,255,255,0.03)",
                border: reached
                  ? `1.5px solid ${hexToRgba(accent, 0.45)}`
                  : `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                style={reached
                  ? { backgroundColor: hexToRgba(accent, 0.9) }
                  : { backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                <Gift size={17} className={reached ? "text-zinc-900" : "text-zinc-600"} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[9px] font-semibold uppercase tracking-widest mb-0.5 transition-colors"
                  style={{ color: reached ? hexToRgba(accent, 0.9) : "rgba(255,255,255,0.2)" }}
                >
                  {reached ? "Bereit zum Einlösen" : `Ab ${tier.stamps} Stempeln`}
                </p>
                <p className={`text-sm font-semibold leading-snug transition-colors ${reached ? "text-zinc-100" : "text-zinc-600"}`}>
                  {tier.text}
                </p>
              </div>
              {i === activeTiers.length - 1 && rewardsRedeemed > 0 && (
                <div className="shrink-0 rounded-xl px-2.5 py-1.5 text-center" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-xs text-zinc-400 font-bold">{rewardsRedeemed}×</p>
                  <p className="text-[8px] text-zinc-600 mt-0.5">genutzt</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Treue-Meilensteine */}
      {activeMilestones.length > 0 && (
        <div className="px-4 pb-4">
          <div className="border-t border-white/5 pt-3">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-600 mb-2.5 flex items-center gap-1.5">
              <span>⭐</span> Treue-Meilensteine
            </p>
            <div className="space-y-2">
              {activeMilestones.map((m, i) => {
                const reached = totalStampsEver >= m.stamps;
                const isNext = !reached && activeMilestones.slice(0, i).every(prev => totalStampsEver >= prev.stamps);
                const progress = Math.min(totalStampsEver / m.stamps, 1);
                return (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                      reached ? "bg-amber-400/20 text-amber-400" : "bg-white/5 text-zinc-600"
                    }`}>
                      {reached ? "✓" : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] font-medium truncate ${reached ? "text-zinc-300" : isNext ? "text-zinc-400" : "text-zinc-600"}`}>
                          {m.text}
                        </p>
                        <p className="text-[9px] text-zinc-600 shrink-0">
                          {reached ? `${m.stamps} ✓` : `${totalStampsEver}/${m.stamps}`}
                        </p>
                      </div>
                      {isNext && (
                        <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: hexToRgba(accent, 0.6) }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
