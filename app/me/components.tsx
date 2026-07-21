"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { motion } from "framer-motion";
import {
  Gift, Stamp, Scissors, Coffee, Pizza, Dumbbell, Flower2,
  ShoppingBag, Car, Utensils, BookOpen, Flame, Star, Bike, Shirt,
  // Essen & Trinken
  Beer, Wine, Martini, CupSoda, IceCream, Cake, Croissant, Cookie,
  Candy, Apple, Cherry, Fish, Beef, Drumstick, Salad, Soup, Sandwich,
  Popcorn, Milk, Egg,
  // Beauty & Wellness
  Sparkles, Heart, Sun, Moon, Leaf, Droplets, Bath, Brush, Palette,
  // Tiere
  PawPrint, Dog, Cat,
  // Freizeit & Kultur
  Gamepad2, Music, Guitar, Mic, Camera, Ticket, Trophy, Target, Rocket,
  // Lifestyle & Handel
  Crown, Gem, Watch, Glasses, Footprints, Baby, Smile,
  // Handwerk & Service
  Wrench, Hammer, Key, Home, Plane, Anchor, Smartphone, Laptop,
  // Sonstiges
  Snowflake, Zap, Umbrella, TreePine, Mountain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardTier = { stamps: number; text: string; enabled: boolean };

// ─── Icon-System ──────────────────────────────────────────────────────────────

export const STAMP_ICONS: Record<string, LucideIcon> = {
  // Klassiker (bestehende Keys nicht ändern — liegen in der DB)
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
  // Essen & Trinken
  beer: Beer,
  wine: Wine,
  cocktail: Martini,
  soda: CupSoda,
  icecream: IceCream,
  cake: Cake,
  croissant: Croissant,
  cookie: Cookie,
  candy: Candy,
  apple: Apple,
  cherry: Cherry,
  fish: Fish,
  beef: Beef,
  chicken: Drumstick,
  salad: Salad,
  soup: Soup,
  sandwich: Sandwich,
  popcorn: Popcorn,
  milk: Milk,
  egg: Egg,
  // Beauty & Wellness
  sparkles: Sparkles,
  heart: Heart,
  sun: Sun,
  moon: Moon,
  leaf: Leaf,
  droplets: Droplets,
  bath: Bath,
  brush: Brush,
  palette: Palette,
  // Tiere
  paw: PawPrint,
  dog: Dog,
  cat: Cat,
  // Freizeit & Kultur
  gamepad: Gamepad2,
  music: Music,
  guitar: Guitar,
  mic: Mic,
  camera: Camera,
  ticket: Ticket,
  trophy: Trophy,
  target: Target,
  rocket: Rocket,
  // Lifestyle & Handel
  gift: Gift,
  crown: Crown,
  gem: Gem,
  watch: Watch,
  glasses: Glasses,
  footprints: Footprints,
  baby: Baby,
  smile: Smile,
  // Handwerk & Service
  wrench: Wrench,
  hammer: Hammer,
  key: Key,
  home: Home,
  plane: Plane,
  anchor: Anchor,
  smartphone: Smartphone,
  laptop: Laptop,
  // Sonstiges
  snowflake: Snowflake,
  zap: Zap,
  umbrella: Umbrella,
  tree: TreePine,
  mountain: Mountain,
};

export function getStampIcon(key?: string | null): LucideIcon {
  if (key && STAMP_ICONS[key]) return STAMP_ICONS[key];
  return Stamp;
}

// ─── Branchen ─────────────────────────────────────────────────────────────────

export const BRANCHEN = [
  { label: "Friseur / Barbershop", icon: "scissors" },
  { label: "Café / Kaffee",        icon: "coffee"   },
  { label: "Restaurant",           icon: "utensils" },
  { label: "Imbiss / Pizza",       icon: "pizza"    },
  { label: "Bäckerei / Konditorei",icon: "flame"    },
  { label: "Gym / Fitness",        icon: "dumbbell" },
  { label: "Wellness / Kosmetik",  icon: "flower"   },
  { label: "Einzelhandel",         icon: "shopping" },
  { label: "Auto / Werkstatt",     icon: "car"      },
  { label: "Fahrrad",              icon: "bike"     },
  { label: "Mode / Kleidung",      icon: "shirt"    },
  { label: "Buchhandlung",         icon: "book"     },
  { label: "Sonstiges",            icon: "stamp"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hexLuminance(hex: string): number | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Heller Akzent (z.B. Gelb) auf hellem Design ist unlesbar. Helles Design
// erkennt man an dunkler Textfarbe, dann für Balken/Schrift die Textfarbe
// nehmen statt des Akzents.
export function readableAccent(accent: string, textColor: string): string {
  const a = hexLuminance(accent);
  const t = hexLuminance(textColor);
  if (a !== null && t !== null && a > 0.6 && t < 0.5) return textColor;
  return accent;
}

export function getActiveTiers(shop: {
  stampsRequired: number;
  rewardText: string;
  rewardTiers?: CardTier[];
}): CardTier[] {
  const baseTier: CardTier = { stamps: shop.stampsRequired, text: shop.rewardText, enabled: true };
  if (shop.rewardTiers && shop.rewardTiers.some(t => t.enabled)) {
    return [baseTier, ...shop.rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps);
  }
  return [baseTier];
}

// ─── Particles ────────────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist  = 90 + (i % 4) * 18;
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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      onClick={onDone}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm cursor-pointer"
    >
      {[0, 1, 2, 3].map(i => (
        <motion.div key={i}
          initial={{ scale: 0.2, opacity: 0.85 }} animate={{ scale: 5.5, opacity: 0 }}
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
          initial={{ opacity: 0, scale: 0.4, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 280 }}
          className="text-4xl font-black text-amber-400 mt-6 tracking-tight"
        >
          Stempel!
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
          className="text-zinc-500 text-sm mt-2"
        >
          Tippe um fortzufahren
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── QRCard ───────────────────────────────────────────────────────────────────

export function QRCard({ qrToken, customerName, shopName, cardBg, cardBorder, textPrimary, textMuted, accentColor }: {
  qrToken: string;
  customerName: string;
  shopName?: string;
  cardBg?: string;
  cardBorder?: string;
  textPrimary?: string;
  textMuted?: string;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bg     = cardBg     ?? "#18181b";
  const border = cardBorder ?? "1px solid #27272a";
  const tPrim  = textPrimary ?? "#f4f4f5";
  const tMuted = textMuted   ?? "#71717a";
  const accent = accentColor ?? "#fbbf24";

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 248, margin: 2, color: { dark: "#0a0a0a", light: "#ffffff" },
      });
    }
  }, [qrToken]);

  return (
    <div className="relative mx-auto w-full max-w-xs">
      <div className="rounded-3xl overflow-hidden"
        style={{ background: bg, border, boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div className="relative px-6 pt-7 pb-6 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${hexToRgba(accent, 0.28)} 0%, ${hexToRgba(accent, 0.06)} 100%)` }}>
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full" style={{ background: hexToRgba(accent, 0.08) }} />
          <div className="absolute top-3 -right-5 w-20 h-20 rounded-full" style={{ background: hexToRgba(accent, 0.05) }} />
          <p className="relative z-10 text-[9px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: hexToRgba(accent, 0.75) }}>
            Stempelkarte
          </p>
          {shopName && (
            <h2 className="relative z-10 text-[22px] font-bold leading-tight" style={{ color: tPrim }}>{shopName}</h2>
          )}
          <div className="relative z-10 flex items-center gap-1.5 mt-3">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
            <p className="text-[10px] font-semibold" style={{ color: hexToRgba(accent, 0.8) }}>Bereit zum Scannen</p>
          </div>
        </div>

        {/* Perforated Divider */}
        <div className="mx-5 border-t border-dashed" style={{ borderColor: hexToRgba(accent, 0.22) }} />

        {/* QR + Identity */}
        <div className="px-6 pt-6 pb-7 flex flex-col items-center gap-5">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "#fff", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 3px rgba(0,0,0,0.08)" }}>
            <div className="p-3">
              <canvas ref={canvasRef} className="block" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] mb-0.5" style={{ color: tMuted }}>Inhaber</p>
            <p className="text-xl font-bold" style={{ color: tPrim }}>{customerName}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 border-t text-center" style={{ borderColor: hexToRgba(accent, 0.12) }}>
          <p className="text-[10px] font-medium pt-4" style={{ color: tMuted }}>Im Laden vorzeigen · Stempel sammeln</p>
        </div>

      </div>
    </div>
  );
}

// ─── QRMini ───────────────────────────────────────────────────────────────────

export function QRMini({ qrToken }: { qrToken: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 72, margin: 1, color: { dark: "#09090b", light: "#fafafa" },
      });
    }
  }, [qrToken]);
  return (
    <div className="bg-zinc-50 rounded-xl p-1.5 inline-block shadow-md">
      <canvas ref={canvasRef} className="rounded-lg block" />
    </div>
  );
}

