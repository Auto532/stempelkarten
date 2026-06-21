"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UserPlus, Stamp, Gift, ScanLine } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false, loading: () => <div className="aspect-square bg-zinc-900 rounded-2xl animate-pulse" /> }
);

type ActionState =
  | { type: "idle" }
  | { type: "stamped"; customerName: string; newStamps: number; stampsRequired: number; rewardReached: boolean; rewardText: string }
  | { type: "redeemed"; customerName: string; rewardText: string };

function CustomerCard({ shopId, qrToken, stampsRequired, rewardText, bonusProgramEnabled, adminToken, onDone }: {
  shopId: Id<"shops">; qrToken: string; stampsRequired: number; rewardText: string; bonusProgramEnabled: boolean; adminToken: string; onDone: () => void;
}) {
  const data = useQuery(api.memberships.getForCustomerAndShop, { qrToken, shopId });
  const addStamp = useMutation(api.memberships.addStamp);
  const redeemReward = useMutation(api.memberships.redeemReward);
  const createMembership = useMutation(api.memberships.createMembershipForExistingCustomer);
  const [actionState, setActionState] = useState<ActionState>({ type: "idle" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (data === undefined) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-zinc-500 text-sm">
          Suche Kunden...
        </motion.div>
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-red-900 rounded-2xl p-6 text-center space-y-4">
        <p className="text-red-400 text-sm">Kein Kunde mit diesem QR-Code gefunden</p>
        <button onClick={onDone} className="w-full py-3 bg-zinc-800 text-zinc-300 rounded-xl text-sm">Zurück zum Scanner</button>
      </motion.div>
    );
  }

  const { customer, membership } = data;

  if (actionState.type === "stamped") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${actionState.rewardReached ? "bg-amber-400" : "bg-green-500"}`}>
            {actionState.rewardReached ? <Gift size={36} className="text-zinc-900" /> : <Stamp size={36} className="text-white" />}
          </div>
        </motion.div>
        <div>
          <h2 className="text-xl font-bold">{actionState.rewardReached ? "Belohnung erreicht! 🎉" : "Stempel gesetzt!"}</h2>
          <p className="text-zinc-400 text-sm mt-1">
            {actionState.customerName} · {actionState.newStamps}/{actionState.stampsRequired} Stempel
          </p>
          {actionState.rewardReached && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mt-3 bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2">
              <p className="text-amber-400 text-sm font-medium">{actionState.rewardText}</p>
            </motion.div>
          )}
        </div>
        <button onClick={onDone} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors">
          Nächsten Kunden scannen
        </button>
      </motion.div>
    );
  }

  if (actionState.type === "redeemed") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-5">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
          <div className="w-20 h-20 rounded-full bg-amber-400 mx-auto flex items-center justify-center">
            <Gift size={36} className="text-zinc-900" />
          </div>
        </motion.div>
        <div>
          <h2 className="text-xl font-bold">Belohnung eingelöst! 🏆</h2>
          <p className="text-zinc-400 text-sm mt-1">{actionState.customerName} erhält:</p>
          <p className="text-amber-400 font-semibold mt-1">{actionState.rewardText}</p>
        </div>
        <button onClick={onDone} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors">
          Nächsten Kunden scannen
        </button>
      </motion.div>
    );
  }

  if (!membership) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-amber-400">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-zinc-100">{customer.name}</h2>
            <p className="text-zinc-500 text-xs">{customer.phone}</p>
          </div>
        </div>
        <p className="text-zinc-500 text-sm bg-zinc-800 rounded-xl px-4 py-3">
          Noch nicht für diesen Laden registriert.
        </p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button onClick={async () => { try { await createMembership({ qrToken, shopId }); } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); } }}
          className="w-full py-3.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors">
          <UserPlus size={16} /> Für diesen Laden registrieren
        </button>
        <button onClick={onDone} className="w-full py-2 text-zinc-600 hover:text-zinc-400 text-sm">Abbrechen</button>
      </motion.div>
    );
  }

  const rewardReady = membership.currentStamps >= stampsRequired;

  const handleAddStamp = async () => {
    setLoading(true); setError("");
    try {
      const result = await addStamp({ membershipId: membership._id, adminToken });
      setActionState({ type: "stamped", customerName: customer.name, newStamps: membership.currentStamps + 1, stampsRequired: result.stampsRequired, rewardReached: result.rewardReached, rewardText });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setLoading(false); }
  };

  const handleRedeem = async () => {
    setLoading(true); setError("");
    try {
      await redeemReward({ membershipId: membership._id, adminToken });
      setActionState({ type: "redeemed", customerName: customer.name, rewardText });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Customer header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-amber-400 text-lg">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-zinc-100 text-lg">{customer.name}</h2>
            <p className="text-zinc-500 text-xs">{customer.phone}</p>
          </div>
          {rewardReady && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="ml-auto text-xs bg-amber-400 text-zinc-900 font-bold px-2.5 py-1 rounded-full">
              Belohnung!
            </motion.span>
          )}
        </div>

        {/* Stamp dots */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Array.from({ length: stampsRequired }).map((_, i) => (
            <div key={i}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                i < membership.currentStamps ? "bg-amber-400 border-amber-400 text-zinc-900" : "border-zinc-700"
              }`}>
              {i < membership.currentStamps && "✓"}
            </div>
          ))}
        </div>

        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((membership.currentStamps / stampsRequired) * 100, 100)}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-amber-400 rounded-full"
          />
        </div>
        <p className="text-xs text-zinc-500 mt-2">{membership.currentStamps} / {stampsRequired} Stempel</p>
      </div>

      {error && <p className="px-6 pb-2 text-red-400 text-sm">{error}</p>}

      {/* Actions */}
      <div className="px-6 pb-6 space-y-3 pt-2">
        {rewardReady ? (
          <>
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3 text-center mb-1">
              <p className="text-amber-400 text-sm font-semibold">🎉 {rewardText}</p>
            </div>
            {bonusProgramEnabled ? (
              <>
                <button onClick={handleAddStamp} disabled={loading}
                  className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-base">
                  {loading
                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
                    : <><Stamp size={18} /> Stempel hinzufügen (Stufe 2)</>}
                </button>
                <button onClick={handleRedeem} disabled={loading}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
                  <Gift size={16} /> Belohnung einlösen
                </button>
              </>
            ) : (
              <button onClick={handleRedeem} disabled={loading}
                className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-base">
                {loading
                  ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
                  : <><Gift size={18} /> Belohnung einlösen</>}
              </button>
            )}
          </>
        ) : (
          <button onClick={handleAddStamp} disabled={loading}
            className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors text-base">
            {loading
              ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
              : <><Stamp size={18} /> Stempel hinzufügen</>}
          </button>
        )}
        <button onClick={onDone} className="w-full py-2 text-zinc-600 hover:text-zinc-400 text-sm transition-colors">Abbrechen</button>
      </div>
    </motion.div>
  );
}

