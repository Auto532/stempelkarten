"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, ChevronRight, Gift } from "lucide-react";
import { StampOverlay, getActiveTiers, hexToRgba } from "./components";

// ─── ShopCard (für die multi-shop Übersicht) ──────────────────────────────────

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
  } | null;
};

function ShopCard({ entry, index, onClick }: { entry: MembershipEntry; index: number; onClick: () => void }) {
  const shop = entry.shop;
  const membership = entry.membership;
  if (!shop) return null;

  const accent = shop.customDesignEnabled ? (shop.accentColor ?? "#fbbf24") : "#fbbf24";
  const activeTiers = getActiveTiers(shop);
  const lowestThreshold = activeTiers[0].stamps;
  const highestThreshold = activeTiers[activeTiers.length - 1].stamps;
  const isReady = membership.currentStamps >= lowestThreshold;
  const progress = Math.min(membership.currentStamps / lowestThreshold, 1);

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      onClick={onClick}
      className="w-full text-left rounded-3xl overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        background: "#111111",
        border: `1px solid #262626`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}
    >
      {/* Farbstreifen oben */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${accent}, ${hexToRgba(accent, 0.3)})` }}
      />

      <div className="px-5 py-4">
        {/* Shop-Name + Pfeil */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[9px] font-bold tracking-widest uppercase mb-1" style={{ color: accent }}>
              Stempelkarte
            </p>
            <h2 className="text-xl font-bold text-neutral-100 leading-tight">{shop.name}</h2>
          </div>
          <div className="flex items-center gap-1 mt-1">
            {isReady && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-[9px] font-bold px-2 py-1 rounded-full"
                style={{
                  color: accent,
                  backgroundColor: hexToRgba(accent, 0.12),
                  border: `1px solid ${hexToRgba(accent, 0.3)}`,
                }}
              >
                BEREIT
              </motion.span>
            )}
            <ChevronRight size={16} className="text-neutral-700 shrink-0 mt-0.5" />
          </div>
        </div>

        {/* Mini Stempel-Dots */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Array.from({ length: Math.min(highestThreshold, 20) }).map((_, i) => {
            const filled = i < membership.currentStamps;
            const isTier = activeTiers.some(t => t.stamps === i + 1);
            return (
              <div
                key={i}
                className="rounded-full flex items-center justify-center"
                style={{
                  width: highestThreshold <= 10 ? 26 : highestThreshold <= 15 ? 22 : 18,
                  height: highestThreshold <= 10 ? 26 : highestThreshold <= 15 ? 22 : 18,
                  backgroundColor: filled
                    ? hexToRgba(accent, 0.2)
                    : "#161616",
                  border: filled
                    ? `1px solid ${hexToRgba(accent, 0.5)}`
                    : isTier
                      ? `1.5px dashed ${hexToRgba(accent, 0.35)}`
                      : `1px solid #2a2a2a`,
                }}
              >
                {filled && (
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                )}
                {!filled && isTier && (
                  <Gift size={8} style={{ color: hexToRgba(accent, 0.5) }} />
                )}
              </div>
            );
          })}
          {highestThreshold > 20 && (
            <span className="text-[10px] text-neutral-600 self-center ml-1">+{highestThreshold - 20}</span>
          )}
        </div>

        {/* Fortschritt */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-500">
              {membership.currentStamps} / {lowestThreshold} Stempel
            </span>
            <span className="text-xs font-semibold" style={{ color: hexToRgba(accent, 0.8) }}>
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#1e1e1e" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.7, delay: index * 0.07 + 0.2 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${accent}, ${hexToRgba(accent, 0.6)})` }}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MePage() {
  const router = useRouter();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showStampOverlay, setShowStampOverlay] = useState(false);
  const prevStampsRef = useRef<Record<string, number>>({});
  const isFirstLoad = useRef(true);
  const didRedirect = useRef(false);

  useEffect(() => {
    setMounted(true);
    setQrToken(localStorage.getItem("qrToken"));
  }, []);

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

  // 1 Shop → redirect läuft, Ladescreen anzeigen
  if (allMemberships.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  const { customer } = data;

  // 0 Shops → noch nicht registriert
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
    <div className="min-h-screen px-5 pt-12 pb-10 max-w-sm mx-auto">

      <AnimatePresence>
        {showStampOverlay && <StampOverlay onDone={() => setShowStampOverlay(false)} />}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
        <p className="text-neutral-500 text-sm">Hallo,</p>
        <h1 className="text-2xl font-bold mt-0.5 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
          {customer.name}
        </h1>
      </motion.div>

      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1">
          Deine Karten
        </p>
        {allMemberships.map((entry, i) => (
          <ShopCard
            key={entry.membership._id}
            entry={entry}
            index={i}
            onClick={() => router.push(`/me/shop/${entry.shop?.slug ?? ""}`)}
          />
        ))}
      </div>
    </div>
  );
}