// ─── RedeemVoucher ────────────────────────────────────────────────────────────

export function RedeemVoucher({
  qrToken, shopName, rewardText, accentColor,
}: {
  qrToken: string;
  shopName: string;
  rewardText: string;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accent = accentColor ?? "#fbbf24";

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 200, margin: 2, color: { dark: "#0a0a0a", light: "#ffffff" },
      });
    }
  }, [qrToken]);

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      overflow: "hidden",
      boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)",
      width: "100%",
      maxWidth: "280px",
      margin: "0 auto",
    }}>
      {/* Colored header */}
      <div style={{ background: accent, padding: "18px 20px 16px" }}>
        <p style={{
          color: "rgba(0,0,0,0.55)", fontSize: "9px", fontWeight: "800",
          letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "6px",
        }}>
          Gutschein · {shopName}
        </p>
        <p style={{ color: "#000", fontSize: "20px", fontWeight: "900", lineHeight: "1.15" }}>
          {rewardText}
        </p>
        <p style={{ color: "rgba(0,0,0,0.45)", fontSize: "10px", marginTop: "6px" }}>
          Einmalig einlösbar
        </p>
      </div>

      {/* Perforated divider */}
      <div style={{ position: "relative", height: "0", display: "flex", alignItems: "center" }}>
        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#0a0a0a", marginLeft: "-9px", flexShrink: 0 }} />
        <div style={{ flex: 1, borderTop: "2px dashed #d4d4d8", margin: "0 6px" }} />
        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#0a0a0a", marginRight: "-9px", flexShrink: 0 }} />
      </div>

      {/* QR section */}
      <div style={{ background: "#f5f5f5", padding: "20px 20px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
          <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>
        <p style={{ fontSize: "10px", color: "#a1a1aa", textAlign: "center", letterSpacing: "0.05em" }}>
          Mitarbeiter zum Scannen zeigen
        </p>
      </div>
    </div>
  );
}