export default function ScanPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [adminToken, setAdminToken] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const slug = localStorage.getItem("adminShopSlug");
    if (!token || slug !== shopSlug) { router.replace("/"); return; }
    setAdminToken(token);
    setAuthorized(true);
  }, [router, shopSlug]);

  if (!authorized || shop === undefined) {
    return <div className="min-h-screen flex items-center justify-center"><motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-zinc-500 text-sm">Laden...</motion.div></div>;
  }
  if (!shop) return null;

  return (
    <div className="min-h-screen px-5 pt-10 pb-10 max-w-sm mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/betrieb/${shopSlug}`)}
          className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-bold text-zinc-100">{shop.name}</h1>
          <p className="text-xs text-zinc-500">QR-Code scannen</p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!scannedToken ? (
          <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800">
              <Scanner onScan={(codes: IDetectedBarcode[]) => {
                if (codes.length > 0 && !scannedToken) {
                  const raw = codes[0].rawValue;
                  const token = raw.includes("/stamp/") ? raw.split("/stamp/").pop()! : raw;
                  setScannedToken(token);
                }
              }} sound={false} />
              {/* Scan overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-amber-400/40 rounded-2xl" />
                <motion.div
                  animate={{ y: ["0%", "100%", "0%"] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute left-8 right-8 top-8 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
              <ScanLine size={16} />
              <span>Kundencode in den Rahmen halten</span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="customer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CustomerCard
              shopId={shop._id}
              qrToken={scannedToken}
              stampsRequired={shop.stampsRequired}
              rewardText={shop.rewardText}
              bonusProgramEnabled={!!shop.bonusProgramEnabled}
              adminToken={adminToken}
              onDone={() => setScannedToken(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
