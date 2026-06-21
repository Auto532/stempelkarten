"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, LayoutGrid, ChevronRight, Gift } from "lucide-react";
import { StampOverlay, QRCard, LoyaltyCard, MilestonesSection, getActiveTiers, hexToRgba } from "./components";

const AWAY_THRESHOLD_MS = 4 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─── ShopRow (für die multi-shop Übersicht) ───────────────────────────────────

type MembershipEntry = {
  membership: { _id: string; currentStamps: number; lastStampAt?: number | null };
  shop?: {
    _id: string; name: string; slug?: string; stampsRequired: number; rewardText: string;
    rewardTiers?: { stamps: number; text: string; enabled: boolean }[];
    accentColor?: string; customDesignEnabled?: boolean;
  } | null;
};

function ShopRow({ entry, onClick }: { entry: MembershipEntry; onClick: () => void }) {
  const shop = entry.shop;
  const membership = entry.membership;
  if (!shop) return null;

  const accent = shop.customDesignEnabled ? (shop.accentColor ?? "#fbbf24") : "#fbbf24";
  const activeTiers = getActiveTiers(shop);
  const lowestThreshold = activeTiers[0].stamps;
  const isReady = membership.currentStamps >= lowestThreshold;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 active:scale-[0.98] transition-all text-left"
    >
      {/* Monogram */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all"
        style={isReady
          ? { backgroundColor: hexToRgba(accent, 0.85), color: "#09090b" }
          : { backgroundColor: "#27272a", color: hexToRgba(accent, 0.9) }
        }
      >
        {shop.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">{shop.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {membership.currentStamps} / {lowestThreshold} Stempel
        </p>
      </div>

      {/* Bereit-Badge */}
      {isReady && (
        <span className="shrink-0 text-[9px] font-bold px-2 py-1 rounded-full border"
          style={{ color: accent, borderColor: hexToRgba(accent, 0.3), backgroundColor: hexToRgba(accent, 0.1) }}>
          BEREIT
        </span>
      )}

      <ChevronRight size={15} className="text-zinc-700 shrink-0" />
    </motion.button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MePage() {
  const router = useRouter();
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"qr" | "dashboard">("qr");
  const [showInstallHint, setShowInstallHint] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [stampAnimMap, setStampAnimMap] = useState<Record<string, number | null>>({});
  const [showStampOverlay, setShowStampOverlay] = useState(false);
  const prevStampsRef = useRef<Record<string, number>>({});
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

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowInstallHint(false);
        localStorage.setItem("installHintSeen", "1");
      }
      setDeferredPrompt(null);
    }
  };

  const data = useQuery(
    api.customers.getMembershipsForCustomer,
    qrToken ? { qrToken } : "skip"
  );

  const allMemberships = (data?.memberships ?? [])
    .slice()
    .sort((a, b) => (b.membership.lastStampAt ?? 0) - (a.membership.lastStampAt ?? 0));

  const stampsKey = allMemberships.map(e => `${e.membership._id}:${e.membership.currentStamps}`).join(",");

  useEffect(() => {
    if (!allMemberships.length) return;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      allMemberships.forEach(e => {
        prevStampsRef.current[e.membership._id] = e.membership.currentStamps;
      });
      return;
    }

    const updates: Record<string, number | null> = {};
    let anyNew = false;
    allMemberships.forEach(e => {
      const id = e.membership._id;
      const current = e.membership.currentStamps;
      const prev = prevStampsRef.current[id] ?? current;
      if (current > prev) {
        updates[id] = current - 1;
        anyNew = true;
        setTimeout(() => setStampAnimMap(m => ({ ...m, [id]: null })), 1200);
      } else {
        updates[id] = null;
      }
      prevStampsRef.current[id] = current;
    });
    if (anyNew) {
      setStampAnimMap(updates);
      setShowStampOverlay(true);
      if (allMemberships.length === 1) setView("dashboard");
    }
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
  const { customer } = data;
  const isMultiShop = allMemberships.length >= 2;

  return (
    <div className="min-h-screen px-5 pt-12 pb-10 max-w-sm mx-auto flex flex-col">

      <AnimatePresence>
        {showInstallHint && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="mb-5 bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            {deferredPrompt ? (
              <button onClick={handleInstall}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left">
                <Smartphone size={18} className="text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">Zum Homescreen hinzufügen</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">Tippe hier zum Installieren →</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setShowInstallHint(false); localStorage.setItem("installHintSeen", "1"); }}
                  className="text-zinc-600 hover:text-zinc-400 text-lg leading-none shrink-0">×</button>
              </button>
            ) : (
              <div className="flex items-start gap-3 px-4 py-3">
                <Smartphone size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">Zum Homescreen hinzufügen</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Tippe auf "Teilen" → "Zum Homescreen"</p>
                </div>
                <button onClick={() => { setShowInstallHint(false); localStorage.setItem("installHintSeen", "1"); }}
                  className="text-zinc-600 hover:text-zinc-400 text-lg leading-none shrink-0">×</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStampOverlay && <StampOverlay onDone={() => setShowStampOverlay(false)} />}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 text-center">
        <p className="text-neutral-500 text-sm">Hallo,</p>
        <h1 className="text-2xl font-bold mt-0.5 bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600">
          {customer.name} 👋
        </h1>
      </motion.div>

      {/* ── Multi-Shop Übersicht ─────────────────────────────────── */}
      {isMultiShop && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col gap-4"
        >
          <QRCard qrToken={qrToken} customerName={customer.name} />

          <div className="space-y-2 mt-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 mb-2.5 ml-1">
              Deine Karten
            </p>
            {allMemberships.map((entry, i) => (
              <motion.div key={entry.membership._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}>
                <ShopRow
                  entry={entry}
                  onClick={() => router.push(`/me/shop/${entry.shop?.slug ?? ""}`)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Single-Shop: QR / Dashboard Toggle ──────────────────── */}
      {!isMultiShop && (
        <AnimatePresence mode="wait">

          {view === "qr" && (
            <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col items-center justify-center gap-6">
              <QRCard qrToken={qrToken} customerName={customer.name} />
              {allMemberships.length > 0 && (
                <button onClick={() => setView("dashboard")}
                  className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
                  Zur Karte <ChevronRight size={15} />
                </button>
              )}
            </motion.div>
          )}

          {view === "dashboard" && allMemberships.length > 0 && (
            <motion.div key="dashboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
              className="flex-1 flex flex-col gap-5">
              {allMemberships.map((entry) => (
                <div key={entry.membership._id} className="flex flex-col gap-4">
                  <LoyaltyCard
                    shopName={entry.shop?.name ?? ""}
                    rewardText={entry.shop?.rewardText ?? ""}
                    stampsRequired={entry.shop?.stampsRequired ?? 8}
                    currentStamps={entry.membership.currentStamps}
                    rewardsRedeemed={entry.membership.rewardsRedeemed}
                    animateIndex={stampAnimMap[entry.membership._id] ?? null}
                    onShowQR={() => setView("qr")}
                    qrToken={qrToken}
                    rewardTiers={entry.shop?.rewardTiers}
                    accentColor={entry.shop?.customDesignEnabled ? entry.shop?.accentColor : undefined}
                    stampIcon={entry.shop?.stampIcon}
                  />
                  {entry.shop?.milestonesEnabled && entry.shop.milestones && (
                    <MilestonesSection
                      milestones={entry.shop.milestones}
                      totalStampsEver={entry.membership.totalStampsEver}
                      accent={entry.shop?.customDesignEnabled ? entry.shop.accentColor : undefined}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          )}

          {view === "dashboard" && allMemberships.length === 0 && (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-6">
              <QRCard qrToken={qrToken} customerName={customer.name} />
              <div className="flex items-center gap-2 text-zinc-600 text-sm">
                <Gift size={14} />
                <span>Noch keine Stempel. Lass dich im Laden scannen!</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* Legal links */}
      {!isMultiShop && allMemberships[0]?.shop?.slug && (
        <div className="flex flex-wrap justify-center gap-3 pt-6 pb-2">
          <a href={`/me/impressum/${allMemberships[0].shop.slug}`}
            className="text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors">Impressum</a>
          <span className="text-zinc-800">·</span>
          <a href={`/agb/${allMemberships[0].shop.slug}`}
            className="text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors">AGB</a>
          <span className="text-zinc-800">·</span>
          <a href={`/me/datenschutz/${allMemberships[0].shop.slug}`}
            className="text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors">Datenschutz</a>
        </div>
      )}
    </div>
  );
}
