"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Scissors, Trophy, Wheat } from "lucide-react";
import QRCode from "qrcode";

const GOLD       = "#C49A2A";
const GOLD_LIGHT = "#E8D070";
const GOLD_DIM   = "#7A5C12";
const CARD_BG    = "#130A04";
const APP_BG     = "#0D0803";

// ─── Background ───────────────────────────────────────────────────────────────

export function VintageBackground() {
  return (
    <div
      className="fixed inset-0 z-[1] pointer-events-none"
      style={{
        background: `
          radial-gradient(ellipse at 15% 20%, rgba(80,40,8,0.5) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 80%, rgba(60,28,4,0.6) 0%, transparent 55%),
          ${APP_BG}
        `,
      }}
    />
  );
}

// ─── Greeting ─────────────────────────────────────────────────────────────────

export function VintageGreeting({ name }: { name: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-5 relative z-10">
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.25em", color: GOLD_DIM, textTransform: "uppercase" }}>
        Hallo,
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: GOLD_LIGHT, lineHeight: 1.2 }}>
        {name} 👋
      </h1>
    </motion.div>
  );
}

// ─── QR Mini (vintage style) ──────────────────────────────────────────────────

function VintageQRMini({ qrToken }: { qrToken: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 60, margin: 1, color: { dark: "#120A04", light: "#F5E6C8" },
      });
    }
  }, [qrToken]);
  return (
    <div style={{ background: "#F5E6C8", borderRadius: 6, padding: 3, border: `1px solid ${GOLD_DIM}` }}>
      <canvas ref={canvasRef} style={{ display: "block", borderRadius: 3 }} />
    </div>
  );
}

// ─── Coin Stamp ───────────────────────────────────────────────────────────────

