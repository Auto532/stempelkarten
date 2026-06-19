"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, LayoutGrid, ChevronRight, Stamp, Gift, QrCode } from "lucide-react";

const AWAY_THRESHOLD_MS = 4 * 60 * 60 * 1000;

// Predetermined particle positions (no Math.random — deterministic)
const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 90 + (i % 4) * 18;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
});

// ─── Full-Screen Stamp Animation ─────────────────────────────────────────────

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/88 backdrop-blur-sm cursor-pointer"
    >
      {/* Ink ripple rings */}
      {[0, 1, 2, 3].map(i => (
        <motion.div key={i}
          initial={{ scale: 0.3, opacity: 0.8 }}
          animate={{ scale: 5, opacity: 0 }}
          transition={{ delay: 0.18 + i * 0.1, duration: 1, ease: "easeOut" }}
          className="absolute w-24 h-24 rounded-full border-2 border-amber-400/50"
        />
      ))}

      {/* Particles */}
      {PARTICLES.map((p, i) => (
        <motion.div key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
          transition={{ delay: 0.22, duration: 0.65, ease: "easeOut" }}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#f59e0b" : "#fde68a" }}
        />
      ))}

      {/* Stamp icon */}
      <div className="relative flex flex-col items-center select-none">
        <motion.div
          initial={{ y: -320, rotate: -12, scale: 1.1 }}
          animate={{ y: 0, rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
        >
          {/* Impact squish */}
          <motion.div
            animate={{ scaleY: [1, 0.78, 1.1, 1], scaleX: [1, 1.12, 0.95, 1] }}
            transition={{ delay: 0.17, duration: 0.28, ease: "easeOut" }}
            className="w-36 h-36 bg-amber-400 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-amber-400/40"
            style={{ transformOrigin: "bottom center" }}
          >
            <Stamp size={72} className="text-zinc-900" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* "Stempel!" text */}
        <motion.p
          initial={{ opacity: 0, scale: 0.4, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.32, type: "spring", stiffness: 280 }}
          className="text-4xl font-black text-amber-400 mt-6 tracking-tight"
        >
          Stempel!
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-zinc-500 text-sm mt-2"
        >
          Tippe um fortzufahren
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── QR Card (groß) ───────────────────────────────────────────────────────────

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
        <div className="absolute top-4 right-4 w-16 h-16 opacity-5">
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── QR Mini (klein, für Dashboard) ─────────────────────────────────────────

function QRMini({ qrToken }: { qrToken: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 80, margin: 1,
        color: { dark: "#09090b", light: "#fafafa" },
      });
    }
  }, [qrToken]);
  return (
    <div className="bg-zinc-50 rounded-xl p-1.5 inline-block shadow">
      <canvas ref={canvasRef} className="rounded-lg" />
    </div>
  );
}

// ─── Stamp Dots ──────────────────────────────────────────────────────────────

function StampDots({ current, total, animateIndex }: { current: number; total: number; animateIndex: number | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < current;
        const isNew = animateIndex !== null && i === animateIndex;
        return (
          <motion.div
            key={i}
            animate={isNew ? { scale: [1, 1.4, 1], backgroundColor: ["#fbbf24", "#fbbf24", "#fbbf24"] } : {}}
            transition={isNew ? { duration: 0.5, ease: "easeOut" } : {}}
            className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
              filled ? "bg-amber-400 border-amber-400 text-zinc-900" : "border-zinc-700 bg-zinc-800/50"
            }`}
          >
            {filled && (
              <motion.span
                initial={isNew ? { scale: 0 } : { scale: 1 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              >
                ✓
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
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

  // Pick most recently stamped shop
  const activeEntry = data?.memberships
    ?.slice()
    .sort((a, b) => (b.membership.lastStampAt ?? 0) - (a.membership.lastStampAt ?? 0))[0];

  // Detect new stamp in real-time
  useEffect(() => {
    if (!activeEntry) return;
    const current = activeEntry.membership.currentStamps;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStamps.current = current;
      return;
    }

    if (prevStamps.current !== null && current > prevStamps.current) {
      const newDotIndex = current - 1;
      setStampAnim(newDotIndex);
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

      {/* Install hint */}
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

      {/* Stamp overlay animation */}
      <AnimatePresence>
        {showStampOverlay && (
          <StampOverlay onDone={() => setShowStampOverlay(false)} />
        )}
      </AnimatePresence>

      {/* Greeting */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center">
        <p className="text-zinc-500 text-sm">Hallo,</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">{customer.name} 👋</h1>
      </motion.div>

      {/* Views */}
      <AnimatePresence mode="wait">

        {/* ── QR View ── */}
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

        {/* ── Dashboard View ── */}
        {view === "dashboard" && activeEntry && (
          <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
            className="flex-1 flex flex-col gap-4">

            {/* Shop + QR mini row */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-zinc-100 truncate">{activeEntry.shop?.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{activeEntry.shop?.rewardText}</p>
                {activeEntry.membership.currentStamps >= (activeEntry.shop?.stampsRequired ?? 99) && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="inline-flex items-center gap-1 mt-2 text-[11px] bg-amber-400 text-zinc-900 font-bold px-2.5 py-1 rounded-full">
                    <Gift size={10} /> Belohnung bereit!
                  </motion.span>
                )}
              </div>
              <button onClick={() => setView("qr")} className="shrink-0 flex flex-col items-center gap-1 group">
                <QRMini qrToken={qrToken} />
                <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors flex items-center gap-0.5">
                  <QrCode size={10} /> Zeigen
                </span>
              </button>
            </motion.div>

            {/* Stamp card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <StampDots
                current={activeEntry.membership.currentStamps}
                total={activeEntry.shop?.stampsRequired ?? 8}
                animateIndex={stampAnim}
              />
              <div>
                <div className="flex justify-between text-xs text-zinc-500 mb-2">
                  <span>{activeEntry.membership.currentStamps} / {activeEntry.shop?.stampsRequired} Stempel</span>
                  {activeEntry.membership.rewardsRedeemed > 0 && (
                    <span>{activeEntry.membership.rewardsRedeemed}× eingelöst</span>
                  )}
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((activeEntry.membership.currentStamps / (activeEntry.shop?.stampsRequired ?? 8)) * 100, 100)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-amber-400 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── No membership yet ── */}
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
