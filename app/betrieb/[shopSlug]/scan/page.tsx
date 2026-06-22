"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, UserPlus, Stamp, Gift, ScanLine,
  Users, ChevronRight, Award, X, QrCode, Phone, Eye,
  Printer, Search, Check,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { LoyaltyCard } from "@/app/me/components";
import type { CardTier } from "@/app/me/components";
import { VintageBackground, VintageLoyaltyCard, VintageRewardBanner } from "@/app/me/themes/vintage";
import { QRImage } from "@/app/components/QRImage";
import QRCode from "qrcode";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false, loading: () => <div className="aspect-square bg-zinc-900 rounded-2xl animate-pulse" /> }
);

async function printQR(shopName: string, url: string) {
  const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  const w = window.open("", "_blank", "width=520,height=640");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${shopName} – QR Code</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;font-family:-apple-system,sans-serif;gap:20px;padding:40px;text-align:center}img{width:300px;height:300px}h2{font-size:24px;font-weight:700;color:#111}p{font-size:14px;color:#555}.url{font-size:11px;color:#aaa;font-family:monospace;margin-top:4px;word-break:break-all}</style>
  </head><body>
  <h2>${shopName}</h2>
  <img src="${dataUrl}" alt="QR Code" />
  <div><p>Digitale Stempelkarte</p><p class="url">${url}</p></div>
  <script>setTimeout(()=>window.print(),400)</script>
  </body></html>`);
  w.document.close();
}

type ActionState =
  | { type: "idle" }
  | { type: "stamped"; customerName: string; newStamps: number; stampsRequired: number; rewardReached: boolean; rewardText: string }
  | { type: "redeemed"; customerName: string; rewardText: string };

type ScanShop = {
  _id: Id<"shops">;
  name: string;
  slug: string;
  stampsRequired: number;
  rewardText: string;
  bonusProgramEnabled?: boolean;
  customDesignEnabled?: boolean;
  accentColor?: string;
  stampIcon?: string | null;
  rewardTiers?: CardTier[];
  theme?: string;
  showLeads?: boolean;
  milestonesEnabled?: boolean;
};

// ─── CustomerCard ─────────────────────────────────────────────────────────────

function CustomerCard({ shopId, shop, qrToken, adminToken, onDone }: {
  shopId: Id<"shops">; shop: ScanShop; qrToken: string; adminToken: string; onDone: () => void;
}) {
  const { stampsRequired, rewardText, bonusProgramEnabled } = shop;
  const isVintage = !!shop.customDesignEnabled && shop.theme === "vintage";
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

  const vintageCard = isVintage
    ? { background: "#130A04", border: "1px solid #7A5C1244" }
    : { background: "#18181b", border: "1px solid #27272a" };

  if (actionState.type === "stamped") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-8 text-center space-y-5" style={vintageCard}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${actionState.rewardReached ? "bg-amber-400" : "bg-green-500"}`}>
            {actionState.rewardReached ? <Gift size={36} className="text-zinc-900" /> : <Stamp size={36} className="text-white" />}
          </div>
        </motion.div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: isVintage ? "#E8D070" : undefined }}>
            {actionState.rewardReached ? "Belohnung erreicht! 🎉" : "Stempel gesetzt!"}
          </h2>
          <p className="text-sm mt-1" style={{ color: isVintage ? "#7A5C12" : "#a1a1aa" }}>
            {actionState.customerName} · {actionState.newStamps}/{actionState.stampsRequired} Stempel
          </p>
          {actionState.rewardReached && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="mt-3 bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2">
              <p className="text-amber-400 text-sm font-medium">{actionState.rewardText}</p>
            </motion.div>
          )}
        </div>
        <button onClick={onDone}
          className={isVintage ? "w-full py-3.5 rounded-xl font-medium transition-colors" : "w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors"}
          style={isVintage ? { background: "#1C0E06", border: "1px solid #7A5C1244", color: "#C8A86A" } : undefined}>
          Nächsten Kunden scannen
        </button>
      </motion.div>
    );
  }

  if (actionState.type === "redeemed") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-8 text-center space-y-5" style={vintageCard}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
          <div className="w-20 h-20 rounded-full bg-amber-400 mx-auto flex items-center justify-center">
            <Gift size={36} className="text-zinc-900" />
          </div>
        </motion.div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: isVintage ? "#E8D070" : undefined }}>Belohnung eingelöst! 🏆</h2>
          <p className="text-sm mt-1" style={{ color: isVintage ? "#7A5C12" : "#a1a1aa" }}>{actionState.customerName} erhält:</p>
          <p className="text-amber-400 font-semibold mt-1">{actionState.rewardText}</p>
        </div>
        <button onClick={onDone}
          className={isVintage ? "w-full py-3.5 rounded-xl font-medium transition-colors" : "w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors"}
          style={isVintage ? { background: "#1C0E06", border: "1px solid #7A5C1244", color: "#C8A86A" } : undefined}>
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

      {/* Customer header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-amber-400 text-lg">
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-zinc-100">{customer.name}</h2>
          <p className="text-zinc-500 text-xs">{customer.phone}</p>
        </div>
        {rewardReady && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="text-xs bg-amber-400 text-zinc-900 font-bold px-2.5 py-1 rounded-full">
            Belohnung!
          </motion.span>
        )}
      </div>

      {/* Card preview */}
      {shop.customDesignEnabled ? (
        isVintage ? (
          <div className="space-y-3 relative z-10">
            <VintageLoyaltyCard
              shopName={shop.name}
              stampsRequired={stampsRequired}
              currentStamps={membership.currentStamps}
              animateIndex={null}
              onShowQR={() => {}}
              qrToken={qrToken}
              hideQR
            />
            <VintageRewardBanner
              rewardText={rewardText}
              stampsRequired={stampsRequired}
              rewardTiers={shop.rewardTiers}
            />
          </div>
        ) : (
          <LoyaltyCard
            shopName={shop.name}
            rewardText={rewardText}
            stampsRequired={stampsRequired}
            currentStamps={membership.currentStamps}
            rewardsRedeemed={membership.rewardsRedeemed}
            animateIndex={null}
            onShowQR={() => {}}
            qrToken={qrToken}
            rewardTiers={shop.rewardTiers}
            accentColor={shop.accentColor}
            stampIcon={shop.stampIcon}
            hideQR
          />
        )
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-5">
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
      )}

      {error && <p className="text-red-400 text-sm px-1">{error}</p>}

      {/* Actions */}
      <div className="space-y-3">
        {rewardReady ? (
          <>
            <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3 text-center">
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ScanPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });
  const [authorized, setAuthorized] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [view, setView] = useState<"dashboard" | "scanning">("dashboard");
  const [scannedToken, setScannedToken] = useState<string | null>(null);
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [showAllRedemptions, setShowAllRedemptions] = useState(false);
  const customers = useQuery(
    api.shops.listCustomersForShop,
    shop && adminToken ? { shopId: shop._id, adminToken, limit: showAllCustomers ? undefined : 10 } : "skip"
  );
  const redemptions = useQuery(
    api.memberships.getRedemptionsForShop,
    shop?.bonusProgramEnabled && shop && adminToken ? { shopId: shop._id, adminToken, limit: showAllRedemptions ? undefined : 10 } : "skip"
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [showCustomers, setShowCustomers] = useState(true);
  const [openRedemptionId, setOpenRedemptionId] = useState<string | null>(null);

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

  const showLeads = false; // Mitarbeiter sehen nie Leads/Telefonnummern
  const isVintage = !!shop.customDesignEnabled && shop.theme === "vintage";
  const totalStamps = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
  const totalRewards = customers?.reduce((s, c) => s + c.membership.rewardsRedeemed, 0) ?? 0;
  const activeTiers = shop.bonusProgramEnabled && shop.rewardTiers && shop.rewardTiers.some(t => t.enabled)
    ? shop.rewardTiers.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps)
    : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }];
  const lowestTierStamps = activeTiers[0].stamps;
  const filteredCustomers = customers?.filter(({ customer }) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return customer?.name.toLowerCase().includes(q) || (showLeads && customer?.phone.includes(q));
  }) ?? [];
  const readyCount = customers?.filter(({ membership }) => membership.currentStamps >= lowestTierStamps).length ?? 0;

  // ── Scanner view ────────────────────────────────────────────────────────────
  if (view === "scanning") {
    return (
      <div className={`min-h-screen px-5 pt-10 pb-10 max-w-sm mx-auto ${isVintage ? "relative z-[2]" : ""}`}>
        {isVintage && <VintageBackground />}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setScannedToken(null); setView("dashboard"); }}
            className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
          >
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
                shop={shop as ScanShop}
                qrToken={scannedToken}
                adminToken={adminToken}
                onDone={() => setScannedToken(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Dashboard view ──────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen px-5 pt-12 pb-10 max-w-sm mx-auto space-y-6 ${isVintage ? "relative z-[2]" : ""}`}>
      {isVintage && <VintageBackground />}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Mitarbeiter</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">{shop.name}</h1>
      </motion.div>

      {/* Scan Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setView("scanning")}
        className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-900 rounded-2xl p-5 flex items-center gap-4 transition-colors"
      >
        <div className="w-12 h-12 bg-zinc-900/20 rounded-xl flex items-center justify-center shrink-0">
          <ScanLine size={24} />
        </div>
        <div className="text-left">
          <p className="font-bold text-lg leading-tight">Kunden scannen</p>
          <p className="text-zinc-900/60 text-sm">Stempel vergeben</p>
        </div>
        <ChevronRight size={20} className="ml-auto opacity-60" />
      </motion.button>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-3 gap-3">
        {[
          { label: "Kunden", value: customers?.length ?? "–", icon: Users },
          { label: "Stempel", value: totalStamps, icon: Stamp },
          { label: "Belohnungen", value: totalRewards, icon: Award },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <Icon size={18} className="text-amber-400 mx-auto mb-2" />
            <p className="text-xl font-bold text-zinc-100">{value}</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Join QR */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode size={16} className="text-zinc-400" />
          <span className="font-medium text-zinc-200 text-sm">Kunden-QR-Code</span>
        </div>
        <div className="flex justify-center">
          <QRImage value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${shopSlug}`} size={160} />
        </div>
        <p className="text-center text-xs text-zinc-500">
          Neue Kunden können diesen Code scannen um sich zu registrieren
        </p>
        <button
          onClick={() => printQR(shop.name, `${window.location.origin}/join/${shopSlug}`)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors"
        >
          <Printer size={15} className="text-amber-400" />
          Drucken / Druckvorschau
        </button>
      </motion.div>

      {/* Treue Bonus */}
      <AnimatePresence>
        {shop.bonusProgramEnabled && (
          <motion.div key="gifts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <button onClick={() => setShowGifts(v => !v)}
              className="w-full flex items-center gap-2 px-5 py-4 hover:bg-zinc-800/30 transition-colors">
              <Gift size={15} className="text-amber-400 shrink-0" />
              <span className="font-medium text-zinc-200 text-sm flex-1 text-left">Treue Bonus</span>
              {redemptions && redemptions.length > 0 && (
                <span className="text-xs text-zinc-600 mr-1">{redemptions.length}</span>
              )}
              <ChevronRight size={13} className={`text-zinc-600 transition-transform ${showGifts ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {showGifts && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="divide-y divide-zinc-800/40 max-h-[320px] overflow-y-auto">
                    {redemptions === undefined && <div className="px-5 py-6 text-center text-zinc-600 text-sm">Laden…</div>}
                    {redemptions?.length === 0 && <div className="px-5 py-6 text-center text-zinc-600 text-sm">Noch keine Geschenke vergeben</div>}
                    {redemptions?.map((r) => {
                      const isOpen = openRedemptionId === r._id;
                      return (
                        <div key={r._id}>
                          <button onClick={() => setOpenRedemptionId(isOpen ? null : r._id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left">
                            <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/20 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-amber-400">{r.customerName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-200 truncate">{r.customerName}</p>
                              <p className="text-xs text-amber-400/80 truncate">{r.rewardText ?? shop.rewardText}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className="text-[11px] text-zinc-600">
                                {new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                              </p>
                              <ChevronRight size={13} className={`text-zinc-700 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            </div>
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="mx-4 mb-3 bg-zinc-800/70 rounded-xl p-3 space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-zinc-500">Belohnung</span>
                                    <span className="text-xs font-semibold text-amber-400">{r.rewardText ?? shop.rewardText}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-zinc-500">Datum</span>
                                    <span className="text-xs text-zinc-300">
                                      {new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-zinc-500">Uhrzeit</span>
                                    <span className="text-xs text-zinc-300">
                                      {new Date(r.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                  {redemptions && redemptions.length >= 10 && (
                    <button onClick={() => setShowAllRedemptions(v => !v)}
                      className="w-full py-3 text-xs text-zinc-500 hover:text-amber-400 transition-colors border-t border-zinc-800/60">
                      {showAllRedemptions ? "Weniger anzeigen" : "Alle anzeigen"}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer List */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <button onClick={() => setShowCustomers(v => !v)}
          className="w-full flex items-center gap-2 px-5 py-4 hover:bg-zinc-800/30 transition-colors">
          <Users size={15} className="text-zinc-400 shrink-0" />
          <span className="font-medium text-zinc-200 text-sm">Kunden</span>
          {showLeads && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400">
              <Eye size={10} /> Leads
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {readyCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] bg-amber-400/10 border border-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full">
                <Gift size={9} /> {readyCount} bereit
              </span>
            )}
            <span className="text-xs text-zinc-600">{customers?.length ?? "–"}</span>
            <ChevronRight size={13} className={`text-zinc-600 transition-transform ${showCustomers ? "rotate-90" : ""}`} />
          </div>
        </button>

        <AnimatePresence>
          {showCustomers && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-5 pt-1 pb-3 border-b border-zinc-800">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Suchen…"
                    className="w-full pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center px-4 py-2 border-b border-zinc-800/60">
                <div className="w-7 shrink-0 mr-3" />
                <span className="flex-1 text-[10px] text-zinc-600 uppercase tracking-wider">Kunde</span>
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider w-10 text-right mr-1">Stand</span>
                {showLeads && <div className="w-4" />}
              </div>

              <div className="divide-y divide-zinc-800/40">
                {customers === undefined && <div className="px-5 py-6 text-center text-zinc-600 text-sm">Laden...</div>}
                {customers?.length === 0 && <div className="px-5 py-6 text-center text-zinc-600 text-sm">Noch keine Kunden</div>}
                {customers !== undefined && filteredCustomers.length === 0 && search && (
                  <div className="px-5 py-6 text-center text-zinc-600 text-sm">Keine Treffer für „{search}"</div>
                )}
                {filteredCustomers.map(({ customer, membership }, i) => {
                  if (!customer) return null;
                  const isSelected = selectedCustomerId === customer._id;
                  const isReady = membership.currentStamps >= lowestTierStamps;
                  return (
                    <motion.div key={membership._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}>
                      <button
                        onClick={() => showLeads ? setSelectedCustomerId(isSelected ? null : customer._id) : undefined}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${showLeads ? "hover:bg-zinc-800/50 cursor-pointer" : "cursor-default"}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isReady ? "bg-amber-400 text-zinc-900" : "bg-zinc-800 text-amber-400 border border-zinc-700"
                        }`}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-sm text-zinc-200 truncate">{customer.name}</span>
                        {isReady && (
                          <span className="shrink-0 text-[9px] bg-amber-400/15 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded-full font-bold">BEREIT</span>
                        )}
                        <span className="text-xs text-zinc-500 shrink-0 w-10 text-right">
                          {membership.currentStamps}/{lowestTierStamps}
                        </span>
                        {showLeads && (
                          <ChevronRight size={13} className={`text-zinc-700 shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                        )}
                      </button>
                      <AnimatePresence>
                        {showLeads && isSelected && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                            <div className="mx-4 mb-3 bg-zinc-800/70 rounded-xl p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <Phone size={13} className="text-amber-400" />
                                <a href={`tel:${customer.phone}`} className="text-sm text-zinc-200 hover:text-amber-400 transition-colors">
                                  {customer.phone}
                                </a>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                {[
                                  { label: "Aktuell", value: membership.currentStamps },
                                  { label: "Gesamt", value: membership.totalStampsEver },
                                  { label: "Belohnt", value: membership.rewardsRedeemed },
                                ].map(({ label, value }) => (
                                  <div key={label} className="bg-zinc-700/50 rounded-xl py-2.5">
                                    <p className="text-base font-bold text-zinc-100">{value}</p>
                                    <p className="text-[9px] text-zinc-500 mt-0.5 uppercase tracking-wide">{label}</p>
                                  </div>
                                ))}
                              </div>
                              {membership.lastStampAt && (
                                <p className="text-[11px] text-zinc-600">
                                  Letzter Stempel: {new Date(membership.lastStampAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {customers && customers.length >= 10 && (
                <button onClick={() => setShowAllCustomers(v => !v)}
                  className="w-full py-3 text-xs text-zinc-500 hover:text-amber-400 transition-colors border-t border-zinc-800/60">
                  {showAllCustomers ? "Weniger anzeigen" : "Alle anzeigen"}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
