"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import QRCode from "qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, LayoutGrid } from "lucide-react";

function QRCard({ qrToken, customerName }: { qrToken: string; customerName: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const url = `${window.location.origin}/stamp/${qrToken}`;
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 1,
        color: { dark: "#09090b", light: "#fafafa" },
      });
    }
  }, [qrToken]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
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

export default function MePage() {
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showInstallHint, setShowInstallHint] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("qrToken");
    setQrToken(token);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const seen = localStorage.getItem("installHintSeen");
    if (!isStandalone && !seen) setShowInstallHint(true);
  }, []);

  const data = useQuery(
    api.customers.getMembershipsForCustomer,
    qrToken ? { qrToken } : "skip"
  );

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
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm"
        >
          Laden...
        </motion.div>
      </div>
    );
  }

  if (!data) return null;
  const { customer } = data;

  return (
    <div className="min-h-screen px-5 pt-12 pb-10 max-w-sm mx-auto flex flex-col">

      <AnimatePresence>
        {showInstallHint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 flex items-start gap-3"
          >
            <Smartphone size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-200">Zum Homescreen hinzufügen</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tippe auf "Teilen" → "Zum Homescreen" – immer griffbereit.
              </p>
            </div>
            <button
              onClick={() => { setShowInstallHint(false); localStorage.setItem("installHintSeen", "1"); }}
              className="text-zinc-600 hover:text-zinc-400 text-lg leading-none"
            >×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 text-center">
        <p className="text-zinc-500 text-sm">Hallo,</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">{customer.name} 👋</h1>
      </motion.div>

      <div className="flex-1 flex items-center justify-center">
        <QRCard qrToken={qrToken} customerName={customer.name} />
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-zinc-600 mt-8"
      >
        QR-Code im Laden vorzeigen zum Stempel sammeln
      </motion.p>
    </div>
  );
}
