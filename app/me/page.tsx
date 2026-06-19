"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, LayoutGrid, Stamp, Gift, ChevronRight, Scissors } from "lucide-react";

const AWAY_THRESHOLD_MS = 4 * 60 * 60 * 1000;

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 90 + (i % 4) * 18;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
});

// ─── Stamp Overlay (amber circle stamp from center) ───────────────────────────

function StampOverlay({ onDone }: { onDone: () => void }) {
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

// ─── QR Card (big, QR-Ansicht) ────────────────────────────────────────────────

function QRCard({ qrToken, customerName }: { qrToken: string; customerName: string }) {
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
            <LayoutGrid size={18} className="text-zinc-900" />
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

// ─── QR Mini (eingebettet in LoyaltyCard) ────────────────────────────────────

function QRMini({ qrToken }: { qrToken: string }) {
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

// ─── Physical Loyalty Card ────────────────────────────────────────────────────

function LoyaltyCard({
  shopName, rewardText, stampsRequired, currentStamps, rewardsRedeemed,
  animateIndex, onShowQR, qrToken,
}: {
  shopName: string;
  rewardText: string;
  stampsRequired: number;
  currentStamps: number;
  rewardsRedeemed: number;
  animateIndex: number | null;
  onShowQR: () => void;
  qrToken: string;
}) {
  const cols = stampsRequired <= 6 ? 3 : stampsRequired <= 8 ? 4 : stampsRequired <= 10 ? 5 : 4;
  const iconSize = cols <= 3 ? 20 : cols <= 4 ? 17 : 13;
  const isComplete = currentStamps >= stampsRequired;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="card-3d rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(150deg, #141109 0%, #0c0a07 60%, #111009 100%)",
        border: "1px solid rgba(160,130,55,0.13)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.65), inset 0 1px 0 rgba(200,160,60,0.04)",
      }}
    >
      {/* ── Karten-Kopf ── */}
      <div className="px-5 pt-5 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[8px] font-semibold uppercase tracking-[0.28em] text-zinc-600 mb-1">
            Digitale Stempelkarte
          </p>
          <p className="text-zinc-100 font-bold text-xl leading-tight truncate">{shopName}</p>
          <p className="text-[11px] text-zinc-600 mt-1">
            {currentStamps} von {stampsRequired} Stempel
          </p>
        </div>
        <button onClick={onShowQR} className="shrink-0 flex flex-col items-center gap-1 group mt-0.5">
          <QRMini qrToken={qrToken} />
          <span className="text-[9px] text-zinc-700 group-hover:text-zinc-500 transition-colors">
            QR zeigen
          </span>
        </button>
      </div>

      {/* Trennlinie */}
      <div className="mx-5 border-t border-zinc-800/70 mb-4" />

      {/* ── Stempel-Raster ── */}
      <div className="px-5 pb-4">
        <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: stampsRequired }).map((_, i) => {
            const filled = i < currentStamps;
            const isNew = animateIndex === i;
            return (
              <motion.div
                key={i}
                className="aspect-square rounded-full flex items-center justify-center"
                style={{
                  background: filled
                    ? "linear-gradient(135deg, #8a6820 0%, #4e3610 100%)"
                    : "rgba(30,24,12,0.5)",
                  border: filled
                    ? "1px solid rgba(170,130,50,0.3)"
                    : "1px solid rgba(100,80,30,0.18)",
                  boxShadow: filled
                    ? "0 2px 8px rgba(70,50,10,0.45), inset 0 1px 0 rgba(220,175,70,0.18)"
                    : "none",
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
                    <Scissors size={iconSize} className="text-amber-100/80" strokeWidth={1.6} />
                  </motion.div>
                ) : (
                  <span
                    className="select-none leading-none text-zinc-700/50 font-medium"
                    style={{ fontSize: "9px" }}
                  >
                    {i + 1}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Coupon-Trennlinie ── */}
      <div className="relative mx-4 mb-3">
        <div className="border-t border-dashed border-zinc-700/40" />
        <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
          style={{ background: "rgb(9,9,11)" }} />
        <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
          style={{ background: "rgb(9,9,11)" }} />
      </div>

      {/* ── Belohnungs-Abschnitt ── */}
      <div className="px-4 pb-5">
        <div
          className="rounded-2xl p-3.5 flex items-center gap-3 transition-all duration-500"
          style={{
            background: isComplete ? "rgba(140,110,35,0.09)" : "rgba(0,0,0,0.15)",
            border: isComplete ? "1px solid rgba(160,125,45,0.22)" : "1px solid rgba(60,50,30,0.28)",
          }}
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
            isComplete ? "bg-amber-500/90" : "bg-zinc-800/80 border border-zinc-700/50"
          }`}>
            <Gift size={17} className={isComplete ? "text-zinc-900" : "text-zinc-600"} />
          </div>

          <div className="flex-1 min-w-0">
            <p className={`text-[9px] font-semibold uppercase tracking-widest mb-0.5 transition-colors ${
              isComplete ? "text-amber-400/90" : "text-zinc-600"
            }`}>
              {isComplete ? "Bereit zum Einlösen" : "Deine Belohnung"}
            </p>
            <p className={`text-sm font-semibold leading-snug transition-colors ${
              isComplete ? "text-zinc-100" : "text-zinc-500"
            }`}>
              {rewardText}
            </p>
          </div>

          {rewardsRedeemed > 0 && (
            <div className="shrink-0 border border-zinc-700/50 rounded-xl px-2.5 py-1.5 text-center">
              <p className="text-xs text-zinc-400 font-bold">{rewardsRedeemed}×</p>
              <p className="text-[8px] text-zinc-600 mt-0.5">genutzt</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MePage() {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"qr" | "dashboard">("qr");
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [stampAnim, setStampAnim] = useState<number | null>(null);
  const [showStampOverlay, setShowStampOverlay] = useState(false);
  const prevStamps = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("qrToken");
    setQrToken(token);

    const lastVisit = localStorage.getItem("lastVisit");
    const now = Date.now();
    if (lastVisit && now - parseInt(lastVisit) < AWAY_THRESHOLD_MS) {
      setView("dashboard");
    } else {
      setView("qr");
    }
    localStorage.setItem("lastVisit", String(now));

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const seen = localStorage.getItem("installHintSeen");
    if (!isStandalone && !seen) setShowInstallHint(true);
  }, []);

  const data = useQuery(
    api.customers.getMembershipsForCustomer,
    qrToken ? { qrToken } : "skip"
  );

  const activeEntry = data?.memberships
    ?.slice()
    .sort((a, b) => (b.membership.lastStampAt ?? 0) - (a.membership.lastStampAt ?? 0))[0];

  useEffect(() => {
    if (!activeEntry) return;
    const current = activeEntry.membership.currentStamps;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStamps.current = current;
      return;
    }

    if (prevStamps.current !== null && current > prevStamps.current) {
      setStampAnim(current - 1);
      setShowStampOverlay(true);
      setView("dashboard");
      setTimeout(() => setStampAnim(null), 1200);
    }
    prevStamps.current = current;
  }, [activeEntry?.membership.currentStamps]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const { customer } = data;

  return (
    <div className="min-h-screen px-5 pt-12 pb-10 max-w-sm mx-auto flex flex-col">

      <AnimatePresence>
        {showInstallHint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-5 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 flex items-start gap-3">
            <Smartphone size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-200">Zum Homescreen hinzufügen</p>
              <p className="text-xs text-zinc-500 mt-0.5">Tippe auf "Teilen" → "Zum Homescreen"</p>
            </div>
            <button onClick={() => { setShowInstallHint(false); localStorage.setItem("installHintSeen", "1"); }}
              className="text-zinc-600 hover:text-zinc-400 text-lg leading-none">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStampOverlay && <StampOverlay onDone={() => setShowStampOverlay(false)} />}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center">
        <p className="text-zinc-500 text-sm">Hallo,</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">{customer.name} 👋</h1>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* QR-Ansicht */}
        {view === "qr" && (
          <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col items-center justify-center gap-6">
            <QRCard qrToken={qrToken} customerName={customer.name} />
            {activeEntry && (
              <button onClick={() => setView("dashboard")}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                Zur Übersicht <ChevronRight size={15} />
              </button>
            )}
          </motion.div>
        )}

        {/* Dashboard: Stempelkarte */}
        {view === "dashboard" && activeEntry && (
          <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col">
            <LoyaltyCard
              shopName={activeEntry.shop?.name ?? ""}
              rewardText={activeEntry.shop?.rewardText ?? ""}
              stampsRequired={activeEntry.shop?.stampsRequired ?? 8}
              currentStamps={activeEntry.membership.currentStamps}
              rewardsRedeemed={activeEntry.membership.rewardsRedeemed}
              animateIndex={stampAnim}
              onShowQR={() => setView("qr")}
              qrToken={qrToken}
            />
          </motion.div>
        )}

        {/* Noch keine Mitgliedschaft */}
        {view === "dashboard" && !activeEntry && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-6">
            <QRCard qrToken={qrToken} customerName={customer.name} />
            <p className="text-zinc-600 text-sm text-center">
              Noch keine Stempel. Scanne den QR-Code im Laden!
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