function CoinStamp({ filled, index, animating }: { filled: boolean; index: number; animating: boolean }) {
  const stampIcon = <Scissors size={15} color="#FFD060" strokeWidth={2} />;

  return (
    <motion.div
      animate={animating ? { scale: [1, 1.18, 1], rotate: [0, 8, -8, 0] } : {}}
      transition={{ duration: 0.45 }}
      style={{
        width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
        background: filled
          ? "radial-gradient(circle at 38% 32%, #EAC030 0%, #B87E08 50%, #7A5208 100%)"
          : "radial-gradient(circle at 38% 32%, #3D2510 0%, #1E1008 80%)",
        border: `1.5px solid ${filled ? GOLD : GOLD_DIM + "88"}`,
        boxShadow: filled
          ? `0 0 10px rgba(196,154,10,0.4), inset 0 1px 3px rgba(255,220,80,0.35), inset 0 -2px 5px rgba(0,0,0,0.65)`
          : `inset 0 3px 6px rgba(0,0,0,0.85), inset 0 -1px 2px rgba(255,140,0,0.07)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {filled ? stampIcon : (
        <span style={{ color: GOLD_DIM, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>
          {index + 1}
        </span>
      )}
    </motion.div>
  );
}

// ─── Vintage Loyalty Card ─────────────────────────────────────────────────────

export function VintageLoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex, onShowQR, qrToken,
}: {
  shopName: string;
  stampsRequired: number;
  currentStamps: number;
  animateIndex: number | null;
  onShowQR: () => void;
  qrToken: string;
}) {
  const rows = Math.ceil(stampsRequired / 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative z-10"
      style={{
        borderRadius: 16,
        padding: 2,
        background: `linear-gradient(145deg, ${GOLD} 0%, ${GOLD_DIM} 45%, ${GOLD} 100%)`,
        boxShadow: `0 8px 36px rgba(0,0,0,0.7), 0 0 0 1px #2A1A06`,
      }}
    >
      <div style={{
        borderRadius: 14,
        background: CARD_BG,
        padding: "16px 15px 18px",
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${GOLD_DIM}33`,
      }}>
        {/* Subtle diagonal texture */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025,
          backgroundImage: "repeating-linear-gradient(-45deg, #fff 0px, #fff 1px, transparent 1px, transparent 9px)",
        }} />

        {/* Corner decorations */}
        {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
          <span key={i} className={`absolute ${pos}`} style={{ color: GOLD_DIM, fontSize: 10, lineHeight: 1, opacity: 0.6 }}>◆</span>
        ))}

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1, paddingRight: 10 }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.28em", color: GOLD_DIM, textTransform: "uppercase", marginBottom: 5 }}>
              Digitale Stempelkarte
            </p>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: GOLD_LIGHT, lineHeight: 1.2, marginBottom: 5 }}>
              {shopName}
            </h2>
            <p style={{ fontSize: 10, color: "#C8A86A", opacity: 0.75 }}>
              {currentStamps} von {stampsRequired} Stempel
            </p>
          </div>
          <button
            onClick={onShowQR}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <VintageQRMini qrToken={qrToken} />
            <span style={{ fontSize: 8, fontWeight: 700, color: GOLD, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              QR zeigen
            </span>
          </button>
        </div>

        {/* Gold divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_DIM}, transparent)`, marginBottom: 14 }} />

        {/* Stamp grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} style={{ display: "flex", gap: 7, justifyContent: "center" }}>
              {Array.from({ length: 5 }).map((_, col) => {
                const idx = row * 5 + col;
                if (idx >= stampsRequired) return <div key={col} style={{ width: 46 }} />;
                return (
                  <CoinStamp
                    key={idx}
                    index={idx}
                    filled={idx < currentStamps}
                    animating={animateIndex === idx}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Vintage Reward Banner ────────────────────────────────────────────────────

export function VintageRewardBanner({
  rewardText, stampsRequired, rewardTiers,
}: {
  rewardText: string;
  stampsRequired: number;
  rewardTiers?: Array<{ stamps: number; text: string; enabled: boolean }>;
}) {
  const tiers = rewardTiers?.filter(t => t.enabled) ?? [];
  const items = tiers.length > 0 ? tiers : [{ stamps: stampsRequired, text: rewardText }];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="relative z-10"
      style={{
        borderRadius: 12,
        border: `1.5px solid ${GOLD_DIM}`,
        background: `linear-gradient(135deg, #1C0E06 0%, #160B04 100%)`,
        overflow: "hidden",
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.stamps}
          style={{
            padding: "12px 14px",
            display: "flex", alignItems: "center", gap: 12,
            borderBottom: i < items.length - 1 ? `1px solid ${GOLD_DIM}33` : "none",
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid ${GOLD_DIM}`,
            background: "radial-gradient(circle at 35% 35%, #3D2510, #1E1008)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Wheat size={18} color={GOLD} />
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: GOLD_DIM, textTransform: "uppercase", marginBottom: 3 }}>
              Ab {item.stamps} Stempeln
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: GOLD_LIGHT, lineHeight: 1.2 }}>
              {item.text}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Vintage Milestones ───────────────────────────────────────────────────────

export function VintageMilestonesSection({
  milestones, totalStampsEver,
}: {
  milestones: Array<{ stamps: number; text: string; enabled: boolean }>;
  totalStampsEver: number;
}) {
  const active = milestones.filter(m => m.enabled);
  if (active.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="relative z-10"
      style={{
        borderRadius: 12,
        border: `1.5px solid ${GOLD_DIM}`,
        background: `linear-gradient(135deg, #1C0E06 0%, #160B04 100%)`,
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${GOLD_DIM}44`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Trophy size={13} color={GOLD} />
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: GOLD, textTransform: "uppercase" }}>
          Treue-Meilensteine
        </p>
      </div>
      {active.map((m, i) => {
        const reached = totalStampsEver >= m.stamps;
        return (
          <div key={m.stamps} style={{
            padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
            borderBottom: i < active.length - 1 ? `1px solid ${GOLD_DIM}22` : "none",
            opacity: reached ? 1 : 0.65,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: reached
                ? "radial-gradient(circle at 35% 35%, #EAC030, #7A5208)"
                : "radial-gradient(circle at 35% 35%, #3D2510, #1E1008)",
              border: `1px solid ${reached ? GOLD : GOLD_DIM + "66"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Trophy size={12} color={reached ? "#FFD060" : GOLD_DIM} />
            </div>
            <p style={{ flex: 1, fontSize: 13, color: reached ? GOLD_LIGHT : "#C8A86A", fontWeight: 600 }}>
              {m.text}
            </p>
            <p style={{ fontSize: 11, color: GOLD_DIM, fontWeight: 700 }}>
              {Math.min(totalStampsEver, m.stamps)}/{m.stamps}
            </p>
          </div>
        );
      })}
    </motion.div>
  );
}
