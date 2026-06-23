"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Stamp, Gift, UserPlus, ArrowLeft, LogIn, ShieldCheck } from "lucide-react";
import { getShopTheme, DEFAULT_COLORS } from "@/app/me/themes/registry";
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";
import type { Id } from "@/convex/_generated/dataModel";

type Tier = { stamps: number; text: string; enabled: boolean };

function getActiveTiers(shop: { stampsRequired: number; rewardText: string; rewardTiers?: Tier[] }): Tier[] {
  if (shop.rewardTiers && shop.rewardTiers.some(t => t.enabled)) {
    return shop.rewardTiers.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps);
  }
  return [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }];
}

export default function StampPage() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const router = useRouter();

  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [adminRole, setAdminRole] = useState<"inhaber" | "mitarbeiter">("inhaber");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState<"stamped" | "redeemed" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redeemedTierText, setRedeemedTierText] = useState<string | null>(null);

  // Admin mode
  const [adminMode, setAdminMode] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [adminSelectedShopId, setAdminSelectedShopId] = useState<Id<"shops"> | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const slug = localStorage.getItem("adminShopSlug");
    const pin = localStorage.getItem("adminPin");
    if (token && slug) {
      setAdminToken(token);
      setShopSlug(slug);
      setAdminRole((localStorage.getItem("adminRole") as "inhaber" | "mitarbeiter") ?? "inhaber");
      setReady(true);
    } else if (pin) {
      setAdminPin(pin);
      setAdminMode(true);
      setReady(true);
    } else {
      router.replace("/me");
    }
  }, [router]);

  const shop = useQuery(api.shops.getBySlug, shopSlug ? { slug: shopSlug } : "skip");
  const data = useQuery(
    api.memberships.getForCustomerAndShop,
    ready && shop ? { qrToken, shopId: shop._id } : "skip"
  );

  const addStamp = useMutation(api.memberships.addStamp);
  const redeemReward = useMutation(api.memberships.redeemReward);
  const createMembership = useMutation(api.memberships.createMembershipForExistingCustomer);
  const adminStamp = useMutation(api.memberships.adminStampForCustomer);

  // Admin-mode queries
  const allShops = useQuery(api.shops.listAllShops, adminMode && adminPin ? { adminSecret: adminPin } : "skip");
  const adminSelectedShop = useQuery(api.shops.getBySlug,
    adminMode && adminSelectedShopId && allShops
      ? { slug: allShops.find(s => s._id === adminSelectedShopId)?.slug ?? "" }
      : "skip"
  );
  const adminMembershipData = useQuery(api.memberships.getForCustomerAndShop,
    adminMode && adminSelectedShop ? { qrToken, shopId: adminSelectedShop._id } : "skip"
  );
  const customerInfo = useQuery(api.customers.getByQrToken, adminMode ? { qrToken } : "skip");

  useShopThemeSync(shop);

  const handleStamp = async () => {
    if (!data?.membership) return;
    setLoading(true); setError("");
    try {
      await addStamp({ membershipId: data.membership._id, adminToken });
      setDone("stamped");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setLoading(false); }
  };

  const handleRedeem = async (tierText?: string) => {
    if (!data?.membership) return;
    setLoading(true); setError("");
    try {
      await redeemReward({ membershipId: data.membership._id, adminToken, rewardText: tierText });
      setRedeemedTierText(tierText ?? null);
      setDone("redeemed");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setLoading(false); }
  };

  const handleAddToShop = async () => {
    if (!shop) return;
    setLoading(true); setError("");
    try {
      await createMembership({ qrToken, shopId: shop._id });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setLoading(false); }
  };

  const handleAdminStamp = async () => {
    if (!adminSelectedShopId) return;
    setLoading(true); setError("");
    try {
      await adminStamp({ adminSecret: adminPin, shopId: adminSelectedShopId, qrToken });
      setDone("stamped");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setLoading(false); }
  };

  // ── Admin-Modus UI ────────────────────────────────────────────────────────
  if (adminMode && ready) {
    if (done === "stamped") {
      const shopName = allShops?.find(s => s._id === adminSelectedShopId)?.name ?? "";
      const newStamps = (adminMembershipData?.membership?.currentStamps ?? 0) + 1;
      const stampsRequired = adminSelectedShop?.stampsRequired ?? 0;
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center gap-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
            <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto">
              <Stamp size={44} className="text-white" />
            </div>
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Gestempelt!</h1>
            <p className="text-zinc-400 mt-1">{customerInfo?.name ?? "Kunde"} · {shopName}</p>
            <p className="text-zinc-500 text-sm mt-1">{newStamps} / {stampsRequired} Stempel</p>
          </div>
          <button onClick={() => { setDone(null); setAdminSelectedShopId(null); }}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            <ArrowLeft size={15} /> Weiterer Stempel
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-zinc-950 px-5 pt-10 pb-10 max-w-sm mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Admin-Modus</p>
            <h1 className="font-bold text-zinc-100 leading-tight">Stempel vergeben</h1>
          </div>
        </div>

        {/* Kundeninfo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-amber-400 shrink-0">
            {customerInfo ? customerInfo.name.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <p className="font-bold text-zinc-100">{customerInfo?.name ?? "Laden..."}</p>
            <p className="text-xs text-zinc-500">{customerInfo?.phone || "Kein Telefon"}</p>
          </div>
        </div>

        {/* Shop-Auswahl */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-200">Shop auswählen</p>
          {!allShops ? (
            <p className="text-xs text-zinc-600">Laden...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allShops.map(s => (
                <button key={s._id} onClick={() => setAdminSelectedShopId(s._id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                  style={adminSelectedShopId === s._id
                    ? { background: "#fbbf2433", border: "1px solid #fbbf2488", color: "#fbbf24" }
                    : { background: "#27272a", border: "1px solid #3f3f46", color: "#71717a" }
                  }>
                  {s.name}
                </button>
              ))}
            </div>
          )}
          {adminSelectedShop && adminMembershipData?.membership && (
            <p className="text-xs text-zinc-500">
              Aktuell: {adminMembershipData.membership.currentStamps} / {adminSelectedShop.stampsRequired} Stempel
            </p>
          )}
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button onClick={handleAdminStamp} disabled={!adminSelectedShopId || loading}
          className="w-full py-5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-900 font-bold rounded-2xl flex items-center justify-center gap-3 text-lg transition-colors">
          {loading ? <Spinner /> : <><Stamp size={22} /> Stempel geben</>}
        </button>
      </div>
    );
  }

  if (!ready || !shop || data === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  if (!shopSlug) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center gap-5">
        <LogIn size={40} className="text-zinc-600" />
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Nicht eingeloggt</h1>
          <p className="text-zinc-500 text-sm mt-1">Nur für Betriebe zugänglich.</p>
        </div>
        <button onClick={() => router.replace("/me")}
          className="px-6 py-3 bg-amber-400 text-zinc-900 font-semibold rounded-2xl">
          Zur Stempelkarte
        </button>
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center gap-5">
        <p className="text-red-400">Kein Kunde mit diesem QR-Code gefunden.</p>
        <button onClick={() => router.back()} className="text-zinc-500 text-sm">Zurück</button>
      </div>
    );
  }

  const { customer, membership } = data;
  const currentStamps = membership?.currentStamps ?? 0;
  const activeTiers = shop.bonusProgramEnabled
    ? getActiveTiers(shop)
    : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }];
  const maxStamps = activeTiers[activeTiers.length - 1].stamps;

  const exactTier = activeTiers.find(t => currentStamps === t.stamps);
  const nextTierUp = exactTier ? activeTiers.find(t => t.stamps > exactTier.stamps) : undefined;
  const topTier = activeTiers[activeTiers.length - 1];
  const atTopTier = currentStamps >= topTier.stamps;

  const showTierChoice = !!membership && !!exactTier && !!nextTierUp;
  const showRedeem = !!membership && atTopTier && !nextTierUp;
  const rewardReady = showTierChoice || showRedeem;

  if (done === "stamped") {
    const newStamps = currentStamps + 1;
    const landedOnTier = activeTiers.find(t => newStamps === t.stamps);
    const landedNextTier = landedOnTier ? activeTiers.find(t => t.stamps > landedOnTier.stamps) : undefined;
    const landedOnTop = newStamps >= topTier.stamps;
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${landedOnTop ? "bg-amber-400" : landedOnTier ? "bg-amber-400" : "bg-green-500"}`}>
            {(landedOnTop || landedOnTier) ? <Gift size={44} className="text-zinc-900" /> : <Stamp size={44} className="text-white" />}
          </div>
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {landedOnTop ? "Belohnung erreicht! 🎉" : landedOnTier ? "Stufe erreicht! ✨" : "Stempel gesetzt!"}
          </h1>
          <p className="text-zinc-400 mt-1">{customer.name} · {newStamps}/{maxStamps}</p>
          {landedOnTier && !landedOnTop && landedNextTier && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-zinc-400 text-sm mt-2">
              Beim nächsten Scan: einlösen oder weiter zu {landedNextTier.stamps} Stempeln
            </motion.p>
          )}
          {landedOnTop && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-amber-400 font-semibold mt-2">{topTier.text}</motion.p>
          )}
        </div>
        <button onClick={() => router.replace(adminRole === "mitarbeiter" ? `/betrieb/${shopSlug}/scan` : `/betrieb/${shopSlug}`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          <ArrowLeft size={15} /> Zurück zur Übersicht
        </button>
      </div>
    );
  }

  if (done === "redeemed") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <div className="w-24 h-24 rounded-full bg-amber-400 flex items-center justify-center mx-auto">
            <Gift size={44} className="text-zinc-900" />
          </div>
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Belohnung eingelöst! 🏆</h1>
          <p className="text-zinc-400 mt-1">{customer.name} erhält:</p>
          <p className="text-amber-400 font-semibold mt-1">{redeemedTierText ?? shop.rewardText}</p>
        </div>
        <button onClick={() => router.replace(adminRole === "mitarbeiter" ? `/betrieb/${shopSlug}/scan` : `/betrieb/${shopSlug}`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          <ArrowLeft size={15} /> Zurück zur Übersicht
        </button>
      </div>
    );
  }

  const theme = getShopTheme(shop);
  const c = theme?.colors ?? DEFAULT_COLORS;

  return (
    <div className={`min-h-screen px-5 pt-10 pb-10 max-w-sm mx-auto flex flex-col gap-5 ${theme ? "relative z-[2]" : "bg-zinc-950"}`}>
      {theme && <theme.Background />}

      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 relative z-10">
        <button onClick={() => router.replace(adminRole === "mitarbeiter" ? `/betrieb/${shopSlug}/scan` : `/betrieb/${shopSlug}`)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={theme ? { background: c.cardBg, border: c.card.border, color: c.accent } : undefined}
        >
          <ArrowLeft size={18} className={theme ? "" : "text-zinc-400"} />
        </button>
        <div>
          <p className="text-xs" style={{ color: c.accentDim }}>{shop.name}</p>
          <h1 className="font-bold leading-tight" style={{ color: c.text }}>Stempel vergeben</h1>
        </div>
        {rewardReady && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="ml-auto text-xs bg-amber-400 text-zinc-900 font-bold px-2.5 py-1 rounded-full shrink-0">
            {showTierChoice ? "Wahl!" : "Belohnung!"}
          </motion.span>
        )}
      </motion.div>

      {/* Customer name */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-2xl px-5 py-4 flex items-center gap-3 relative z-10"
        style={c.card}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
          style={theme
            ? { background: `radial-gradient(circle at 35% 35%, ${c.dark}, ${c.cardBg})`, border: `1px solid ${c.accent}44`, color: c.accent }
            : { background: "#27272a", color: "#fbbf24" }}>
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-bold" style={{ color: c.text }}>{customer.name}</p>
          <p className="text-xs truncate" style={{ color: c.accentDim }}>{customer.phone}</p>
        </div>
      </motion.div>

      {/* Mini Stempel-Übersicht */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl px-5 py-4 relative z-10" style={c.card}>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-semibold" style={{ color: c.text }}>{shop.name}</p>
          <p className="text-sm font-bold" style={{ color: c.accent }}>
            {currentStamps} / {maxStamps} Stempel
          </p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.dark }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(currentStamps / maxStamps * 100, 100)}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full"
            style={{ background: c.gradient }}
          />
        </div>
        {!rewardReady && (() => {
          const next = activeTiers.find(t => t.stamps > currentStamps);
          return next
            ? <p className="text-[11px] mt-2" style={{ color: c.accentDim }}>noch {next.stamps - currentStamps} bis: {next.text}</p>
            : null;
        })()}
      </motion.div>

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {/* Action */}
      <AnimatePresence mode="wait">
        {!membership ? (
          <motion.div key="no-member" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-sm text-zinc-500 text-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              Noch nicht für {shop.name} registriert.
            </p>
            <button onClick={handleAddToShop} disabled={loading}
              className="w-full py-4 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-100 font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors text-base">
              <UserPlus size={18} /> Zum Laden hinzufügen
            </button>
          </motion.div>

        ) : showTierChoice ? (
          <motion.div key="choice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-zinc-400 mb-1">
                Stufe {activeTiers.indexOf(exactTier!) + 1} von {activeTiers.length} erreicht
              </p>
              <p className="text-amber-400 font-semibold">{exactTier!.text}</p>
            </div>
            <button onClick={handleStamp} disabled={loading}
              className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-bold rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-colors">
              {loading ? <Spinner /> : (
                <>
                  <span className="text-base">Weiter zu Stufe {activeTiers.indexOf(nextTierUp!) + 1}</span>
                  <span className="text-xs text-zinc-900/60 font-normal">{nextTierUp!.stamps} Stempel → {nextTierUp!.text}</span>
                </>
              )}
            </button>
            <button onClick={() => handleRedeem(exactTier!.text)} disabled={loading}
              className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 text-zinc-500 font-medium rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
              {loading ? <Spinner /> : <><Gift size={15} /> Jetzt einlösen</>}
            </button>
          </motion.div>

        ) : showRedeem ? (
          <motion.div key="reward" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3 text-center">
              <p className="text-amber-400 font-semibold">🎉 {topTier.text}</p>
            </div>
            <button onClick={handleStamp} disabled={loading}
              className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors text-base">
              {loading ? <Spinner /> : <><Stamp size={20} /> Stempel geben</>}
            </button>
            <button onClick={() => handleRedeem(topTier.text)} disabled={loading}
              className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 text-zinc-400 font-medium rounded-2xl flex items-center justify-center gap-2 transition-colors text-sm">
              {loading ? <Spinner /> : <><Gift size={15} /> Jetzt einlösen</>}
            </button>
          </motion.div>

        ) : (
          <motion.button key="stamp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            onClick={handleStamp} disabled={loading}
            whileTap={{ scale: 0.97 }}
            className="w-full py-5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-bold rounded-2xl flex items-center justify-center gap-3 transition-colors text-lg">
            {loading ? <Spinner /> : <><Stamp size={22} /> Stempel geben</>}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function Spinner() {
  return (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
  );
}
