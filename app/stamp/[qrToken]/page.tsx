"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Stamp, Gift, UserPlus, ArrowLeft, LogIn } from "lucide-react";

export default function StampPage() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const router = useRouter();

  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState<"stamped" | "redeemed" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const adminToken = localStorage.getItem("adminToken");
    const slug = localStorage.getItem("adminShopSlug");
    if (!adminToken || !slug) {
      // Kunde hat die URL geöffnet → zu /me
      router.replace("/me");
      return;
    }
    setShopSlug(slug);
    setReady(true);
  }, [router]);

  const shop = useQuery(api.shops.getBySlug, shopSlug ? { slug: shopSlug } : "skip");
  const data = useQuery(
    api.memberships.getForCustomerAndShop,
    ready && shop ? { qrToken, shopId: shop._id } : "skip"
  );

  const addStamp = useMutation(api.memberships.addStamp);
  const redeemReward = useMutation(api.memberships.redeemReward);
  const createMembership = useMutation(api.memberships.createMembershipForExistingCustomer);

  const handleStamp = async () => {
    if (!data?.membership) return;
    setLoading(true); setError("");
    try {
      await addStamp({ membershipId: data.membership._id });
      setDone("stamped");
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setLoading(false); }
  };

  const handleRedeem = async () => {
    if (!data?.membership) return;
    setLoading(true); setError("");
    try {
      await redeemReward({ membershipId: data.membership._id });
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

  // Loading
  if (!ready || !shop || data === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  // Kein Betrieb-Login
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

  // Kein Kunde gefunden
  if (!data?.customer) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center gap-5">
        <p className="text-red-400">Kein Kunde mit diesem QR-Code gefunden.</p>
        <button onClick={() => router.back()} className="text-zinc-500 text-sm">Zurück</button>
      </div>
    );
  }

  const { customer, membership } = data;
  const stampsRequired = shop.stampsRequired;
  const currentStamps = membership?.currentStamps ?? 0;
  const rewardReady = !!membership && currentStamps >= stampsRequired;

  // Erfolg: Stempel gesetzt
  if (done === "stamped") {
    const newStamps = currentStamps + 1;
    const nowRewardReady = newStamps >= stampsRequired;
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${nowRewardReady ? "bg-amber-400" : "bg-green-500"}`}>
            {nowRewardReady ? <Gift size={44} className="text-zinc-900" /> : <Stamp size={44} className="text-white" />}
          </div>
        </motion.div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {nowRewardReady ? "Belohnung erreicht! 🎉" : "Stempel gesetzt!"}
          </h1>
          <p className="text-zinc-400 mt-1">{customer.name} · {newStamps}/{stampsRequired}</p>
          {nowRewardReady && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-amber-400 font-semibold mt-2">{shop.rewardText}</motion.p>
          )}
        </div>
        <button onClick={() => router.push(`/betrieb/${shopSlug}`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          <ArrowLeft size={15} /> Zurück zum Dashboard
        </button>
      </div>
    );
  }

  // Erfolg: Belohnung eingelöst
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
          <p className="text-amber-400 font-semibold mt-1">{shop.rewardText}</p>
        </div>
        <button onClick={() => router.push(`/betrieb/${shopSlug}`)}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          <ArrowLeft size={15} /> Zurück zum Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-5 pt-10 pb-10 max-w-sm mx-auto flex flex-col gap-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
        <button onClick={() => router.push(`/betrieb/${shopSlug}`)}
          className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <p className="text-xs text-zinc-500">{shop.name}</p>
          <h1 className="font-bold text-zinc-100 leading-tight">Stempel vergeben</h1>
        </div>
      </motion.div>

      {/* Customer card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-amber-400 shrink-0">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-zinc-100 text-lg">{customer.name}</p>
            <p className="text-xs text-zinc-500 truncate">{customer.phone}</p>
          </div>
          {rewardReady && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="text-xs bg-amber-400 text-zinc-900 font-bold px-2.5 py-1 rounded-full shrink-0">
              Belohnung!
            </motion.span>
          )}
        </div>

        {/* Stamp dots */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: stampsRequired }).map((_, i) => (
            <div key={i}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                i < currentStamps ? "bg-amber-400 border-amber-400 text-zinc-900" : "border-zinc-700 bg-zinc-800/50"
              }`}>
              {i < currentStamps && "✓"}
            </div>
          ))}
        </div>

        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((currentStamps / stampsRequired) * 100, 100)}%` }}
            transition={{ duration: 0.6 }} className="h-full bg-amber-400 rounded-full" />
        </div>
        <p className="text-xs text-zinc-500">{currentStamps} / {stampsRequired} Stempel</p>
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
        ) : rewardReady ? (
          <motion.div key="reward" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3 text-center">
              <p className="text-amber-400 font-semibold">🎉 {shop.rewardText}</p>
            </div>
            <button onClick={handleRedeem} disabled={loading}
              className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors text-base">
              {loading ? <Spinner /> : <><Gift size={20} /> Belohnung einlösen</>}
            </button>
            <button onClick={handleStamp} disabled={loading}
              className="w-full py-2.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
              Stempel hinzufügen (ohne einlösen)
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
