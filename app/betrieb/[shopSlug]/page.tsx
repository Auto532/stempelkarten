"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Users, Settings, ChevronRight, Award, Stamp, X, Check, QrCode, Phone, Eye, Printer, Search, Gift, Plus, TrendingUp } from "lucide-react";
import { QRImage } from "@/app/components/QRImage";
import QRCode from "qrcode";

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

type Tier = { stamps: number; text: string; enabled: boolean };

export default function BetriebDashboard() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });
  const customers = useQuery(api.shops.listCustomersForShop, shop ? { shopId: shop._id } : "skip");
  const redemptions = useQuery(
    api.memberships.getRedemptionsForShop,
    shop?.bonusProgramEnabled && shop ? { shopId: shop._id } : "skip"
  );
  const updateSettings = useMutation(api.shops.updateSettings);

  const [authorized, setAuthorized] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [stampsRequired, setStampsRequired] = useState(0);
  const [rewardText, setRewardText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tiersInitialized, setTiersInitialized] = useState(false);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierSaved, setTierSaved] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) { router.replace("/"); return; }
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (shop) { setStampsRequired(shop.stampsRequired); setRewardText(shop.rewardText); }
  }, [shop]);

  useEffect(() => {
    if (shop && !tiersInitialized) {
      setTiersInitialized(true);
      setTiers(
        shop.rewardTiers && shop.rewardTiers.length > 0
          ? [...shop.rewardTiers]
          : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }]
      );
    }
  }, [shop, tiersInitialized]);

  const handleSaveTiers = async () => {
    if (!shop) return;
    setTierSaving(true);
    try {
      const sorted = [...tiers].sort((a, b) => a.stamps - b.stamps);
      const enabled = sorted.filter(t => t.enabled);
      const primary = enabled[0] ?? { stamps: shop.stampsRequired, text: shop.rewardText };
      await updateSettings({
        shopId: shop._id,
        stampsRequired: primary.stamps,
        rewardText: primary.text,
        rewardTiers: sorted.length > 1 ? sorted : undefined,
      });
      setTierSaved(true);
      setTimeout(() => setTierSaved(false), 2500);
    } finally {
      setTierSaving(false);
    }
  };

  const handleSave = async () => {
    if (!shop) return;
    setSaving(true);
    try {
      await updateSettings({ shopId: shop._id, stampsRequired, rewardText });
      setSaved(true);
      setEditMode(false);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (!authorized || shop === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-zinc-500 text-sm">
          Laden...
        </motion.div>
      </div>
    );
  }
  if (!shop) return null;

  const totalStamps = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
  const totalRewards = customers?.reduce((s, c) => s + c.membership.rewardsRedeemed, 0) ?? 0;

  const activeTiers: Tier[] = shop.bonusProgramEnabled && shop.rewardTiers && shop.rewardTiers.some(t => t.enabled)
    ? shop.rewardTiers.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps)
    : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }];
  const lowestTierStamps = activeTiers[0].stamps;

  const filteredCustomers = customers?.filter(({ customer }) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      customer?.name.toLowerCase().includes(q) ||
      (shop.showLeads && customer?.phone.includes(q))
    );
  }) ?? [];

  const readyCount = customers?.filter(
    ({ membership }) => membership.currentStamps >= lowestTierStamps
  ).length ?? 0;

  return (
    <div className="min-h-screen px-5 pt-12 pb-10 max-w-sm mx-auto space-y-6">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest">Betrieb</p>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">{shop.name}</h1>
      </motion.div>

      {/* Scan Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push(`/betrieb/${shopSlug}/scan`)}
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-3"
      >
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

      {/* Join QR Code */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4"
      >
        <div className="flex items-center gap-2">
          <QrCode size={16} className="text-zinc-400" />
          <span className="font-medium text-zinc-200 text-sm">Kunden-QR-Code</span>
        </div>
        <div className="flex justify-center">
          <QRImage value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${shopSlug}`} size={160} />
        </div>
        <p className="text-center text-xs text-zinc-500">
          Ausdrucken & am Tresen aufhängen — Kunden scannen diesen Code
        </p>
        <button
          onClick={() => printQR(shop.name, `${window.location.origin}/join/${shopSlug}`)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors"
        >
          <Printer size={15} className="text-amber-400" />
          Drucken / Druckvorschau
        </button>
      </motion.div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-zinc-400" />
            <span className="font-medium text-zinc-200 text-sm">Einstellungen</span>
          </div>
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.span key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs text-green-400 flex items-center gap-1">
                <Check size={12} /> Gespeichert
              </motion.span>
            ) : !editMode ? (
              <button onClick={() => setEditMode(true)} className="text-xs text-amber-400 hover:text-amber-300">
                Bearbeiten
              </button>
            ) : null}
          </AnimatePresence>
        </div>

        <div className="p-5 space-y-4">
          {editMode ? (
            <>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Stempel bis Belohnung</label>
                <input
                  type="number" min={1} max={50} value={stampsRequired}
                  onChange={(e) => setStampsRequired(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Belohnungstext</label>
                <input
                  value={rewardText} onChange={(e) => setRewardText(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400/50"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-medium rounded-xl text-sm">
                  {saving ? "..." : "Speichern"}
                </button>
                <button onClick={() => { setEditMode(false); setStampsRequired(shop.stampsRequired); setRewardText(shop.rewardText); }}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm flex items-center justify-center gap-1">
                  <X size={14} /> Abbrechen
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">Stempel bis Belohnung</span>
                <span className="text-sm font-semibold text-zinc-100">{shop.stampsRequired}</span>
              </div>
              <div className="flex justify-between items-start gap-4">
                <span className="text-sm text-zinc-400 shrink-0">Belohnung</span>
                <span className="text-sm font-semibold text-zinc-100 text-right">{shop.rewardText}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Bonus-Programme (nur wenn aktiviert) */}
      <AnimatePresence>
        {shop.bonusProgramEnabled && (
          <motion.div
            key="bonus"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ delay: 0.05 }}
            className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-amber-400" />
                <span className="font-medium text-zinc-200 text-sm">Bonus-Programme</span>
              </div>
              {tierSaved && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-green-400 flex items-center gap-1">
                  <Check size={12} /> Gespeichert
                </motion.span>
              )}
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Mehrere Belohnungsstufen — je mehr Stempel, desto wertvoller die Belohnung.
              </p>
              {tiers.map((tier, i) => (
                <div key={i} className="bg-zinc-800/60 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400">Stufe {i + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, enabled: !t.enabled } : t))}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                          tier.enabled
                            ? "bg-amber-400/15 border-amber-400/30 text-amber-400"
                            : "bg-zinc-700/50 border-zinc-600/50 text-zinc-500"
                        }`}
                      >
                        {tier.enabled ? "Aktiv" : "Inaktiv"}
                      </button>
                      {tiers.length > 1 && (
                        <button
                          onClick={() => setTiers(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-zinc-600 hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number" min={1} max={100} value={tier.stamps}
                      onChange={(e) => setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, stamps: Number(e.target.value) } : t))}
                      className="w-16 px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 text-sm focus:outline-none focus:border-amber-400/40 text-center"
                    />
                    <input
                      value={tier.text}
                      onChange={(e) => setTiers(prev => prev.map((t, idx) => idx === i ? { ...t, text: e.target.value } : t))}
                      placeholder="Belohnung beschreiben…"
                      className="flex-1 px-3 py-1.5 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:border-amber-400/40"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-600">Bei {tier.stamps} Stempeln: {tier.text || "…"}</p>
                </div>
              ))}
              <button
                onClick={() => {
                  const last = tiers[tiers.length - 1];
                  setTiers(prev => [...prev, { stamps: (last?.stamps ?? 10) + 5, text: "", enabled: true }]);
                }}
                className="w-full py-2 border border-dashed border-zinc-700 hover:border-amber-400/40 rounded-xl text-xs text-zinc-500 hover:text-amber-400/70 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={12} /> Stufe hinzufügen
              </button>
              <button
                onClick={handleSaveTiers}
                disabled={tierSaving}
                className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {tierSaving ? "Speichert…" : "Speichern"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vergebene Geschenke (nur wenn Bonus aktiv) */}
      <AnimatePresence>
        {shop.bonusProgramEnabled && (
          <motion.div
            key="gifts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
              <Gift size={15} className="text-amber-400" />
              <span className="font-medium text-zinc-200 text-sm">Vergebene Geschenke</span>
              {redemptions && redemptions.length > 0 && (
                <span className="ml-auto text-xs text-zinc-600">{redemptions.length}</span>
              )}
            </div>
            <div className="divide-y divide-zinc-800/40 max-h-[320px] overflow-y-auto">
              {redemptions === undefined && (
                <div className="px-5 py-6 text-center text-zinc-600 text-sm">Laden…</div>
              )}
              {redemptions?.length === 0 && (
                <div className="px-5 py-6 text-center text-zinc-600 text-sm">Noch keine Geschenke vergeben</div>
              )}
              {redemptions?.map((r) => (
                <div key={r._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-amber-400">{r.customerName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{r.customerName}</p>
                    <p className="text-xs text-amber-400/80 truncate">{r.rewardText ?? shop.rewardText}</p>
                  </div>
                  <p className="text-[11px] text-zinc-600 shrink-0">
                    {new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customer List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-zinc-800 space-y-3">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-zinc-400" />
            <span className="font-medium text-zinc-200 text-sm">Kunden</span>
            {shop.showLeads && (
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
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Suchen…"
              className="w-full pl-8 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-zinc-800/40 max-h-[420px] overflow-y-auto">
          {customers === undefined && (
            <div className="px-5 py-6 text-center text-zinc-600 text-sm">Laden...</div>
          )}
          {customers?.length === 0 && (
            <div className="px-5 py-6 text-center text-zinc-600 text-sm">Noch keine Kunden</div>
          )}
          {customers !== undefined && filteredCustomers.length === 0 && search && (
            <div className="px-5 py-6 text-center text-zinc-600 text-sm">Keine Treffer für „{search}"</div>
          )}

          {filteredCustomers.map(({ customer, membership }, i) => {
            if (!customer) return null;
            const pct = Math.min((membership.currentStamps / lowestTierStamps) * 100, 100);
            const isSelected = selectedCustomerId === customer._id;
            const isReady = membership.currentStamps >= lowestTierStamps;

            return (
              <motion.div
                key={membership._id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
              >
                <button
                  onClick={() => shop.showLeads ? setSelectedCustomerId(isSelected ? null : customer._id) : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${shop.showLeads ? "hover:bg-zinc-800/50 cursor-pointer" : "cursor-default"}`}
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isReady ? "bg-amber-400 text-zinc-900" : "bg-zinc-800 text-amber-400 border border-zinc-700"
                  }`}>
                    {customer.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-zinc-200 truncate">{customer.name}</span>
                      {isReady && (
                        <span className="shrink-0 text-[9px] bg-amber-400/15 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded-full font-bold">
                          BEREIT
                        </span>
                      )}
                    </div>
                    {/* Mini stamp dots */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: shop.stampsRequired }).map((_, di) => (
                        <div
                          key={di}
                          className={`rounded-full transition-colors ${
                            di < membership.currentStamps
                              ? "bg-amber-400"
                              : "bg-zinc-700"
                          }`}
                          style={{ width: `${Math.min(10, Math.floor(220 / shop.stampsRequired))}px`, height: "6px" }}
                        />
                      ))}
                      <span className="text-[10px] text-zinc-600 ml-1 shrink-0">
                        {membership.currentStamps}/{shop.stampsRequired}
                      </span>
                    </div>
                  </div>

                  {shop.showLeads && (
                    <ChevronRight size={14} className={`text-zinc-700 shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  )}
                </button>

                {/* Lead detail */}
                <AnimatePresence>
                  {shop.showLeads && isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
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
      </motion.div>
    </div>
  );
}
