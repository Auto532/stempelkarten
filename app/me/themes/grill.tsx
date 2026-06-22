"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Gift } from "lucide-react";
import QRCode from "qrcode";

const ACCENT       = "#E07A20";
const ACCENT_LIGHT = "#F5A040";
const ACCENT_DIM   = "#8A4010";
const CARD_BG      = "#1E0E04";
const APP_BG       = "#1a1008";
const TEXT_MAIN    = "#F5D5A8";
const TEXT_DIM     = "#8A5030";

// ─── Background ───────────────────────────────────────────────────────────────

export function GrillBackground() {
  return (
    <div
      className="fixed inset-0 z-[-1] pointer-events-none"
      style={{
        background: `
          radial-gradient(ellipse at 20% 15%, rgba(140,60,0,0.45) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 85%, rgba(100,35,0,0.5) 0%, transparent 50%),
          ${APP_BG}
        `,
      }}
    >
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(224,122,32,0.07) 28px, rgba(224,122,32,0.07) 29px),
          repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(224,122,32,0.07) 28px, rgba(224,122,32,0.07) 29px)
        `,
      }} />
    </div>
  );
}

// ─── QR Mini ──────────────────────────────────────────────────────────────────

function GrillQRMini({ qrToken }: { qrToken: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 60, margin: 1, color: { dark: "#1E0E04", light: "#F5D5A8" },
      });
    }
  }, [qrToken]);
  return (
    <div style={{ background: "#F5D5A8", borderRadius: 6, padding: 3, border: `1px solid ${ACCENT_DIM}` }}>
      <canvas ref={canvasRef} style={{ display: "block", borderRadius: 3 }} />
    </div>
  );
}

// ─── Stamp Slot ───────────────────────────────────────────────────────────────

function GrillStamp({ filled, index, animating, isTierCheckpoint }: {
  filled: boolean; index: number; animating: boolean; isTierCheckpoint?: boolean;
}) {
  return (
    <motion.div
      animate={animating ? { scale: [1, 1.2, 1], rotate: [0, 6, -6, 0] } : {}}
      transition={{ duration: 0.4 }}
      style={{
        width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
        background: filled
          ? isTierCheckpoint
            ? "radial-gradient(circle at 38% 32%, #FF9A30 0%, #E07A20 50%, #9A4010 100%)"
            : "radial-gradient(circle at 38% 32%, #F08030 0%, #C06010 60%, #803008 100%)"
          : "radial-gradient(circle at 38% 32%, #2E1208 0%, #1E0E04 80%)",
        border: isTierCheckpoint
          ? `1.5px solid ${filled ? ACCENT_LIGHT : ACCENT + "99"}`
          : `1.5px solid ${filled ? ACCENT : ACCENT_DIM + "88"}`,
        boxShadow: filled
          ? isTierCheckpoint
            ? `0 0 16px rgba(224,122,32,0.6), 0 0 6px rgba(255,154,48,0.4), inset 0 1px 3px rgba(255,180,80,0.5), inset 0 -2px 5px rgba(0,0,0,0.6)`
            : `0 0 10px rgba(224,122,32,0.4), inset 0 1px 3px rgba(255,140,40,0.3), inset 0 -2px 5px rgba(0,0,0,0.65)`
          : isTierCheckpoint
            ? `inset 0 3px 6px rgba(0,0,0,0.8), 0 0 6px rgba(224,122,32,0.12)`
            : `inset 0 3px 6px rgba(0,0,0,0.85)`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {filled
        ? isTierCheckpoint
          ? <Trophy size={15} color="#FFD080" strokeWidth={2} />
          : <Flame size={14} color="#FFD080" strokeWidth={2} />
        : isTierCheckpoint
          ? <Trophy size={13} color={ACCENT} strokeWidth={2} style={{ opacity: 0.6 }} />
          : <span style={{ color: ACCENT_DIM, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>{index + 1}</span>
      }
    </motion.div>
  );
}

// ─── Loyalty Card ─────────────────────────────────────────────────────────────

export function GrillLoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex, onShowQR, qrToken, hideQR, rewardTiers, accentColor,
}: {
  shopName: string;
  stampsRequired: number;
  currentStamps: number;
  animateIndex: number | null;
  onShowQR?: () => void;
  qrToken: string;
  hideQR?: boolean;
  rewardTiers?: Array<{ stamps: number; text: string; enabled: boolean }>;
  accentColor?: string;
}) {
  const accent = accentColor ?? ACCENT;
  const activeTiers = rewardTiers?.filter(t => t.enabled) ?? [];
  const totalSlots = activeTiers.length > 0
    ? Math.max(...activeTiers.map(t => t.stamps))
    : stampsRequired;
  const tierCheckpoints = new Set(activeTiers.map(t => t.stamps));
  const nextTier = activeTiers.find(t => currentStamps < t.stamps);
  const displayTarget = nextTier?.stamps ?? totalSlots;
  const rows = Math.ceil(totalSlots / 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="relative z-10"
      style={{
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: `0 8px 36px rgba(0,0,0,0.75), 0 0 0 1px ${ACCENT_DIM}66`,
        border: `1px solid ${ACCENT_DIM}55`,
      }}
    >
      {/* Flame bar */}
      <div style={{
        height: 4,
        background: `linear-gradient(90deg, #E05A00, #FF8C00, #FF6000, #E05A00)`,
        backgroundSize: "200% 100%",
      }} />

      <div style={{
        background: CARD_BG,
        padding: "14px 15px 18px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Grill grid texture overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.045,
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,255,255,1) 18px, rgba(255,255,255,1) 19px),
            repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(255,255,255,1) 18px, rgba(255,255,255,1) 19px)
          `,
        }} />

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ flex: 1, paddingRight: 10 }}>
            <p style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.28em", color: ACCENT_DIM, textTransform: "uppercase", marginBottom: 4 }}>
              Digitale Stempelkarte
            </p>
            <h2 style={{
              fontSize: 19, fontWeight: 800, color: TEXT_MAIN, lineHeight: 1.2, marginBottom: 4,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}>
              {shopName}
            </h2>
            <p style={{ fontSize: 10, color: TEXT_DIM, opacity: 0.9 }}>
              {currentStamps} von {displayTarget} Stempel
            </p>
          </div>
          {!hideQR && (
            <button
              onClick={onShowQR}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              <GrillQRMini qrToken={qrToken} />
              <span style={{ fontSize: 8, fontWeight: 700, color: accent, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                QR zeigen
              </span>
            </button>
          )}
        </div>

        {/* Divider with flame icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT_DIM})` }} />
          <Flame size={14} color={accent} />
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ACCENT_DIM}, transparent)` }} />
        </div>

        {/* Stamp grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} style={{ display: "flex", gap: 7, justifyContent: "center" }}>
              {Array.from({ length: 5 }).map((_, col) => {
                const idx = row * 5 + col;
                if (idx >= totalSlots) return <div key={col} style={{ width: 46 }} />;
                const isCheckpoint = tierCheckpoints.has(idx + 1);
                return (
                  <GrillStamp
                    key={idx}
                    index={idx}
                    filled={idx < currentStamps}
                    animating={animateIndex === idx}
                    isTierCheckpoint={isCheckpoint}
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

// ─── Reward Banner ────────────────────────────────────────────────────────────

export function GrillRewardBanner({
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
        border: `1.5px solid ${ACCENT_DIM}`,
        background: `linear-gradient(135deg, ${CARD_BG} 0%, #180A02 100%)`,
        overflow: "hidden",
      }}
    >
      {items.map((item, i) => (
        <div key={item.stamps} style={{
          padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 12,
          borderBottom: i < items.length - 1 ? `1px solid ${ACCENT_DIM}33` : "none",
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            border: `1.5px solid ${ACCENT_DIM}`,
            background: `radial-gradient(circle at 35% 35%, #3D1808, #1E0E04)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Gift size={18} color={ACCENT} />
          </div>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: ACCENT_DIM, textTransform: "uppercase", marginBottom: 3 }}>
              Ab {item.stamps} Stempeln
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: TEXT_MAIN, lineHeight: 1.2 }}>
              {item.text}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export function GrillMilestonesSection({
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
        border: `1.5px solid ${ACCENT_DIM}`,
        background: `linear-gradient(135deg, ${CARD_BG} 0%, #180A02 100%)`,
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${ACCENT_DIM}44`,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Trophy size={13} color={ACCENT} />
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: ACCENT, textTransform: "uppercase" }}>
          Treue-Meilensteine
        </p>
      </div>
      {active.map((m, i) => {
        const reached = totalStampsEver >= m.stamps;
        return (
          <div key={m.stamps} style={{
            padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 10,
            borderBottom: i < active.length - 1 ? `1px solid ${ACCENT_DIM}22` : "none",
            opacity: reached ? 1 : 0.65,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: reached
                ? "radial-gradient(circle at 35% 35%, #F08030, #8A3010)"
                : "radial-gradient(circle at 35% 35%, #3D1808, #1E0E04)",
              border: `1px solid ${reached ? ACCENT : ACCENT_DIM + "66"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Trophy size={12} color={reached ? "#FFD080" : ACCENT_DIM} />
            </div>
            <p style={{ flex: 1, fontSize: 13, color: reached ? TEXT_MAIN : ACCENT_DIM, fontWeight: 600 }}>
              {m.text}
            </p>
            <p style={{ fontSize: 11, color: ACCENT_DIM, fontWeight: 700 }}>
              {Math.min(totalStampsEver, m.stamps)}/{m.stamps}
            </p>
          </div>
        );
      })}
    </motion.div>
  );
}