// ─── MilestonesSection (außerhalb der Karte) ──────────────────────────────────

export function MilestonesSection({
  milestones, totalStampsEver, accent, textColor, textBody, cardBg,
}: {
  milestones: CardTier[];
  totalStampsEver: number;
  accent?: string;
  textColor?: string;
  // Lesbare Sekundär-Textfarbe des Designs; Akzent-Alpha ist auf hellen
  // Hintergründen sonst unsichtbar
  textBody?: string;
  cardBg?: string;
}) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (!active.length) return null;
  const a = accent ?? "#fbbf24";
  const tc = textColor ?? "#f4f4f5";
  const tb = textBody ?? hexToRgba(tc, 0.6);
  // Für Balken und farbige Schrift: bei hellem Design dunkle Variante
  const aStrong = readableAccent(a, tc);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <div className="flex items-center gap-2 mb-3">
        <Star size={13} style={{ color: aStrong }} />
        <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: tb }}>
          Treue-Meilensteine
        </h3>
      </div>
      <div className="space-y-2">
        {active.map((m, i) => {
          const reached = totalStampsEver >= m.stamps;
          const isNext  = !reached && active.slice(0, i).every(prev => totalStampsEver >= prev.stamps);
          const progress = Math.min(totalStampsEver / m.stamps, 1);
          return (
            <div key={i}
              className="rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm"
              style={{
                background: cardBg ?? (reached ? hexToRgba(a, 0.13) : hexToRgba(a, 0.05)),
                border: `1px solid ${hexToRgba(a, reached ? 0.35 : 0.15)}`,
              }}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                style={reached
                  ? { background: hexToRgba(a, 0.22), color: aStrong }
                  : { background: hexToRgba(a, 0.07), color: tb }
                }
              >
                {reached ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium truncate"
                    style={{ color: reached ? tc : hexToRgba(tc, isNext ? 0.65 : 0.38) }}>
                    {m.text}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={reached
                      ? { background: hexToRgba(a, 0.15), color: aStrong }
                      : { background: hexToRgba(a, 0.07), color: tb }
                    }
                  >
                    {totalStampsEver}/{m.stamps}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: hexToRgba(aStrong, 0.12) }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      background: reached ? aStrong : hexToRgba(aStrong, 0.55),
                      boxShadow: reached ? `0 0 6px ${hexToRgba(aStrong, 0.45)}` : undefined,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── LoyaltyCard ─────────────────────────────────────────────────────────────

export function LoyaltyCard({
  shopName, rewardText, stampsRequired, currentStamps, rewardsRedeemed,
  animateIndex, onShowQR, qrToken, rewardTiers, accentColor, stampIcon, hideQR, stampValue, cardNumber, milestoneBadge,
}: {
  shopName: string;
  rewardText: string;
  stampsRequired: number;
  currentStamps: number;
  rewardsRedeemed: number;
  animateIndex: number | null;
  onShowQR?: () => void;
  qrToken: string;
  rewardTiers?: CardTier[];
  accentColor?: string;
  stampIcon?: string | null;
  hideQR?: boolean;
  stampValue?: number | null;
  cardNumber?: number;
  milestoneBadge?: string | null;
}) {
  const accent = accentColor ?? "#fbbf24";
  const StampIconComponent = getStampIcon(stampIcon);
  const baseTier: CardTier = { stamps: stampsRequired, text: rewardText, enabled: true };
  const activeTiers: CardTier[] = rewardTiers && rewardTiers.some(t => t.enabled)
    ? [baseTier, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [baseTier];
  const maxStamps = activeTiers[activeTiers.length - 1].stamps;
  const tierThresholds = new Set(activeTiers.map(t => t.stamps));
  const cols = maxStamps <= 6 ? 3 : maxStamps <= 8 ? 4 : maxStamps <= 10 ? 5 : 4;
  const iconSize = cols <= 3 ? 20 : cols <= 4 ? 17 : 13;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className="card-3d rounded-3xl overflow-hidden"
      style={{
        backgroundColor: "#111111",
        border: "1px solid #262626",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}
    >
      {/* Karten-Kopf */}
      <div className="px-6 pt-6 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: accent }}>
              Digitale Stempelkarte
            </p>
            {cardNumber !== undefined && (
              <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                style={{ background: hexToRgba(accent, 0.1), color: hexToRgba(accent, 0.5) }}>
                #{String(cardNumber).padStart(3, "0")}
              </span>
            )}
            {milestoneBadge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: hexToRgba(accent, 0.15), color: accent }}>
                {milestoneBadge}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-neutral-100 leading-tight">{shopName}</h2>
          <p className="text-neutral-500 text-sm mt-1">{currentStamps} von {maxStamps} Stempel</p>
        </div>
        {!hideQR && (
          <button onClick={onShowQR} className="shrink-0 flex flex-col items-center gap-1.5 group mt-0.5">
            <QRMini qrToken={qrToken} />
            <span className="text-[9px] group-hover:text-neutral-400 transition-colors" style={{ color: accent }}>
              QR zeigen
            </span>
          </button>
        )}
      </div>

      {/* Stempel-Raster */}
      <div className="px-6 pt-5 pb-6">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: maxStamps }).map((_, i) => {
            const filled    = i < currentStamps;
            const isNew     = animateIndex === i;
            const isTierEnd = tierThresholds.has(i + 1);
            return (
              <motion.div
                key={i}
                className="aspect-square rounded-full flex items-center justify-center relative"
                style={{
                  backgroundColor: filled
                    ? isTierEnd ? hexToRgba(accent, 0.22) : hexToRgba(accent, 0.12)
                    : isTierEnd ? hexToRgba(accent, 0.06) : "#161616",
                  border: filled
                    ? isTierEnd ? `2px solid ${hexToRgba(accent, 0.8)}` : `1px solid ${hexToRgba(accent, 0.4)}`
                    : isTierEnd ? `2px dashed ${hexToRgba(accent, 0.45)}` : `1px solid ${hexToRgba(accent, 0.25)}`,
                  boxShadow: filled && isTierEnd
                    ? `0 0 10px ${hexToRgba(accent, 0.3)}`
                    : filled
                      ? `0 2px 8px ${hexToRgba(accent, 0.15)}`
                      : "inset 0 4px 8px rgba(0,0,0,0.6)",
                }}
                animate={isNew ? { scale: [1, 1.35, 0.94, 1.06, 1] } : {}}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {filled ? (
                  <motion.div
                    initial={isNew ? { scale: 0, rotate: -20 } : { scale: 1 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 320, delay: isNew ? 0.06 : 0 }}
                    className="flex flex-col items-center justify-center gap-0"
                  >
                    <StampIconComponent size={isTierEnd ? iconSize - 1 : iconSize} strokeWidth={1.6} style={{ color: accent }} />
                    {isTierEnd && (
                      <Gift size={7} style={{ color: accent, marginTop: 1, opacity: 0.9 }} />
                    )}
                  </motion.div>
                ) : isTierEnd ? (
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <Gift size={iconSize - 2} strokeWidth={1.5} style={{ color: hexToRgba(accent, 0.55) }} />
                    <span className="select-none leading-none text-[8px] font-bold" style={{ color: hexToRgba(accent, 0.4) }}>
                      {i + 1}
                    </span>
                  </div>
                ) : (
                  <span className="select-none leading-none text-sm font-medium" style={{ color: "#404040" }}>
                    {i + 1}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Belohnungs-Abschnitt */}
      <div className="px-5 pb-6 space-y-2">
        {activeTiers.map((tier, i) => {
          const reached = currentStamps >= tier.stamps;
          return (
            <div
              key={i}
              className="rounded-2xl p-4 flex items-center gap-4 transition-all duration-500"
              style={{
                background: reached
                  ? `linear-gradient(to right, ${hexToRgba(accent, 0.18)}, ${hexToRgba(accent, 0.08)})`
                  : "rgba(255,255,255,0.02)",
                border: reached
                  ? `1px solid ${hexToRgba(accent, 0.45)}`
                  : "1px solid rgba(255,255,255,0.06)",
                opacity: reached ? 1 : 0.45,
              }}
            >
              <Gift size={28} style={{ color: reached ? accent : "#888888", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-wider uppercase mb-0.5"
                  style={{ color: reached ? accent : "#888888" }}>
                  {reached ? "Bereit zum Einlösen" : `Ab ${tier.stamps} Stempeln`}
                </p>
                <p className="font-semibold leading-snug"
                  style={{ color: reached ? "#fefce8" : "#888888" }}>
                  {tier.text}
                </p>
              </div>
              {i === activeTiers.length - 1 && rewardsRedeemed > 0 && (
                <div className="shrink-0 text-center">
                  <p className="text-sm font-bold" style={{ color: reached ? accent : "#666666" }}>{rewardsRedeemed}×</p>
                  <p className="text-[9px] text-neutral-600">genutzt</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
