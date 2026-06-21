"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Store, Users, Stamp, Award, ChevronRight, Link, X, Check,
  QrCode, Eye, EyeOff, BarChart2, Settings, AlertTriangle, Trash2,
  Shield, TrendingUp, ArrowLeft, Printer, Palette, FileText, Trophy, type LucideIcon,
} from "lucide-react";
import { BRANCHEN, STAMP_ICONS } from "@/app/me/components";
import type { Doc } from "@/convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { QRImage } from "@/app/components/QRImage";


// ─── ShopCard ────────────────────────────────────────────────────────────────

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

function ShopCard({ shop, index }: { shop: Doc<"shops">; index: number }) {
  const customers = useQuery(api.shops.listCustomersForShop, { shopId: shop._id });
  const toggleShowLeads = useMutation(api.shops.toggleShowLeads);
  const toggleBonusProgram = useMutation(api.shops.toggleBonusProgram);
  const toggleCustomDesign = useMutation(api.shops.toggleCustomDesign);
  const toggleMilestones = useMutation(api.shops.toggleMilestones);
  const updateLegalTexts = useMutation(api.shops.updateLegalTexts);
  const [showToggles, setShowToggles] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [impressumDraft, setImpressumDraft] = useState("");
  const [agbDraft, setAgbDraft] = useState("");
  const [datenschutzDraft, setDatenschutzDraft] = useState("");
  const [savingLegal, setSavingLegal] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [togglingLeads, setTogglingLeads] = useState(false);
  const [togglingBonus, setTogglingBonus] = useState(false);
  const [togglingDesign, setTogglingDesign] = useState(false);
  const [togglingMilestones, setTogglingMilestones] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (showLegal && shop) {
      setImpressumDraft(shop.impressumText ?? "");
      setAgbDraft(shop.agbText ?? "");
      setDatenschutzDraft(shop.datenschutzText ?? "");
    }
  }, [showLegal, shop?._id]);

  const totalStamps = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
  const totalRewards = customers?.reduce((s, c) => s + c.membership.rewardsRedeemed, 0) ?? 0;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl = `${base}/join/${shop.slug}`;
  const loginUrl = `${base}/betrieb/login/${shop.adminLoginToken}`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleToggleLeads = async () => {
    setTogglingLeads(true);
    try { await toggleShowLeads({ shopId: shop._id, showLeads: !shop.showLeads }); }
    finally { setTogglingLeads(false); }
  };

  const handleToggleBonus = async () => {
    setTogglingBonus(true);
    try { await toggleBonusProgram({ shopId: shop._id, enabled: !shop.bonusProgramEnabled }); }
    finally { setTogglingBonus(false); }
  };

  const handleSaveLegal = async () => {
    setSavingLegal(true);
    try {
      await updateLegalTexts({
        shopId: shop._id,
        impressumText: impressumDraft || undefined,
        agbText: agbDraft || undefined,
        datenschutzText: datenschutzDraft || undefined,
      });
    } finally {
      setSavingLegal(false);
    }
  };

  const handleToggleDesign = async () => {
    setTogglingDesign(true);
    try { await toggleCustomDesign({ shopId: shop._id, enabled: !shop.customDesignEnabled }); }
    finally { setTogglingDesign(false); }
  };

  const handleToggleMilestones = async () => {
    setTogglingMilestones(true);
    try { await toggleMilestones({ shopId: shop._id, enabled: !shop.milestonesEnabled }); }
    finally { setTogglingMilestones(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
          <Store size={18} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-100">{shop.name}</p>
          <p className="text-xs text-zinc-500">{shop.slug} · {shop.stampsRequired} Stempel</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-t border-zinc-800/50">
        {[
          { icon: Users, value: customers?.length ?? "–", label: "Kunden" },
          { icon: Stamp, value: totalStamps, label: "Stempel" },
          { icon: Award, value: totalRewards, label: "Belohnungen" },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center py-3 gap-0.5">
            <Icon size={13} className="text-zinc-500" />
            <span className="text-sm font-bold text-zinc-200">{value}</span>
            <span className="text-[10px] text-zinc-600">{label}</span>
          </div>
        ))}
      </div>

      {/* Toggles accordion */}
      <div className="border-t border-zinc-800/50">
        <button onClick={() => setShowToggles(!showToggles)}
          className="w-full flex items-center gap-2 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
          <Settings size={14} className="text-zinc-500 shrink-0" />
          <span className="text-xs font-medium text-zinc-300 flex-1 text-left">Zusatzleistungen</span>
          <ChevronRight size={13} className={`text-zinc-600 transition-transform ${showToggles ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence>
          {showToggles && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="divide-y divide-zinc-800/40 border-t border-zinc-800/50">
                {[
                  { icon: shop.showLeads ? Eye : EyeOff, label: "Leads sichtbar", active: !!shop.showLeads, toggle: handleToggleLeads, disabled: togglingLeads },
                  { icon: TrendingUp, label: "Bonus-Programm", active: !!shop.bonusProgramEnabled, toggle: handleToggleBonus, disabled: togglingBonus },
                  { icon: Palette, label: "Eigenes Design", active: !!shop.customDesignEnabled, toggle: handleToggleDesign, disabled: togglingDesign },
                  { icon: Trophy, label: "Treue-Meilensteine", active: !!shop.milestonesEnabled, toggle: handleToggleMilestones, disabled: togglingMilestones },
                ].map(({ icon: Icon, label, active, toggle, disabled }) => (
                  <div key={label} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={active ? "text-amber-400" : "text-zinc-600"} />
                      <span className="text-xs text-zinc-400">{label}</span>
                    </div>
                    <button
                      onClick={toggle}
                      disabled={disabled}
                      style={{ minWidth: "2.5rem", height: "1.375rem" }}
                      className={`relative rounded-full transition-colors duration-200 flex items-center px-0.5 ${active ? "bg-amber-400" : "bg-zinc-700"}`}
                    >
                      <motion.div
                        animate={{ x: active ? 18 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* QR Code accordion */}
      <div className="border-t border-zinc-800/50">
        <button onClick={() => setShowQR(!showQR)}
          className="w-full flex items-center gap-2 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
          <QrCode size={14} className="text-amber-400 shrink-0" />
          <span className="text-xs font-medium text-zinc-300 flex-1 text-left">Kunden-QR-Code</span>
          <ChevronRight size={13} className={`text-zinc-600 transition-transform ${showQR ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence>
          {showQR && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 space-y-3">
                <div className="flex justify-center">
                  <QRImage value={joinUrl} size={160} />
                </div>
                <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                  <code className="text-[11px] text-amber-300 flex-1 truncate">{joinUrl}</code>
                  <button onClick={() => copy(joinUrl, "join")} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                    {copied === "join" ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
                  </button>
                </div>
                <button
                  onClick={() => printQR(shop.name, joinUrl)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors"
                >
                  <Printer size={15} className="text-amber-400" />
                  Drucken / Druckvorschau
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Betrieb-Login accordion */}
      <div className="border-t border-zinc-800/50">
        <button onClick={() => setShowLogin(!showLogin)}
          className="w-full flex items-center gap-2 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
          <Link size={14} className="text-zinc-500 shrink-0" />
          <span className="text-xs font-medium text-zinc-300 flex-1 text-left">Betrieb-Login-Link</span>
          <ChevronRight size={13} className={`text-zinc-600 transition-transform ${showLogin ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence>
          {showLogin && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4">
                <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2.5">
                  <code className="text-[11px] text-amber-300 flex-1 truncate">{loginUrl}</code>
                  <button onClick={() => copy(loginUrl, "login")} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                    {copied === "login" ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-600 mt-2">Nur einmalig an den Betrieb senden — Link loggt automatisch ein.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Impressum & AGB accordion */}
      <div className="border-t border-zinc-800/50">
        <button onClick={() => setShowLegal(!showLegal)}
          className="w-full flex items-center gap-2 px-5 py-3 hover:bg-zinc-800/30 transition-colors">
          <FileText size={14} className={shop.impressumText ? "text-amber-400" : "text-zinc-500"} />
          <span className="text-xs font-medium text-zinc-300 flex-1 text-left">Rechtliche Texte</span>
          {shop.impressumText && shop.datenschutzText && <span className="text-[10px] text-green-400 mr-1">✓</span>}
          {shop.impressumText && !shop.datenschutzText && <span className="text-[10px] text-amber-400 mr-1">!</span>}
          <ChevronRight size={13} className={`text-zinc-600 transition-transform ${showLegal ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence>
          {showLegal && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1.5">Impressum</label>
                  <textarea
                    value={impressumDraft}
                    onChange={e => setImpressumDraft(e.target.value)}
                    rows={6}
                    placeholder={"Angaben gemäß § 5 TMG\n\nMax Mustermann\nMusterstraße 1\n12345 Musterstadt\n\nTelefon: ...\nE-Mail: ..."}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:border-amber-400/50 resize-none leading-relaxed"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1.5">AGB</label>
                  <textarea
                    value={agbDraft}
                    onChange={e => setAgbDraft(e.target.value)}
                    rows={6}
                    placeholder="Allgemeine Geschäftsbedingungen..."
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:border-amber-400/50 resize-none leading-relaxed"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 block mb-1.5">Datenschutzerklärung</label>
                  <textarea
                    value={datenschutzDraft}
                    onChange={e => setDatenschutzDraft(e.target.value)}
                    rows={8}
                    placeholder={"Datenschutzerklärung gemäß DSGVO\n\nVerantwortlicher: ...\n\nWelche Daten wir erheben:\n- Name\n- Telefonnummer\n\nZweck der Verarbeitung: Verwaltung des Treueprogramms.\n\nRechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).\n\nSpeicherdauer: Bis zum Widerruf der Einwilligung.\n\nRechte: Auskunft, Berichtigung, Löschung per E-Mail an ..."}
                    className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:border-amber-400/50 resize-none leading-relaxed"
                  />
                </div>
                <button
                  onClick={handleSaveLegal}
                  disabled={savingLegal}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-900 text-xs font-semibold rounded-xl transition-colors"
                >
                  {savingLegal ? "Speichert..." : "Speichern"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </motion.div>
  );
}

// ─── CreateShopForm ───────────────────────────────────────────────────────────

function CreateShopForm({ onDone }: { onDone: () => void }) {
  const createShop = useMutation(api.shops.createShop);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [stampsRequired, setStampsRequired] = useState(10);
  const [rewardText, setRewardText] = useState("");
  const [selectedBranche, setSelectedBranche] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stampIcon = BRANCHEN.find(b => b.label === selectedBranche)?.icon;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await createShop({ name, slug, stampsRequired, rewardText, stampIcon });
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally { setLoading(false); }
  };

  return (
    <motion.form onSubmit={handleCreate} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-zinc-100">Neuer Shop</h2>
        <button type="button" onClick={onDone} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
      </div>

      {/* Branche */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Branche</label>
        <div className="grid grid-cols-2 gap-1.5">
          {BRANCHEN.map((b) => {
            const Icon = STAMP_ICONS[b.icon] ?? Stamp;
            const active = selectedBranche === b.label;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => setSelectedBranche(active ? "" : b.label)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs transition-all ${
                  active
                    ? "bg-amber-400/15 border-amber-400/40 text-amber-300"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <Icon size={13} className={active ? "text-amber-400" : "text-zinc-500"} />
                <span className="truncate">{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {[
        { label: "Shop-Name", value: name, onChange: setName, placeholder: "Friseur Müller" },
        { label: "Slug (URL-Kürzel)", value: slug, onChange: (v: string) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "-")), placeholder: "friseur-mueller" },
        { label: "Belohnungstext", value: rewardText, onChange: setRewardText, placeholder: "1x Haarschnitt gratis" },
      ].map(({ label, value, onChange, placeholder }) => (
        <div key={label}>
          <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50" />
        </div>
      ))}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Stempel bis Belohnung</label>
        <input type="number" min={1} max={50} value={stampsRequired} onChange={(e) => setStampsRequired(Number(e.target.value))} required
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400/50" />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-semibold rounded-xl transition-colors">
        {loading ? "Erstelle..." : "Shop erstellen"}
      </button>
    </motion.form>
  );
}

// ─── Tab: Übersicht ───────────────────────────────────────────────────────────

function OverviewTab() {
  const globalStats = useQuery(api.shops.getGlobalStats);

  if (!globalStats) {
    return (
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
        className="text-zinc-500 text-sm text-center py-16">Laden...</motion.div>
    );
  }

  const statCards = [
    { icon: Store, label: "Shops", value: globalStats.totalShops, color: "text-amber-400" },
    { icon: Users, label: "Kunden", value: globalStats.totalCustomers, color: "text-blue-400" },
    { icon: Stamp, label: "Stempel", value: globalStats.totalStamps, color: "text-green-400" },
    { icon: Award, label: "Belohnungen", value: globalStats.totalRewards, color: "text-purple-400" },
  ];

  return (
    <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
            className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <Icon size={20} className={`${color} mb-3`} />
            <p className="text-3xl font-bold text-zinc-100">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Shop activity list */}
      {globalStats.shops.length > 0 && (
        <div className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
            <TrendingUp size={15} className="text-zinc-400" />
            <span className="text-sm font-medium text-zinc-200">Shops nach Kunden</span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {[...globalStats.shops]
              .sort((a, b) => b.customerCount - a.customerCount)
              .map((shop, i) => (
                <motion.div key={shop._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.05 }}
                  className="flex items-center gap-3 px-5 py-3">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                    <Store size={13} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 font-medium truncate">{shop.name}</p>
                    <p className="text-[11px] text-zinc-600">{shop.stampsRequired} Stempel · {shop.rewardText}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-zinc-200">{shop.customerCount}</p>
                    <p className="text-[10px] text-zinc-600">Kunden</p>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>
      )}

      {globalStats.shops.length === 0 && (
        <div className="text-center py-10 text-zinc-600 text-sm">
          Noch keine Shops angelegt.
        </div>
      )}
    </motion.div>
  );
}

// ─── Tab: Shops ───────────────────────────────────────────────────────────────

function ShopsTab() {
  const allShops = useQuery(api.shops.listAllShops);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <motion.div key="shops" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-zinc-500">{allShops?.length ?? "–"} Shops</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-medium rounded-xl transition-colors">
          <Plus size={15} /> Neu
        </button>
      </div>

      <AnimatePresence>
        {showCreate && <CreateShopForm onDone={() => setShowCreate(false)} />}
      </AnimatePresence>

      {allShops === undefined && (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm text-center py-10">Laden...</motion.div>
      )}
      {allShops?.length === 0 && !showCreate && (
        <div className="text-center py-10 text-zinc-600 text-sm">
          Noch keine Shops. Klicke Neu um den ersten anzulegen.
        </div>
      )}
      {allShops?.map((shop, i) => (
        <ShopCard key={shop._id} shop={shop} index={i} />
      ))}
    </motion.div>
  );
}

// ─── Tab: Einstellungen ───────────────────────────────────────────────────────

function SettingsTab() {
  const clearAllData = useMutation(api.admin.clearAllData);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [copied, setCopied] = useState(false);

  const base = typeof window !== "undefined" ? window.location.origin : "";
  const adminUrl = `${base}/zk7-verwaltung-9x2`;

  const copyAdminUrl = () => {
    navigator.clipboard.writeText(adminUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await clearAllData({ adminSecret: pinInput });
      setDeleted(true);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Admin URL */}
      <div className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
          <Shield size={15} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">Admin-Zugang</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Geheime Admin-URL</p>
            <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2.5">
              <code className="text-[11px] text-amber-300 flex-1 truncate">{adminUrl}</code>
              <button onClick={copyAdminUrl} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                {copied ? <Check size={14} className="text-green-400" /> : <Link size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-600 mt-1.5">Nur du kennst diese URL — teile sie niemals.</p>
          </div>
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
            <p className="text-xs text-amber-300 font-medium mb-1">PIN: gesetzt via ADMIN_PIN Env-Variable</p>
            <p className="text-[11px] text-zinc-500">PIN wird server-seitig geprüft — nicht im Client-Bundle sichtbar.</p>
          </div>
        </div>
      </div>

      {/* App Info */}
      <div className="card-3d bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
          <BarChart2 size={15} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">App-Info</span>
        </div>
        <div className="p-5 space-y-2">
          {[
            { label: "Version", value: "Phase 1 MVP" },
            { label: "Backend", value: "Convex Cloud" },
            { label: "Hosting", value: "Vercel" },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <span className="text-sm text-zinc-500">{label}</span>
              <span className="text-sm text-zinc-300">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-zinc-900 border border-red-900/40 rounded-2xl overflow-hidden">
        <button
          onClick={() => { setShowDangerZone(!showDangerZone); setConfirmDelete(false); setDeleteText(""); setPinInput(""); }}
          className="w-full flex items-center gap-2 px-5 py-4 hover:bg-red-900/10 transition-colors"
        >
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <span className="text-sm font-medium text-red-400 flex-1 text-left">Löschen</span>
          <ChevronRight size={13} className={`text-red-900 transition-transform ${showDangerZone ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence>
          {showDangerZone && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="border-t border-red-900/30 p-5">
                {deleted ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
                    <Check size={20} className="text-green-400 mx-auto mb-1" />
                    <p className="text-sm text-green-400">Alle Daten gelöscht.</p>
                  </motion.div>
                ) : !confirmDelete ? (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500">Löscht alle Shops, Kunden, Stempel und Ereignisse — inkl. aller Nutzerdaten. Unwiderruflich.</p>
                    <button onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-red-900/30 border border-zinc-700 hover:border-red-900/50 text-zinc-500 hover:text-red-400 rounded-xl text-sm transition-colors">
                      <Trash2 size={14} /> Alle Daten löschen
                    </button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <p className="text-sm text-red-300 font-medium">Wirklich alles löschen?</p>
                    <p className="text-xs text-zinc-500">Alle Shops, Kunden und Stempel werden permanent gelöscht.</p>
                    <input
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value)}
                      placeholder="LÖSCHEN eingeben"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-red-900/50 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 text-sm font-mono tracking-wider"
                    />
                    <input
                      type="password"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="Admin-PIN zur Bestätigung"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-red-900/50 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 text-sm text-center tracking-widest"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleDelete} disabled={deleting || deleteText !== "LÖSCHEN" || !pinInput}
                        className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl text-sm transition-colors">
                        {deleting ? "Löscht..." : "Endgültig löschen"}
                      </button>
                      <button onClick={() => { setConfirmDelete(false); setDeleteText(""); setPinInput(""); }}
                        className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors">
                        Abbrechen
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "overview" | "shops" | "settings";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Übersicht", icon: BarChart2 },
  { id: "shops", label: "Shops", icon: Store },
  { id: "settings", label: "Einstellungen", icon: Settings },
];

export default function SuperAdminPage() {
  const router = useRouter();
  const checkPinMutation = useMutation(api.admin.checkPin);
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const handleLogin = async () => {
    if (!pin) return;
    setChecking(true);
    setPinError(null);
    try {
      await checkPinMutation({ pin });
      setAuthed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fehler";
      setPinError(msg);
      setPin("");
    } finally {
      setChecking(false);
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield size={26} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">Admin</h1>
            <p className="text-zinc-500 text-sm mt-1">Nur für interne Nutzung</p>
          </div>
          <input
            type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(null); }}
            placeholder="PIN"
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
            autoFocus
            className={`w-full px-4 py-3.5 bg-zinc-900 border rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none text-center tracking-widest text-xl transition-colors ${pinError ? "border-red-500/60" : "border-zinc-800 focus:border-amber-400/50"}`}
          />
          {pinError && <p className="text-red-400 text-sm text-center -mt-2">{pinError}</p>}
          <button
            onClick={handleLogin}
            disabled={checking || !pin}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-semibold rounded-2xl transition-colors">
            {checking ? "Prüfe..." : "Einloggen"}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top nav bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <AnimatePresence mode="wait">
          <motion.span
            key={activeTab}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            className="font-semibold text-zinc-100 text-base"
          >
            {activeTab === "overview" && "Übersicht"}
            {activeTab === "shops" && "Shops"}
            {activeTab === "settings" && "Einstellungen"}
          </motion.span>
        </AnimatePresence>
        <span className="ml-auto text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Admin</span>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pt-5 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && <OverviewTab key="overview" />}
          {activeTab === "shops" && <ShopsTab key="shops" />}
          {activeTab === "settings" && <SettingsTab key="settings" />}
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${activeTab === id ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
            {activeTab === id && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 w-8 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
