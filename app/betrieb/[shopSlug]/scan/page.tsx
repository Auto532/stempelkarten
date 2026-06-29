"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserPlus, Stamp, Gift, ScanLine,
  Users, ChevronRight, Award, X, QrCode, Phone, Eye,
  Printer, Search, Check,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import type { CardTier } from "@/app/me/components";
import { getShopTheme, DEFAULT_COLORS } from "@/app/me/themes/registry";
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";
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
  const shopTheme = getShopTheme(shop);
  const c = shopTheme?.colors ?? DEFAULT_COLORS;
  const data = useQuery(api.memberships.getForCustomerAndShop, { qrToken, shopId });
  const addStamp = useMutation(api.memberships.addStamp);
  const redeemReward = useMutation(api.memberships.redeemReward);
  const confirmPendingRedemption = useMutation(api.memberships.confirmPendingRedemption);
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
        className="rounded-2xl p-8 text-center space-y-5" style={c.card}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${actionState.rewardReached ? "bg-amber-400" : "bg-green-500"}`}>
            {actionState.rewardReached ? <Gift size={36} className="text-zinc-900" /> : <Stamp size={36} className="text-white" />}
          </div>
        </motion.div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: shopTheme ? c.text : undefined }}>
            {actionState.rewardReached ? "Belohnung erreicht! 🎉" : "Stempel gesetzt!"}
          </h2>
          <p className="text-sm mt-1" style={{ color: c.accentDim }}>
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
          className={shopTheme ? "w-full py-3.5 rounded-xl font-medium transition-colors" : "w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors"}
          style={shopTheme ? { ...c.card, color: c.textBody } : undefined}>
          Nächsten Kunden scannen
        </button>
      </motion.div>
    );
  }

  if (actionState.type === "redeemed") {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl p-8 text-center space-y-5" style={c.card}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }}>
          <div className="w-20 h-20 rounded-full bg-amber-400 mx-auto flex items-center justify-center">
            <Gift size={36} className="text-zinc-900" />
          </div>
        </motion.div>
        <div>
          <h2 className="text-xl font-bold" style={{ color: shopTheme ? c.text : undefined }}>Belohnung eingelöst! 🏆</h2>
          <p className="text-sm mt-1" style={{ color: c.accentDim }}>{actionState.customerName} erhält:</p>
          <p className="text-amber-400 font-semibold mt-1">{actionState.rewardText}</p>
        </div>
        <button onClick={onDone}
          className={shopTheme ? "w-full py-3.5 rounded-xl font-medium transition-colors" : "w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-medium transition-colors"}
          style={shopTheme ? { ...c.card, color: c.textBody } : undefined}>
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

  const handleConfirmPending = async () => {
    setLoading(true); setError("");
    try {
      const result = await confirmPendingRedemption({ membershipId: membership._id, adminToken });
      setActionState({ type: "redeemed", customerName: customer.name, rewardText: result.rewardText });
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "Fehler"); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

      {/* Customer header */}
      <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={c.card}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
          style={{ background: c.dark, color: c.accent, border: `1px solid ${c.accent}44` }}>
          {customer.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold" style={{ color: c.text }}>{customer.name}</h2>
          <p className="text-xs" style={{ color: c.accentDim }}>{customer.phone}</p>
        </div>
        {rewardReady && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
            style={{ background: c.accent, color: "#18181b" }}>
            Belohnung!
          </motion.span>
        )}
      </div>

      {/* Mini Stempel-Übersicht */}
      <div className="rounded-2xl px-5 py-4" style={c.card}>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-semibold" style={{ color: c.text }}>{shop.name}</p>
          <p className="text-sm font-bold" style={{ color: c.accent }}>
            {membership.currentStamps} / {stampsRequired} Stempel
          </p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.dark }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(membership.currentStamps / stampsRequired * 100, 100)}%` }}
            transition={{ duration: 0.5 }}
            className="h-full rounded-full"
            style={{ background: c.gradient }}
          />
        </div>
        {rewardText && (
          <p className="text-[11px] mt-2" style={{ color: c.accentDim }}>
            Belohnung: {rewardText}
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm px-1">{error}</p>}

      {/* Actions */}
      <div className="space-y-3">
        {membership.pendingRedemption ? (
          <>
            <div className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: `${c.accent}15`, border: `2px solid ${c.accent}55` }}>
              <Gift size={24} style={{ color: c.accent }} className="shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: c.accent }}>Gutschein ausstehend</p>
                <p className="font-semibold text-sm" style={{ color: c.text }}>{membership.pendingRedemption.rewardText}</p>
              </div>
            </div>
            <button onClick={handleConfirmPending} disabled={loading}
              className="w-full py-4 font-bold rounded-xl flex items-center justify-center gap-2 text-base transition-colors disabled:opacity-50"
              style={{ background: c.accent, color: "#18181b" }}>
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
                : <><Gift size={18} /> Gutschein bestätigen</>}
            </button>
          </>
        ) : rewardReady ? (
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
  const [showAllRedemptions, setShowAllRedemptions] = useState(false);
  const customers = useQuery(
    api.shops.listCustomersForShop,
    shop && adminToken ? { shopId: shop._id, adminToken } : "skip"
  );
  const redemptions = useQuery(
    api.memberships.getRedemptionsForShop,
    shop?.bonusProgramEnabled && shop && adminToken ? { shopId: shop._id, adminToken, limit: showAllRedemptions ? undefined : 10 } : "skip"
  );
  const [showGifts, setShowGifts] = useState(false);
  const [openRedemptionId, setOpenRedemptionId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const slug = localStorage.getItem("adminShopSlug");
    if (!token || slug !== shopSlug) { router.replace("/"); return; }
    setAdminToken(token);
    setAuthorized(true);
  }, [router, shopSlug]);

  useShopThemeSync(shop);

  if (!authorized || shop === undefined) {
    return <div className="min-h-screen flex items-center justify-center"><motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-zinc-500 text-sm">Laden...</motion.div></div>;
  }
  if (!shop) return null;

  const theme = getShopTheme(shop);
  const c = theme?.colors ?? DEFAULT_COLORS;
  const totalStamps = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
  const totalRewards = customers?.reduce((s, c) => s + c.membership.rewardsRedeemed, 0) ?? 0;
  const activeTiers = shop.bonusProgramEnabled && shop.rewardTiers && shop.rewardTiers.some(t => t.enabled)
    ? shop.rewardTiers.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps)
    : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }];

  // ── Scanner view ────────────────────────────────────────────────────────────
  if (view === "scanning") {
    return (
      <div className={`min-h-screen px-5 pt-10 pb-10 max-w-sm mx-auto ${theme ? "relative z-[2]" : ""}`}>
        {theme && <theme.Background />}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <h1 className="font-bold text-zinc-100">{shop.name}</h1>
          <p className="text-xs text-zinc-500">QR-Code scannen</p>
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
    <div className={`min-h-screen px-5 pt-12 pb-10 max-w-sm mx-auto space-y-6 ${theme ? "relative z-[2]" : ""}`}>
      {theme && <theme.Background />}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-medium uppercase tracking-widest" style={{ color: c.accentDim }}>Mitarbeiter</p>
        <h1 className="text-2xl font-bold mt-1" style={{ color: c.text }}>{shop.name}</h1>
      </motion.div>

      {/* Scan Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} whileTap={{ scale: 0.97 }}
        onClick={() => setView("scanning")}
        className="w-full text-zinc-900 rounded-2xl p-5 flex items-center gap-4 transition-colors"
        style={{ background: c.gradient }}
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
          <div key={label} className="rounded-2xl p-4 text-center" style={c.card}>
            <Icon size={18} className="mx-auto mb-2" style={{ color: c.accent }} />
            <p className="text-xl font-bold" style={{ color: c.text }}>{value}</p>
            <p className="text-[11px] mt-0.5" style={{ color: c.accentDim }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Join QR */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="rounded-2xl p-5 space-y-4" style={c.card}>
        <div className="flex items-center gap-2">
          <QrCode size={16} style={{ color: c.accent }} />
          <span className="font-medium text-sm" style={{ color: c.text }}>Kunden-QR-Code</span>
        </div>
        <div className="flex justify-center">
          <QRImage value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${shopSlug}`} size={160} />
        </div>
        <p className="text-center text-xs" style={{ color: c.accentDim }}>
          Neue Kunden können diesen Code scannen um sich zu registrieren
        </p>
        <button
          onClick={() => printQR(shop.name, `${window.location.origin}/join/${shopSlug}`)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors"
          style={c.input}
        >
          <Printer size={15} style={{ color: c.accent }} />
          Drucken / Druckvorschau
        </button>
      </motion.div>

      {/* Belohnungen (read-only) */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="rounded-2xl overflow-hidden" style={c.card}>
        <div className="px-5 py-4 flex items-center gap-2">
          <Gift size={15} style={{ color: c.accent }} />
          <span className="font-medium text-sm" style={{ color: c.text }}>Belohnungen</span>
        </div>
        <div className="divide-y px-5 pb-4 space-y-2" style={{ borderColor: c.divider }}>
          {activeTiers.map((tier, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={c.badge}>
                  {tier.stamps}
                </div>
                <span className="text-sm" style={{ color: c.textBody }}>{tier.text}</span>
              </div>
              <span className="text-[11px]" style={{ color: c.accentDim }}>{tier.stamps} ✕</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Meilensteine (read-only) */}
      {shop.milestonesEnabled && shop.milestones && shop.milestones.filter(m => m.enabled).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl overflow-hidden" style={c.card}>
          <div className="px-5 py-4 flex items-center gap-2">
            <Award size={15} style={{ color: c.accent }} />
            <span className="font-medium text-sm" style={{ color: c.text }}>Treue-Meilensteine</span>
          </div>
          <div className="px-5 pb-4 space-y-2">
            <p className="text-xs mb-3" style={{ color: c.accentDim }}>
              Basieren auf Gesamtstempeln — nie zurückgesetzt
            </p>
            {shop.milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps).map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-t" style={{ borderColor: c.divider }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={c.badge}>
                    {m.stamps}
                  </div>
                  <span className="text-sm" style={{ color: c.textBody }}>{m.text}</span>
                </div>
                <span className="text-[11px]" style={{ color: c.accentDim }}>ab {m.stamps}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Treue Bonus (Einlösungen) */}
      <AnimatePresence>
        {shop.bonusProgramEnabled && (
          <motion.div key="gifts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl overflow-hidden" style={c.card}>
            <button onClick={() => setShowGifts(v => !v)}
              className="w-full flex items-center gap-2 px-5 py-4 transition-colors text-left">
              <Gift size={15} style={{ color: c.accent }} className="shrink-0" />
              <span className="font-medium text-sm flex-1" style={{ color: c.text }}>Treue Bonus (Einlösungen)</span>
              {redemptions && redemptions.length > 0 && (
                <span className="text-xs mr-1" style={{ color: c.accentDim }}>{redemptions.length}</span>
              )}
              <ChevronRight size={13} style={{ color: c.accentDim }} className={`transition-transform ${showGifts ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {showGifts && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="max-h-[320px] overflow-y-auto" style={{ borderTop: `1px solid ${c.divider}` }}>
                    {redemptions === undefined && <div className="px-5 py-6 text-center text-sm" style={{ color: c.accentDim }}>Laden…</div>}
                    {redemptions?.length === 0 && <div className="px-5 py-6 text-center text-sm" style={{ color: c.accentDim }}>Noch keine Einlösungen</div>}
                    {redemptions?.map((r) => {
                      const isOpen = openRedemptionId === r._id;
                      return (
                        <div key={r._id} style={{ borderBottom: `1px solid ${c.divider}` }}>
                          <button onClick={() => setOpenRedemptionId(isOpen ? null : r._id)}
                            className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: c.badge.background, border: c.badge.border }}>
                              <span className="text-xs font-bold" style={{ color: c.accent }}>{r.customerName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate" style={{ color: c.text }}>{r.customerName}</p>
                              <p className="text-xs truncate" style={{ color: c.accent }}>{r.rewardText ?? shop.rewardText}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <p className="text-[11px]" style={{ color: c.accentDim }}>
                                {new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                              </p>
                              <ChevronRight size={13} style={{ color: c.accentDim }} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                            </div>
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="mx-4 mb-3 rounded-xl p-3 space-y-1.5"
                                  style={{ background: c.subCard.background }}>
                                  {[
                                    { label: "Belohnung", value: r.rewardText ?? shop.rewardText, accent: true },
                                    { label: "Datum", value: new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }), accent: false },
                                    { label: "Uhrzeit", value: new Date(r.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }), accent: false },
                                  ].map(({ label, value, accent }) => (
                                    <div key={label} className="flex justify-between items-center">
                                      <span className="text-xs" style={{ color: c.accentDim }}>{label}</span>
                                      <span className="text-xs font-semibold" style={{ color: accent ? (c.accent) : (c.textBody) }}>{value}</span>
                                    </div>
                                  ))}
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
                      className="w-full py-3 text-xs transition-colors" style={{ color: c.accentDim, borderTop: `1px solid ${c.divider}` }}>
                      {showAllRedemptions ? "Weniger anzeigen" : "Alle anzeigen"}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
