"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Gift, Settings, X, Check, ChevronRight,
  Trophy, Pencil, AlertCircle,
} from "lucide-react";
import { StampOverlay, getActiveTiers, hexToRgba, getStampIcon } from "./components";

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
  { name: "Gold",     value: "#fbbf24" },
  { name: "Sky",      value: "#38bdf8" },
  { name: "Violet",   value: "#a855f7" },
  { name: "Emerald",  value: "#10b981" },
  { name: "Rose",     value: "#f43f5e" },
  { name: "Orange",   value: "#f97316" },
  { name: "Cyan",     value: "#06b6d4" },
  { name: "Lime",     value: "#84cc16" },
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

  const activeTiers = getActiveTiers(shop);
  const lowestTier = activeTiers[0];
  const highestTier = activeTiers[activeTiers.length - 1];
  const totalSlots = highestTier.stamps;
  const tierCheckpoints = new Set(activeTiers.map(t => t.stamps));
  const nextTier = activeTiers.find(t => membership.currentStamps < t.stamps);
  const targetStamps = nextTier?.stamps ?? totalSlots;
  const isReady = membership.currentStamps >= lowestTier.stamps;
  const progress = Math.min(membership.currentStamps / targetStamps, 1);

  const StampIcon = getStampIcon(shop.stampIcon);
  const dotSize = totalSlots <= 10 ? 32 : totalSlots <= 15 ? 27 : totalSlots <= 20 ? 23 : 19;
  const iconSize = Math.round(dotSize * 0.46);

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
      whileTap={{ scale: 0.975 }}
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden"
      style={{
        background: "#141414",
        border: `1px solid #242424`,
        boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
      }}
    >
      {/* Solid colored header — like a real loyalty card */}
      <div className="px-4 py-3 flex items-center justify-between gap-3"
        style={{ background: accent }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
            <StampIcon size={17} color="#fff" />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] font-bold tracking-[0.22em] uppercase text-black/50 leading-none mb-0.5">
              Stempelkarte
            </p>
            <h2 className="text-sm font-bold text-zinc-900 leading-tight truncate">
              {shop.name}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isReady && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/20 text-zinc-900">
              BEREIT
            </span>
          )}
          <ChevronRight size={14} className="text-black/40" />
        </div>
      </div>

      {/* Stamp grid */}
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Array.from({ length: Math.min(totalSlots, 25) }).map((_, i) => {
            const filled = i < membership.currentStamps;
            const isCheckpoint = tierCheckpoints.has(i + 1);
            return (
              <div key={i}
                className="rounded-full flex items-center justify-center"
                style={{
                  width: dotSize, height: dotSize,
                  background: filled
                    ? isCheckpoint ? accent : hexToRgba(accent, 0.22)
                    : "#1e1e1e",
                  border: filled
                    ? `1.5px solid ${isCheckpoint ? accent : hexToRgba(accent, 0.5)}`
                    : isCheckpoint
                      ? `1.5px dashed ${hexToRgba(accent, 0.4)}`
                      : `1px solid #2a2a2a`,
                  boxShadow: filled && isCheckpoint ? `0 0 7px ${hexToRgba(accent, 0.45)}` : undefined,
                }}>
                {filled
                  ? isCheckpoint
                    ? <Trophy size={iconSize} color="#141414" />
                    : <StampIcon size={iconSize} style={{ color: accent }} />
                  : isCheckpoint
                    ? <Gift size={iconSize - 1} style={{ color: hexToRgba(accent, 0.45) }} />
                    : null
                }
              </div>
            );
          })}
          {totalSlots > 25 && (
            <span className="text-[10px] self-center ml-0.5" style={{ color: hexToRgba(accent, 0.5) }}>
              +{totalSlots - 25}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-neutral-500">
              {membership.currentStamps} / {targetStamps} · {nextTier?.text ?? lowestTier.text}
            </span>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: accent }}>
              {Math.round(progress * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-zinc-800">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.7, delay: index * 0.07 + 0.2 }}
              className="h-full rounded-full"
              style={{ background: accent }}
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────

function SettingsPanel({
  customerName, qrToken, accent, onAccentChange, onClose,
}: {
  customerName: string;
  qrToken: string;
  accent: string;
  onAccentChange: (c: string) => void;
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
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
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
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Deine Farbe <span className="normal-case font-normal text-zinc-600">(nur für deine Übersicht)</span>
          </label>
          <div className="grid grid-cols-4 gap-2.5">
            {COLOR_PRESETS.map(({ name: colorName, value }) => (
              <button key={value} onClick={() => onAccentChange(value)}
                className="flex flex-col items-center gap-1.5"
                title={colorName}
              >
                <div className="w-full aspect-square rounded-xl transition-all flex items-center justify-center"
                  style={{
                    background: value,
                    border: accent === value ? `2.5px solid white` : `2px solid transparent`,
                    boxShadow: accent === value ? `0 0 12px ${hexToRgba(value, 0.6)}` : undefined,
                    opacity: accent === value ? 1 : 0.7,
                  }}>
                  {accent === value && <Check size={14} className="text-zinc-900" strokeWidth={3} />}
                </div>
                <span className="text-[9px] text-zinc-500">{colorName}</span>
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
  const [personalAccent, setPersonalAccent] = useState("#fbbf24");
  const prevStampsRef = useRef<Record<string, number>>({});
  const isFirstLoad = useRef(true);
  const didRedirect = useRef(false);

  useEffect(() => {
    setMounted(true);
    setQrToken(localStorage.getItem("qrToken"));
    const stored = localStorage.getItem("meAccentColor");
    if (stored) setPersonalAccent(stored);
  }, []);

  const handleAccentChange = useCallback((color: string) => {
    setPersonalAccent(color);
    localStorage.setItem("meAccentColor", color);
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

  if (allMemberships.length === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  const { customer } = data;

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

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            customerName={customer.name}
            qrToken={qrToken}
            accent={personalAccent}
            onAccentChange={handleAccentChange}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-7">
        <div>
          <p className="text-neutral-500 text-sm">Hallo,</p>
          <h1 className="text-2xl font-bold mt-0.5 bg-clip-text text-transparent"
            style={{ backgroundImage: `linear-gradient(90deg, ${personalAccent}, ${hexToRgba(personalAccent, 0.6)})` }}>
            {customer.name}
          </h1>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mt-1"
        >
          <Settings size={16} className="text-zinc-500" />
        </motion.button>
      </motion.div>

      {/* Shop list */}
      <div className="space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-600 ml-1 mb-2">
          Deine Karten
        </p>
        {allMemberships.map((entry, i) => (
          <ShopCard
            key={entry.membership._id}
            entry={entry}
            index={i}
            personalAccent={personalAccent}
            onClick={() => router.push(`/me/shop/${entry.shop?.slug ?? ""}`)}
          />
        ))}
      </div>
    </div>
  );
}
