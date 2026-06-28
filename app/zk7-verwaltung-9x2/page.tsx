"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Store, Users, Stamp, Award, ChevronRight, Link, X, Check,
  QrCode, Eye, EyeOff, BarChart2, Settings, AlertTriangle, Trash2,
  Shield, TrendingUp, ArrowLeft, Printer, Palette, FileText, Trophy,
  Sliders, LayoutDashboard, LayoutGrid, User, Gift, MessageSquare, type LucideIcon,
} from "lucide-react";
import { STAMP_ICONS } from "@/app/me/components";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import QRCode from "qrcode";
import { QRImage } from "@/app/components/QRImage";

// ─── Global Level System (spiegelt me/page.tsx) ───────────────────────────────

const GLOBAL_LEVELS = [
  { min: 1,  max: 1,         label: "Neuling"   },
  { min: 2,  max: 2,         label: "Entdecker" },
  { min: 3,  max: 4,         label: "Stammgast" },
  { min: 5,  max: 7,         label: "Loyaler"   },
  { min: 8,  max: 12,        label: "VIP"       },
  { min: 13, max: Infinity,  label: "Legende"   },
];

function globalLevelIdx(shopCount: number): number {
  const idx = GLOBAL_LEVELS.findIndex(l => shopCount <= l.max);
  return idx === -1 ? GLOBAL_LEVELS.length - 1 : idx;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const ICON_KEYWORDS: Record<string, string[]> = {
  scissors: ["friseur","friseuse","frisör","barber","barbershop","haar","haarschnitt","schnitt","salon","herrenfriseur","damenfriseur","stylist","stylistin","barbier","bartpflege","rasur"],
  coffee:   ["café","cafe","kaffee","coffee","espresso","cappuccino","latte","coffeeshop","bäckerei café","kaffeebar","bistro café"],
  utensils: ["restaurant","gaststätte","gaststatte","küche","küche","essen","mittagstisch","abendessen","speiselokal","wirtshaus","gasthaus","food","speisekarte"],
  pizza:    ["pizza","imbiss","döner","doner","kebab","fastfood","fast food","burger","mcdo","pommes","snack","lieferdienst","takeaway","take away","wrap","falafel","currywurst"],
  flame:    ["bäckerei","backerei","konditorei","brot","brötchen","kuchen","backstube","patisserie","torte","gebäck","backwaren"],
  dumbbell: ["gym","fitness","fitnessstudio","sport","training","crossfit","workout","kraftsport","yoga","pilates","boxen","kampfsport","mma","bootcamp","personal trainer"],
  flower:   ["wellness","kosmetik","beauty","spa","massage","nagelstudio","nägel","nagel","wimpern","waxing","maniküre","pediküre","gesichtspflege","aesthetik","ästhetik"],
  shopping: ["laden","shop","markt","supermarkt","lebensmittel","einkaufen","einzelhandel","kiosk","tabak","lotto","blumen","blumenladen","drogerie","apotheke"],
  car:      ["auto","kfz","werkstatt","reifen","garage","autowäsche","tuning","karosserie","pkw","motorrad","bike shop","fahrzeug"],
  book:     ["buch","buchhandlung","literatur","bücher","antiquariat","lesen","bibliothek","schreibwaren","papeterie"],
  bike:     ["fahrrad","rad","fahrradladen","fahrradwerkstatt","cycling","velo","ebike","e-bike","radsport"],
  shirt:    ["mode","fashion","kleidung","bekleidung","textil","boutique","secondhand","second hand","vintage mode","outlet"],
};

function detectIcon(text: string): string {
  if (!text.trim()) return "stamp";
  const q = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [icon, keywords] of Object.entries(ICON_KEYWORDS)) {
    if (keywords.some(kw => {
      const k = kw.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return q.includes(k) || k.includes(q);
    })) return icon;
  }
  return "stamp";
}

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

// ─── ShopListItem ─────────────────────────────────────────────────────────────

function ShopListItem({ shop, index, onSelect }: {
  shop: Doc<"shops">;
  index: number;
  onSelect: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800/60 hover:border-zinc-700 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
        <Store size={16} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-zinc-100 truncate">{shop.name}</p>
        <p className="text-xs text-zinc-500 truncate">{shop.rewardText} · {shop.stampsRequired} Stempel</p>
      </div>
      <ChevronRight size={15} className="text-zinc-600 shrink-0" />
    </motion.button>
  );
}

// ─── ShopDashboard ────────────────────────────────────────────────────────────

function ShopDashboard({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const customers = useQuery(
    api.shops.listCustomersForShop,
    shop.adminLoginToken ? { shopId: shop._id, adminToken: shop.adminLoginToken } : "skip"
  );
  const messages = useQuery(api.messages.getMessagesForShop, { shopId: shop._id, adminSecret });
  const markRead = useMutation(api.messages.markMessagesRead);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const totalStamps  = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
  const totalRewards = customers?.reduce((s, c) => s + c.membership.rewardsRedeemed, 0) ?? 0;

  const base          = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl       = `${base}/join/${shop.slug}`;
  const loginUrl      = `${base}/betrieb/login/${shop.adminLoginToken}`;
  const mitarbeiterUrl = shop.mitarbeiterToken ? `${base}/betrieb/login/${shop.mitarbeiterToken}` : null;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, value: customers?.length ?? "–", label: "Kunden", color: "text-blue-400" },
          { icon: Stamp, value: totalStamps, label: "Stempel", color: "text-amber-400" },
          { icon: Award, value: totalRewards, label: "Belohnungen", color: "text-purple-400" },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center gap-1">
            <Icon size={16} className={color} />
            <p className="text-xl font-bold text-zinc-100">{value}</p>
            <p className="text-[10px] text-zinc-500">{label}</p>
          </div>
        ))}
      </div>

      {/* QR Code */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <QrCode size={14} className="text-amber-400" />
          <span className="text-sm font-medium text-zinc-200">Kunden-QR-Code</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-center">
            <QRImage value={joinUrl} size={150} />
          </div>
          <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
            <code className="text-[11px] text-amber-300 flex-1 truncate">{joinUrl}</code>
            <button onClick={() => copy(joinUrl, "join")} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
              {copied === "join" ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
            </button>
          </div>
          <button onClick={() => printQR(shop.name, joinUrl)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 text-sm transition-colors">
            <Printer size={14} className="text-amber-400" /> Drucken / Druckvorschau
          </button>
        </div>
      </div>

      {/* Login Links */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Link size={14} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-200">Login-Links</span>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <p className="text-[11px] text-zinc-500 mb-1.5">Inhaber (Dashboard + Einstellungen)</p>
            <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
              <code className="text-[11px] text-amber-300 flex-1 truncate">{loginUrl}</code>
              <button onClick={() => copy(loginUrl, "login")} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                {copied === "login" ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
              </button>
            </div>
          </div>
          {mitarbeiterUrl && (
            <div>
              <p className="text-[11px] text-zinc-500 mb-1.5">Mitarbeiter (nur Scanner)</p>
              <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                <code className="text-[11px] text-blue-300 flex-1 truncate">{mitarbeiterUrl}</code>
                <button onClick={() => copy(mitarbeiterUrl, "mitarbeiter")} className="shrink-0 text-zinc-500 hover:text-blue-400 transition-colors">
                  {copied === "mitarbeiter" ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nachrichten */}
      {messages !== undefined && messages.length > 0 && (() => {
        const unread = messages.filter(m => !m.read).length;
        return (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => {
                setMessagesOpen(o => !o);
                if (!messagesOpen && unread > 0) markRead({ shopId: shop._id, adminSecret }).catch(() => {});
              }}
              className="w-full flex items-center gap-2 px-4 py-3 border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
            >
              <MessageSquare size={14} className="text-purple-400" />
              <span className="text-sm font-medium text-zinc-200">Nachrichten</span>
              {unread > 0 && (
                <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500 text-white">{unread}</span>
              )}
              <span className="ml-auto text-xs text-zinc-600">{messages.length}</span>
              <ChevronRight size={13} className={`text-zinc-600 transition-transform ${messagesOpen ? "rotate-90" : ""}`} />
            </button>
            {messagesOpen && (
              <div className="divide-y divide-zinc-800/50 max-h-80 overflow-y-auto">
                {messages.map(msg => (
                  <div key={msg._id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-zinc-300">{msg.customerName}</span>
                      <span className="text-[10px] text-zinc-600">
                        {new Date(msg.createdAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap">{msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Customer list */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Users size={14} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-200">Kunden</span>
          {customers !== undefined && (
            <span className="ml-auto text-xs text-zinc-600">{customers.length}</span>
          )}
        </div>
        <div className="divide-y divide-zinc-800/50">
          {customers === undefined && (
            <div className="px-4 py-6 text-center text-zinc-600 text-sm">Laden...</div>
          )}
          {customers?.length === 0 && (
            <div className="px-4 py-6 text-center text-zinc-600 text-sm">Noch keine Kunden.</div>
          )}
          {customers?.map(({ customer, membership }) => customer && (
            <div key={membership._id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                {customer.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200 truncate">{customer.name}</p>
                <p className="text-[11px] text-zinc-500 truncate">{customer.phone}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-semibold text-amber-400">{membership.currentStamps}/{shop.stampsRequired}</p>
                <p className="text-[10px] text-zinc-600">{membership.totalStampsEver} ges.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ active, onToggle, disabled }: { active: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <button onClick={onToggle} disabled={disabled}
      style={{ minWidth: "2.5rem", height: "1.375rem" }}
      className={`relative rounded-full transition-colors flex items-center px-0.5 disabled:opacity-50 ${active ? "bg-amber-400" : "bg-zinc-700"}`}>
      <motion.div animate={{ x: active ? 18 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-4 h-4 rounded-full bg-white shadow-sm" />
    </button>
  );
}

// ─── ShopEinstellungen ────────────────────────────────────────────────────────

type Tier = { stamps: number; text: string; enabled: boolean };

function ShopEinstellungen({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const adminSetFeatures  = useMutation(api.shops.adminSetFeatures);
  const updateContent     = useMutation(api.shops.adminUpdateShopContent);
  const updateLegalTexts  = useMutation(api.shops.updateLegalTexts);

  // Program
  const [stampsRequired, setStampsRequired] = useState(shop.stampsRequired);
  const [rewardText, setRewardText]         = useState(shop.rewardText);
  const [stampValue, setStampValue]         = useState<number | "">(shop.stampValue ?? "");
  const [tiers, setTiers]         = useState<Tier[]>(shop.rewardTiers?.map(t => ({ ...t })) ?? []);
  const [milestones, setMilestones] = useState<Tier[]>(shop.milestones?.map(m => ({ ...m })) ?? []);
  const [savingContent, setSavingContent] = useState(false);
  const [savedContent, setSavedContent]   = useState(false);

  // Legal
  const [impressumDraft, setImpressumDraft]       = useState(shop.impressumText ?? "");
  const [agbDraft, setAgbDraft]                   = useState(shop.agbText ?? "");
  const [datenschutzDraft, setDatenschutzDraft]   = useState(shop.datenschutzText ?? "");
  const [savingLegal, setSavingLegal]             = useState(false);
  const [savedLegal, setSavedLegal]               = useState(false);

  // Toggles
  const [togglingLeads, setTogglingLeads]           = useState(false);
  const [togglingBonus, setTogglingBonus]           = useState(false);
  const [togglingDesign, setTogglingDesign]         = useState(false);
  const [togglingMilestones, setTogglingMilestones] = useState(false);
  const [settingTheme, setSettingTheme]             = useState<string | null>(null);
  const [clearingTheme, setClearingTheme]           = useState(false);

  const handleSaveContent = async () => {
    setSavingContent(true);
    try {
      await updateContent({
        shopId: shop._id, adminSecret, stampsRequired, rewardText,
        rewardTiers: tiers.length > 0 ? tiers : undefined,
        milestones: milestones.length > 0 ? milestones : undefined,
        stampValue: stampValue === "" ? undefined : Number(stampValue),
      });
      setSavedContent(true);
      setTimeout(() => setSavedContent(false), 2000);
    } finally { setSavingContent(false); }
  };

  const handleSaveLegal = async () => {
    setSavingLegal(true);
    try {
      await updateLegalTexts({
        shopId: shop._id, inhaberToken: shop.adminLoginToken,
        impressumText: impressumDraft || undefined,
        agbText: agbDraft || undefined,
        datenschutzText: datenschutzDraft || undefined,
      });
      setSavedLegal(true);
      setTimeout(() => setSavedLegal(false), 2000);
    } finally { setSavingLegal(false); }
  };

  const toggle = async (
    key: "showLeads" | "bonusProgramEnabled" | "customDesignEnabled" | "milestonesEnabled",
    value: boolean,
    setLoading: (v: boolean) => void
  ) => {
    setLoading(true);
    try { await adminSetFeatures({ shopId: shop._id, adminSecret, [key]: value }); }
    finally { setLoading(false); }
  };

  const handleSetTheme = async (themeName: string, accentColor: string) => {
    setSettingTheme(themeName);
    try { await adminSetFeatures({ shopId: shop._id, adminSecret, theme: themeName, accentColor }); }
    finally { setSettingTheme(null); }
  };

  const addTier = () => {
    const last = tiers[tiers.length - 1]?.stamps ?? stampsRequired;
    setTiers([...tiers, { stamps: last + 5, text: "", enabled: true }]);
  };

  const addMilestone = () => {
    const last = milestones[milestones.length - 1]?.stamps ?? 0;
    setMilestones([...milestones, { stamps: last + 10, text: "", enabled: true }]);
  };

  return (
    <motion.div key="einstellungen" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Programm */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-sm font-semibold text-zinc-200">Programm</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Stempel bis Belohnung</label>
            <input type="number" min={1} max={50} value={stampsRequired}
              onChange={e => setStampsRequired(Number(e.target.value))}
              onFocus={e => e.target.select()}
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Belohnungstext</label>
            <input value={rewardText} onChange={e => setRewardText(e.target.value)}
              placeholder="z.B. 1x Gratis Kaffee"
              className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1.5">Mindesteinkauf pro Stempel (optional)</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">€</span>
                <input type="number" min={1} max={9999} value={stampValue}
                  onChange={e => setStampValue(e.target.value === "" ? "" : Number(e.target.value))}
                  onFocus={e => e.target.select()}
                  placeholder="z.B. 10"
                  className="w-full pl-7 pr-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 text-sm" />
              </div>
              {stampValue !== "" && (
                <button onClick={() => setStampValue("")} className="p-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
            {stampValue !== "" && (
              <p className="text-[10px] text-zinc-600 mt-1">→ „1 Stempel pro €{stampValue} Einkauf"</p>
            )}
          </div>

          {/* Bonus-Stufen */}
          {shop.bonusProgramEnabled && (
            <div className="pt-1 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Bonus-Stufen</p>
              {tiers.map((tier, i) => (
                <div key={i} className="bg-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 flex-1">Stufe {i + 2}</span>
                    <ToggleSwitch active={tier.enabled} disabled={false}
                      onToggle={() => setTiers(tiers.map((t, j) => j === i ? { ...t, enabled: !t.enabled } : t))} />
                    <button onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 transition-colors ml-1">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="number" min={1} value={tier.stamps}
                      onChange={e => setTiers(tiers.map((t, j) => j === i ? { ...t, stamps: Number(e.target.value) } : t))}
                      onFocus={e => e.target.select()}
                      className="w-16 px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 text-xs focus:outline-none text-center" />
                    <span className="text-xs text-zinc-500">Stempel</span>
                  </div>
                  <input value={tier.text}
                    onChange={e => setTiers(tiers.map((t, j) => j === i ? { ...t, text: e.target.value } : t))}
                    placeholder="Belohnungstext..."
                    className="w-full px-2.5 py-1.5 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none" />
                </div>
              ))}
              <button onClick={addTier}
                className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-xs text-zinc-500 hover:text-amber-400 hover:border-amber-400/40 transition-colors flex items-center justify-center gap-1.5">
                <Plus size={13} /> Stufe hinzufügen
              </button>
            </div>
          )}

          {/* Meilensteine */}
          {shop.milestonesEnabled && (
            <div className="pt-1 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Meilensteine</p>
              {milestones.map((m, i) => (
                <div key={i} className="bg-zinc-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 flex-1">Meilenstein {i + 1}</span>
                    <ToggleSwitch active={m.enabled} disabled={false}
                      onToggle={() => setMilestones(milestones.map((ms, j) => j === i ? { ...ms, enabled: !ms.enabled } : ms))} />
                    <button onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 transition-colors ml-1">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="number" min={1} value={m.stamps}
                      onChange={e => setMilestones(milestones.map((ms, j) => j === i ? { ...ms, stamps: Number(e.target.value) } : ms))}
                      onFocus={e => e.target.select()}
                      className="w-16 px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 text-xs focus:outline-none text-center" />
                    <span className="text-xs text-zinc-500">Stempel gesamt</span>
                  </div>
                  <input value={m.text}
                    onChange={e => setMilestones(milestones.map((ms, j) => j === i ? { ...ms, text: e.target.value } : ms))}
                    placeholder="Meilenstein-Beschreibung..."
                    className="w-full px-2.5 py-1.5 bg-zinc-700 border border-zinc-600 rounded-lg text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none" />
                </div>
              ))}
              <button onClick={addMilestone}
                className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-xs text-zinc-500 hover:text-amber-400 hover:border-amber-400/40 transition-colors flex items-center justify-center gap-1.5">
                <Plus size={13} /> Meilenstein hinzufügen
              </button>
            </div>
          )}

          <button onClick={handleSaveContent} disabled={savingContent}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: savedContent ? "#22c55e" : "#fbbf24", color: "#18181b" }}>
            {savingContent ? "Speichert..." : savedContent ? <><Check size={15} /> Gespeichert</> : "Speichern"}
          </button>
        </div>
      </div>

      {/* Funktionen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-sm font-semibold text-zinc-200">Funktionen</p>
        </div>
        <div className="divide-y divide-zinc-800/40">
          {([
            { icon: shop.showLeads ? Eye : EyeOff, label: "Leads sichtbar", active: !!shop.showLeads, onToggle: () => toggle("showLeads", !shop.showLeads, setTogglingLeads), disabled: togglingLeads },
            { icon: TrendingUp, label: "Bonus-Programm", active: !!shop.bonusProgramEnabled, onToggle: () => toggle("bonusProgramEnabled", !shop.bonusProgramEnabled, setTogglingBonus), disabled: togglingBonus },
            { icon: Palette, label: "Eigenes Design", active: !!shop.customDesignEnabled, onToggle: () => toggle("customDesignEnabled", !shop.customDesignEnabled, setTogglingDesign), disabled: togglingDesign },
            { icon: Trophy, label: "Treue-Meilensteine", active: !!shop.milestonesEnabled, onToggle: () => toggle("milestonesEnabled", !shop.milestonesEnabled, setTogglingMilestones), disabled: togglingMilestones },
          ] as { icon: LucideIcon; label: string; active: boolean; onToggle: () => void; disabled: boolean }[]).map(({ icon: Icon, label, active, onToggle, disabled }) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Icon size={14} className={active ? "text-amber-400" : "text-zinc-600"} />
                <span className="text-sm text-zinc-400">{label}</span>
              </div>
              <ToggleSwitch active={active} onToggle={onToggle} disabled={disabled} />
            </div>
          ))}
        </div>
      </div>

      {/* Design */}
      {shop.customDesignEnabled && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-200">Design</p>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { id: "beates-grill", label: "Beate's Grill", color: "#E8A020" },
              { id: "asia-taste",   label: "Asia Taste",    color: "#D2603A" },
              { id: "bakery",       label: "Bäckerei",      color: "#d97706" },
              { id: "barber",       label: "Barbershop",    color: "#cca352" },
              { id: "eiszauber",    label: "Eiszauber",     color: "#ff4fa0" },
            ].map(({ id, label, color }) => (
              <button key={id} onClick={() => handleSetTheme(id, color)} disabled={!!settingTheme}
                className="text-[11px] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                style={shop.theme === id
                  ? { background: color + "33", border: `1px solid ${color}88`, color }
                  : { background: "#27272a", border: "1px solid #3f3f46", color: "#71717a" }}>
                {settingTheme === id ? "..." : label}
              </button>
            ))}
            {shop.theme && (
              <button onClick={async () => { setClearingTheme(true); try { await adminSetFeatures({ shopId: shop._id, adminSecret, clearTheme: true }); } finally { setClearingTheme(false); } }}
                disabled={clearingTheme}
                className="text-[11px] px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-40">
                {clearingTheme ? "..." : "✕ Entfernen"}
              </button>
            )}
          </div>
          {shop.theme && <p className="text-[10px] text-zinc-600">Aktiv: {shop.theme}</p>}
        </div>
      )}

      {/* Rechtliche Texte */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <FileText size={14} className={shop.impressumText ? "text-amber-400" : "text-zinc-500"} />
          <span className="text-sm font-semibold text-zinc-200">Rechtliche Texte</span>
          {shop.impressumText && shop.datenschutzText && <span className="ml-auto text-[10px] text-green-400">✓ vollständig</span>}
          {shop.impressumText && !shop.datenschutzText && <span className="ml-auto text-[10px] text-amber-400">! Datenschutz fehlt</span>}
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: "Impressum", value: impressumDraft, onChange: setImpressumDraft, rows: 6, placeholder: "Angaben gemäß § 5 TMG\n\nMax Mustermann\nMusterstraße 1\n12345 Musterstadt" },
            { label: "AGB", value: agbDraft, onChange: setAgbDraft, rows: 5, placeholder: "Allgemeine Geschäftsbedingungen..." },
            { label: "Datenschutzerklärung", value: datenschutzDraft, onChange: setDatenschutzDraft, rows: 8, placeholder: "Datenschutzerklärung gemäß DSGVO\n\nVerantwortlicher: ..." },
          ].map(({ label, value, onChange, rows, placeholder }) => (
            <div key={label}>
              <label className="text-xs text-zinc-500 block mb-1.5">{label}</label>
              <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:border-amber-400/50 resize-none leading-relaxed" />
            </div>
          ))}
          <button onClick={handleSaveLegal} disabled={savingLegal}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: savedLegal ? "#22c55e" : "#fbbf24", color: "#18181b" }}>
            {savingLegal ? "Speichert..." : savedLegal ? <><Check size={15} /> Gespeichert</> : "Speichern"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── ShopWorkspace ───────────────────────────────────────────────────────────

type SubView = "dashboard" | "analytics" | "einstellungen";

const SUB_TABS: { id: SubView; label: string; icon: LucideIcon }[] = [
  { id: "dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { id: "analytics",     label: "Analytics",     icon: BarChart2       },
  { id: "einstellungen", label: "Einstellungen", icon: Sliders         },
];

function ShopWorkspace({ shop, adminSecret, onBack }: { shop: Doc<"shops">; adminSecret: string; onBack: () => void }) {
  const [subView, setSubView] = useState<SubView>("dashboard");

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={shop.name} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <p className="font-semibold text-zinc-100 truncate">{shop.name}</p>
              <p className="text-[10px] text-zinc-500">{shop.slug}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Admin</span>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pt-5 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {subView === "dashboard"     && <ShopDashboard     key={`${shop._id}-dash`}  shop={shop} adminSecret={adminSecret} />}
          {subView === "analytics"     && <ShopAnalytics     key={`${shop._id}-anal`}  shop={shop} adminSecret={adminSecret} />}
          {subView === "einstellungen" && <ShopEinstellungen key={`${shop._id}-einst`} shop={shop} adminSecret={adminSecret} />}
        </AnimatePresence>
      </div>

      {/* Sub bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex">
        {SUB_TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubView(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${subView === id ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}>
            <Icon size={20} />
            <span className="text-[10px] font-medium">{label}</span>
            {subView === id && (
              <motion.div layoutId="shop-tab-indicator" className="absolute bottom-0 w-8 h-0.5 bg-amber-400 rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CreateShopForm ───────────────────────────────────────────────────────────

function CreateShopForm({ onDone, adminSecret }: { onDone: () => void; adminSecret: string }) {
  const createShop = useMutation(api.shops.createShop);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [stampsRequired, setStampsRequired] = useState(10);
  const [rewardText, setRewardText] = useState("");
  const [brancheText, setBrancheText] = useState("");
  const [stampValue, setStampValue] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stampIcon = detectIcon(brancheText);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await createShop({
        adminSecret, name, slug, stampsRequired, rewardText, stampIcon,
        stampValue: stampValue === "" ? undefined : Number(stampValue),
      });
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally { setLoading(false); }
  };

  return (
    <motion.form onSubmit={handleCreate} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-zinc-100">Neuer Shop</h2>
        <button type="button" onClick={onDone} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
      </div>

      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Branche</label>
        <div className="flex gap-2 items-center">
          <input type="text" value={brancheText} onChange={e => setBrancheText(e.target.value)}
            placeholder="z.B. Barbershop, Café, Pizzeria…"
            className="flex-1 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500" />
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${brancheText.trim() ? "bg-amber-400/15 border border-amber-400/30" : "bg-zinc-800 border border-zinc-700"}`}>
            {(() => { const Icon = STAMP_ICONS[stampIcon] ?? STAMP_ICONS.stamp; return <Icon size={16} className={brancheText.trim() ? "text-amber-400" : "text-zinc-600"} />; })()}
          </div>
        </div>
        {brancheText.trim() && <p className="text-[10px] text-zinc-600 mt-1">Erkannt: <span className="text-zinc-400">{stampIcon}</span></p>}
      </div>

      {[
        { label: "Shop-Name", value: name, onChange: setName, placeholder: "Friseur Müller" },
        { label: "Slug (URL-Kürzel)", value: slug, onChange: (v: string) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "-")), placeholder: "friseur-mueller" },
        { label: "Belohnungstext", value: rewardText, onChange: setRewardText, placeholder: "1x Haarschnitt gratis" },
      ].map(({ label, value, onChange, placeholder }) => (
        <div key={label}>
          <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
          <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required
            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50" />
        </div>
      ))}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Stempel bis Belohnung</label>
        <input type="number" min={1} max={50} value={stampsRequired} onChange={e => setStampsRequired(Number(e.target.value))} onFocus={e => e.target.select()} required
          className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:border-amber-400/50" />
      </div>
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Mindesteinkauf pro Stempel (optional)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">€</span>
          <input type="number" min={1} max={9999} value={stampValue}
            onChange={e => setStampValue(e.target.value === "" ? "" : Number(e.target.value))}
            onFocus={e => e.target.select()}
            placeholder="z.B. 10"
            className="w-full pl-7 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50" />
        </div>
        {stampValue !== "" && (
          <p className="text-[10px] text-zinc-600 mt-1">→ „1 Stempel pro €{stampValue} Einkauf"</p>
        )}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-semibold rounded-xl transition-colors">
        {loading ? "Erstelle..." : "Shop erstellen"}
      </button>
    </motion.form>
  );
}

// ─── OverviewTab ──────────────────────────────────────────────────────────────

function OverviewTab({ adminSecret, onSelectShop }: { adminSecret: string; onSelectShop: (id: Id<"shops">) => void }) {
  const globalStats = useQuery(api.shops.getGlobalStats, adminSecret ? { adminSecret } : "skip");

  if (!globalStats) {
    return (
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
        className="text-zinc-500 text-sm text-center py-16">Laden...</motion.div>
    );
  }

  const statCards = [
    { icon: Store, label: "Shops",       value: globalStats.totalShops,     color: "text-amber-400" },
    { icon: Users, label: "Kunden",      value: globalStats.totalCustomers, color: "text-blue-400"  },
    { icon: Stamp, label: "Stempel",     value: globalStats.totalStamps,    color: "text-green-400" },
    { icon: Award, label: "Belohnungen", value: globalStats.totalRewards,   color: "text-purple-400" },
  ];

  return (
    <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {statCards.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <Icon size={20} className={`${color} mb-3`} />
            <p className="text-3xl font-bold text-zinc-100">{value}</p>
            <p className="text-xs text-zinc-500 mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {globalStats.shops.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-800">
            <Store size={14} className="text-zinc-500" />
            <span className="text-sm font-medium text-zinc-200">Shops</span>
            <span className="ml-auto text-xs text-zinc-600">{globalStats.shops.length}</span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {[...globalStats.shops].sort((a, b) => a.name.localeCompare(b.name)).map((shop, i) => (
              <motion.button key={shop._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.04 }}
                onClick={() => onSelectShop(shop._id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/40 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Store size={13} className="text-amber-400" />
                </div>
                <span className="flex-1 text-sm text-zinc-200 font-medium truncate">{shop.name}</span>
                <ChevronRight size={14} className="text-zinc-600 shrink-0" />
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── ShopsTab ─────────────────────────────────────────────────────────────────

function ShopsTab({ shops, adminSecret, onSelectShop }: {
  shops: Doc<"shops">[] | undefined;
  adminSecret: string;
  onSelectShop: (id: Id<"shops">) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <motion.div key="shops" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-zinc-500">{shops?.length ?? "–"} Shops</p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-medium rounded-xl transition-colors">
          <Plus size={15} /> Neu
        </button>
      </div>

      <AnimatePresence>
        {showCreate && <CreateShopForm onDone={() => setShowCreate(false)} adminSecret={adminSecret} />}
      </AnimatePresence>

      {shops === undefined && (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm text-center py-10">Laden...</motion.div>
      )}
      {shops?.length === 0 && !showCreate && (
        <div className="text-center py-10 text-zinc-600 text-sm">Noch keine Shops. Klicke Neu um den ersten anzulegen.</div>
      )}
      {shops?.map((shop, i) => (
        <ShopListItem key={shop._id} shop={shop} index={i} onSelect={() => onSelectShop(shop._id)} />
      ))}
    </motion.div>
  );
}

// ─── PeriodSelector ───────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "365d" | "all";

const PERIODS: { id: Period; label: string }[] = [
  { id: "7d",   label: "7T"  },
  { id: "30d",  label: "1M"  },
  { id: "90d",  label: "3M"  },
  { id: "365d", label: "1J"  },
  { id: "all",  label: "Alle" },
];

function periodDays(p: Period): number | undefined {
  if (p === "all") return undefined;
  return p === "7d" ? 7 : p === "30d" ? 30 : p === "90d" ? 90 : 365;
}
function periodToSince(p: Period): number | undefined {
  const d = periodDays(p);
  return d !== undefined ? Date.now() - d * 86400000 : undefined;
}
function periodToPrevSince(p: Period): number | undefined {
  const d = periodDays(p);
  return d !== undefined ? Date.now() - 2 * d * 86400000 : undefined;
}
function growthBadge(current: number, prev: number): { label: string; up: boolean | null } {
  if (prev === 0 && current === 0) return { label: "—", up: null };
  if (prev === 0) return { label: "Neu", up: true };
  const pct = Math.round(((current - prev) / prev) * 100);
  return { label: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
      {PERIODS.map(p => (
        <button key={p.id} onClick={() => onChange(p.id)}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={value === p.id
            ? { background: "#fbbf24", color: "#18181b" }
            : { color: "#71717a" }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── AnalyticsTab (globale Gesamt-Auswertung) ─────────────────────────────────

function MiniBarChart({ data }: { data: { dayStart: number; stamps: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.stamps), 1);
  const W = 300; const H = 48; const gap = 2;
  const barW = Math.max(2, Math.floor((W - gap * (data.length - 1)) / data.length));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 48 }}>
      {data.map((d, i) => {
        const h = Math.max(2, Math.round((d.stamps / max) * (H - 4)));
        return (
          <rect key={i}
            x={i * (barW + gap)} y={H - h} width={barW} height={h}
            rx={1} fill="#fbbf24" opacity={0.75}
          />
        );
      })}
    </svg>
  );
}

function GrowthCard({ label, value, prev, color, period }: {
  label: string; value: number; prev: number; color: string; period: Period;
}) {
  const badge = period !== "all" ? growthBadge(value, prev) : null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-1">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 ${
            badge.up === true ? "bg-green-500/15 text-green-400" :
            badge.up === false ? "bg-red-500/15 text-red-400" : "text-zinc-600"}`}>
            {badge.label}
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function AnalyticsTab({ adminSecret }: { adminSecret: string }) {
  const [period, setPeriod] = useState<Period>("all");
  const data = useQuery(api.shops.getGlobalAnalyticsByPeriod, {
    adminSecret,
    since: periodToSince(period),
    prevSince: periodToPrevSince(period),
  });
  const appStats = useQuery(api.shops.getAppUsageStats, { adminSecret });

  return (
    <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      <PeriodSelector value={period} onChange={setPeriod} />

      {data === undefined ? (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm text-center py-10">Laden...</motion.div>
      ) : (
        <>
          {/* Gesamt-Stats mit Wachstum */}
          <div className="grid grid-cols-2 gap-3">
            <GrowthCard label="Stempel"      value={data.stamps}         prev={data.prevStamps}  color="text-amber-400"  period={period} />
            <GrowthCard label="Einlösungen"  value={data.redeems}        prev={data.prevRedeems} color="text-purple-400" period={period} />
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-3xl font-bold text-green-400">{data.activeShops}</p>
              <p className="text-xs text-zinc-500 mt-1">Aktive Shops</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-1">
                <p className="text-3xl font-bold text-blue-400">{data.newCustomers}</p>
                {period !== "all" && (
                  <span className="text-[10px] text-zinc-600 mt-1.5">Neu</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Neue Kunden</p>
            </div>
          </div>

          {/* Tages-Chart */}
          {data.dailyBreakdown.length > 1 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-xs font-semibold text-zinc-400 mb-3">Stempel pro Tag</p>
              <MiniBarChart data={data.dailyBreakdown} />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-zinc-600">
                  {new Date(data.dailyBreakdown[0].dayStart).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {new Date(data.dailyBreakdown[data.dailyBreakdown.length - 1].dayStart).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            </div>
          )}

          {/* Top Kunden */}
          {data.topCustomers.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-sm font-medium text-zinc-200">Top Kunden</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {data.topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-[11px] font-bold w-4 shrink-0"
                      style={{ color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#52525b" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{c.shopName}</p>
                    </div>
                    <p className="text-sm font-bold text-amber-400 shrink-0">{c.stamps}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pro-Shop-Ranking */}
          {data.shops.some(s => s.stamps > 0) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <TrendingUp size={14} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">Shops im Zeitraum</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {data.shops.map((shop, i) => (
                  <div key={shop._id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[11px] font-bold text-zinc-600 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 font-medium truncate">{shop.name}</p>
                      <p className="text-[11px] text-zinc-500">{shop.activeCustomers} Kunden · {shop.redeems}× eingelöst</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-400">{shop.stamps}</p>
                      <p className="text-[10px] text-zinc-600">Stempel</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!data.stamps && !data.redeems && (
            <p className="text-center text-zinc-600 text-sm py-4">Keine Aktivität im gewählten Zeitraum.</p>
          )}

          {/* App Details: Kunden mit 2+ Shops */}
          {appStats && appStats.filter(c => c.shopCount >= 2).length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <LayoutGrid size={14} className="text-amber-400" />
                <span className="text-sm font-medium text-zinc-200">App Details</span>
                <span className="ml-auto text-[10px] text-zinc-500">
                  {appStats.filter(c => c.shopCount >= 2).length} freigeschaltet
                </span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {appStats.filter(c => c.shopCount >= 2).map((c, i) => {
                  const lvlIdx = globalLevelIdx(c.shopCount);
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                        {c.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{c.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {c.shopCount} {c.shopCount === 1 ? "Laden" : "Läden"} · {c.totalStamps} Stempel
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: "#fbbf2420", color: "#fbbf24" }}>
                          LVL {lvlIdx + 1}
                        </span>
                        <p className="text-[9px] text-zinc-600 mt-0.5">{GLOBAL_LEVELS[lvlIdx].label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// ─── ShopAnalytics (pro Shop, wird in ShopWorkspace eingebettet) ──────────────

async function exportShopPdf(shop: Doc<"shops">, period: Period, data: {
  stamps: number; redeems: number; stampValue: number | null;
  rewardBreakdown: { rewardText: string; count: number; valuePerRedemption: number | null }[];
  customers: { customerName: string; stamps: number; redeems: number; currentStamps: number }[];
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const amber: [number, number, number] = [251, 191, 36];
  const dark: [number, number, number]  = [18, 18, 18];
  const mid: [number, number, number]   = [80, 80, 80];
  const light: [number, number, number] = [245, 245, 245];

  const periodLabel = period === "all" ? "Gesamt"
    : period === "7d" ? "Letzte 7 Tage"
    : period === "30d" ? "Letzter Monat"
    : period === "90d" ? "Letzte 3 Monate"
    : "Letztes Jahr";

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...amber);
  doc.rect(0, 0, W, 36, "F");
  doc.setFillColor(...dark);
  doc.rect(0, 0, 5, 36, "F");

  doc.setTextColor(...dark);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(shop.name, 13, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Stempel-Bericht  ·  ${periodLabel}  ·  ${new Date().toLocaleDateString("de-DE")}`, 13, 26);

  // ── Stat-Boxen ──────────────────────────────────────────────────────────────
  let y = 50;
  const bx = [13, 77, 141] as const;
  const bw = 60;
  const bh = 22;
  const statData = [
    { label: "Stempel vergeben", value: String(data.stamps) },
    { label: "Belohnungen eingelöst", value: String(data.redeems) },
    { label: "Aktive Kunden", value: String(data.customers.length) },
  ];
  statData.forEach(({ label, value }, i) => {
    doc.setFillColor(...light);
    doc.rect(bx[i], y, bw, bh, "F");
    doc.setDrawColor(220, 220, 220);
    doc.rect(bx[i], y, bw, bh, "S");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...amber);
    doc.text(value, bx[i] + bw / 2, y + 12, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mid);
    doc.text(label, bx[i] + bw / 2, y + 19, { align: "center" });
  });
  y += bh + 8;

  if (data.stampValue && data.stamps > 0) {
    const est = (data.stamps * data.stampValue).toLocaleString("de-DE");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mid);
    doc.text(`Geschätzter Mindestumsatz: `, 13, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(`€${est}`, 80, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mid);
    doc.text(` (€${data.stampValue} pro Stempel)`, 95, y);
    y += 8;
  }

  // ── Belohnungs-Breakdown ─────────────────────────────────────────────────────
  if (data.rewardBreakdown.length > 0) {
    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(13, y, W - 13, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text("Belohnungen", 13, y);
    y += 7;

    doc.setFillColor(...light);
    doc.rect(13, y - 4, W - 26, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mid);
    doc.text("Belohnung", 15, y);
    doc.text("Anzahl", 148, y, { align: "right" });
    if (data.stampValue) doc.text("Ø Umsatz", W - 15, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "normal");
    let rewardTotal = 0;
    for (const r of data.rewardBreakdown) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setTextColor(...dark);
      doc.text(r.rewardText.slice(0, 55), 15, y);
      doc.setTextColor(...mid);
      doc.text(String(r.count), 148, y, { align: "right" });
      if (r.valuePerRedemption != null && data.stampValue) {
        const tv = r.count * r.valuePerRedemption;
        rewardTotal += tv;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(160, 100, 0);
        doc.text(`€${tv.toLocaleString("de-DE")}`, W - 15, y, { align: "right" });
        doc.setFont("helvetica", "normal");
      }
      y += 5.5;
    }

    if (data.stampValue && rewardTotal > 0) {
      y += 2;
      doc.setDrawColor(200, 200, 200);
      doc.line(130, y, W - 13, y);
      y += 5;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...mid);
      doc.text("Gesamt Belohnungswert:", 130, y);
      doc.setTextColor(...amber);
      doc.text(`€${rewardTotal.toLocaleString("de-DE")}`, W - 15, y, { align: "right" });
      y += 5;
    }
  }

  // ── Kunden-Tabelle ──────────────────────────────────────────────────────────
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(13, y, W - 13, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...dark);
  doc.text("Kunden im Zeitraum", 13, y);
  y += 7;

  doc.setFillColor(...light);
  doc.rect(13, y - 4, W - 26, 6, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...mid);
  doc.text("Name", 15, y);
  doc.text("Stempel", 122, y, { align: "right" });
  doc.text("Eingelöst", 148, y, { align: "right" });
  doc.text("Aktuell", W - 15, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "normal");
  for (let i = 0; i < data.customers.length; i++) {
    const c = data.customers[i];
    if (y > 272) { doc.addPage(); y = 20; }
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(13, y - 3.5, W - 26, 5.5, "F");
    }
    doc.setTextColor(...dark);
    doc.text(c.customerName.slice(0, 42), 15, y);
    doc.setTextColor(...mid);
    doc.text(String(c.stamps), 122, y, { align: "right" });
    doc.text(c.redeems > 0 ? String(c.redeems) : "—", 148, y, { align: "right" });
    doc.text(`${c.currentStamps}/${shop.stampsRequired}`, W - 15, y, { align: "right" });
    y += 5.5;
  }

  // ── Footer (jede Seite) ──────────────────────────────────────────────────────
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...amber);
    doc.rect(0, 289, W, 8, "F");
    doc.setFillColor(...dark);
    doc.rect(0, 289, 5, 8, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.text("Stempelkarten App", 13, 294);
    doc.text(`Seite ${p} / ${pageCount}`, W - 13, 294, { align: "right" });
  }

  const blob = doc.output("blob");
  const file = new File([blob], `${shop.slug}-bericht.pdf`, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: object) => Promise<void> }).share) {
    try {
      await (navigator as Navigator & { share: (d: object) => Promise<void> }).share({ files: [file], title: `${shop.name} Bericht` });
      return;
    } catch { /* fallback to download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function ShopAnalytics({ shop }: { shop: Doc<"shops">; adminSecret: string }) {
  const [period, setPeriod] = useState<Period>("all");
  const [exporting, setExporting] = useState(false);

  const data = useQuery(
    api.shops.getShopAnalyticsByPeriod,
    shop.adminLoginToken
      ? { shopId: shop._id, adminToken: shop.adminLoginToken, since: periodToSince(period) }
      : "skip"
  );

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try { await exportShopPdf(shop, period, data); }
    finally { setExporting(false); }
  };

  return (
    <motion.div key="shop-analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      <PeriodSelector value={period} onChange={setPeriod} />

      {data === undefined ? (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm text-center py-10">Laden...</motion.div>
      ) : (
        <>
          {/* PDF Export */}
          <button
            onClick={handleExport}
            disabled={exporting || !data.customers.length}
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors disabled:opacity-40"
            style={{ background: "#fbbf2415", border: "1px solid #fbbf2440", color: "#fbbf24" }}
          >
            <Printer size={15} />
            {exporting ? "Exportieren..." : "Als PDF exportieren"}
          </button>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Stempel",      value: data.stamps,           color: "text-amber-400"  },
              { label: "Einlösungen",  value: data.redeems,          color: "text-purple-400" },
              { label: "Kunden aktiv", value: data.customers.length, color: "text-blue-400"   },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex flex-col items-center gap-1">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-zinc-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Belohnungs-Breakdown */}
          {data.rewardBreakdown.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <Gift size={14} className="text-purple-400" />
                <span className="text-sm font-medium text-zinc-200">Belohnungen</span>
                {data.stampValue && (
                  <span className="ml-auto text-[10px] text-zinc-500">€{data.stampValue}/Stempel</span>
                )}
              </div>
              <div className="divide-y divide-zinc-800/50">
                {data.rewardBreakdown.map((r) => {
                  const totalValue = r.valuePerRedemption != null ? r.count * r.valuePerRedemption : null;
                  return (
                    <div key={r.rewardText} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-400/10 flex items-center justify-center shrink-0">
                        <Gift size={12} className="text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{r.rewardText}</p>
                        <p className="text-[11px] text-zinc-500">{r.count}× eingelöst</p>
                      </div>
                      {totalValue != null && (
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-amber-400">€{totalValue.toLocaleString("de-DE")}</p>
                          <p className="text-[10px] text-zinc-600">Ø Umsatz</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Gesamtsumme */}
              {data.stampValue && data.rewardBreakdown.some(r => r.valuePerRedemption != null) && (() => {
                const total = data.rewardBreakdown.reduce((s, r) => s + (r.valuePerRedemption ?? 0) * r.count, 0);
                return total > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-800/30">
                    <span className="text-xs font-semibold text-zinc-400">Ø Kundenumsatz (Einlösungszyklen)</span>
                    <span className="text-sm font-bold text-amber-400">€{total.toLocaleString("de-DE")}</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
              <Users size={14} className="text-zinc-500" />
              <span className="text-sm font-medium text-zinc-200">Kunden</span>
            </div>
            <div className="divide-y divide-zinc-800/50">
              {data.customers.length === 0 && (
                <div className="px-4 py-6 text-center text-zinc-600 text-sm">Keine Aktivität im Zeitraum.</div>
              )}
              {data.customers.map((c) => (
                <div key={c.membershipId} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                    {c.customerName[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{c.customerName}</p>
                    <p className="text-[11px] text-zinc-500">
                      +{c.stamps} Stempel{c.redeems > 0 ? ` · ${c.redeems}× eingelöst` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-amber-400">{c.currentStamps}/{shop.stampsRequired}</p>
                    <p className="text-[10px] text-zinc-600">aktuell</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────

function SettingsTab({ adminSecret }: { adminSecret: string }) {
  const clearAllData       = useMutation(api.admin.clearAllData);
  const clearCustomerData  = useMutation(api.admin.clearCustomerData);
  const createTestCustomer = useMutation(api.admin.adminCreateTestCustomer);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customerResetPin, setCustomerResetPin] = useState("");
  const [resettingCustomers, setResettingCustomers] = useState(false);
  const [customersReset, setCustomersReset] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [qrToken, setQrToken] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("adminTestQrToken") ?? "" : ""
  );

  const saveQrToken = (token: string) => {
    setQrToken(token);
    if (token) localStorage.setItem("adminTestQrToken", token);
    else localStorage.removeItem("adminTestQrToken");
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const token = localStorage.getItem("adminTestQrToken") || crypto.randomUUID();
      const res = await createTestCustomer({ adminSecret, qrToken: token, name: "Admin" });
      saveQrToken(res.qrToken);
      localStorage.setItem("qrToken", res.qrToken);
      setRegistered(true);
    } finally { setRegistering(false); }
  };

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
    } finally { setDeleting(false); }
  };

  const handleCustomerReset = async () => {
    setResettingCustomers(true);
    try {
      await clearCustomerData({ adminSecret: customerResetPin });
      setCustomersReset(true);
      setCustomerResetPin("");
      setTimeout(() => setCustomersReset(false), 3000);
    } finally { setResettingCustomers(false); }
  };

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
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

      {/* Gerät zurücksetzen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-zinc-400 shrink-0" />
          <p className="text-sm font-medium text-zinc-200">Gerät zurücksetzen</p>
        </div>
        <p className="text-[11px] text-zinc-500">Löscht alle gespeicherten Tokens auf <span className="text-zinc-400 font-medium">diesem Gerät</span> (QR-Token, Admin-PIN, Shop-Login). Nur lokal — keine Daten in der Datenbank werden gelöscht.</p>
        <button onClick={() => {
          ["qrToken","adminTestQrToken","adminPin","adminToken","adminShopSlug","adminRole","adminPinLS","meAccentColor","meBgPreset","meStarsOn"].forEach(k => localStorage.removeItem(k));
          window.location.reload();
        }} className="w-full py-2.5 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors">
          Lokalen Speicher löschen & neu laden
        </button>
      </div>

      {/* Mein Account */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <User size={14} className="text-zinc-400 shrink-0" />
          <p className="text-sm font-medium text-zinc-200">Mein Account</p>
        </div>
        <p className="text-[11px] text-zinc-500">Erstellt deinen Kunden-Account und verbindet ihn mit /me — einmalig nach jedem Gerät-Reset.</p>
        {registered ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check size={14} /> Registriert! /me ist jetzt aktiv.
            </div>
            <p className="text-[11px] text-zinc-500">QR-Token gespeichert — öffne /me um deine Karte zu sehen.</p>
          </motion.div>
        ) : (
          <button onClick={handleRegister} disabled={registering}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 bg-zinc-800 hover:bg-zinc-700 text-zinc-100">
            {registering ? "Erstelle..." : "Als Admin-Kunde registrieren"}
          </button>
        )}
        {qrToken && !registered && (
          <p className="text-[10px] text-zinc-600">Token vorhanden: <span className="text-zinc-500 font-mono">{qrToken.slice(0, 8)}…</span></p>
        )}
      </div>

      {/* Kunden-Reset */}
      <div className="bg-zinc-900 border border-orange-900/40 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 size={14} className="text-orange-400 shrink-0" />
          <p className="text-sm font-medium text-orange-400">Kunden-Reset</p>
        </div>
        <p className="text-[11px] text-zinc-500">Löscht alle Kunden, Mitgliedschaften und Stempel-Events. <span className="text-zinc-400 font-medium">Shops + Design bleiben erhalten.</span></p>
        {customersReset ? (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Check size={14} /> Kundendaten gelöscht.
          </div>
        ) : (
          <div className="flex gap-2">
            <input type="password" value={customerResetPin} onChange={e => setCustomerResetPin(e.target.value)}
              placeholder="PIN zur Bestätigung"
              className="flex-1 px-3 py-2 bg-zinc-800 border border-orange-900/50 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none text-sm text-center tracking-widest" />
            <button onClick={handleCustomerReset} disabled={resettingCustomers || !customerResetPin}
              className="px-4 py-2 bg-orange-700 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors">
              {resettingCustomers ? "..." : "Reset"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-red-900/40 rounded-2xl overflow-hidden">
        <button onClick={() => { setShowDangerZone(!showDangerZone); setConfirmDelete(false); setDeleteText(""); setPinInput(""); }}
          className="w-full flex items-center gap-2 px-5 py-4 hover:bg-red-900/10 transition-colors">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <span className="text-sm font-medium text-red-400 flex-1 text-left">Alle Daten löschen</span>
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
                    <p className="text-xs text-zinc-500">Löscht alle Shops, Kunden, Stempel und Ereignisse — unwiderruflich.</p>
                    <button onClick={() => setConfirmDelete(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-red-900/30 border border-zinc-700 hover:border-red-900/50 text-zinc-500 hover:text-red-400 rounded-xl text-sm transition-colors">
                      <Trash2 size={14} /> Alle Daten löschen
                    </button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                    <p className="text-sm text-red-300 font-medium">Wirklich alles löschen?</p>
                    <input value={deleteText} onChange={e => setDeleteText(e.target.value)} placeholder="LÖSCHEN eingeben"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-red-900/50 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none text-sm font-mono tracking-wider" />
                    <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Admin-PIN zur Bestätigung"
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-red-900/50 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none text-sm text-center tracking-widest" />
                    <div className="flex gap-2">
                      <button onClick={handleDelete} disabled={deleting || deleteText !== "LÖSCHEN" || !pinInput}
                        className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white font-medium rounded-xl text-sm transition-colors">
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

type Tab = "overview" | "shops" | "analytics" | "settings";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "overview",   label: "Übersicht",    icon: BarChart2  },
  { id: "shops",      label: "Shops",        icon: Store      },
  { id: "analytics",  label: "Analytics",    icon: TrendingUp },
  { id: "settings",   label: "Einstellungen", icon: Settings  },
];

export default function SuperAdminPage() {
  const checkPinMutation = useMutation(api.admin.checkPin);
  const [pin, setPin]               = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [authed, setAuthed]         = useState(false);
  const [checking, setChecking]     = useState(false);
  const [pinError, setPinError]     = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>("overview");
  const [selectedShopId, setSelectedShopId] = useState<Id<"shops"> | null>(null);

  const allShops = useQuery(api.shops.listAllShops, authed && adminSecret ? { adminSecret } : "skip");
  const selectedShop = selectedShopId ? allShops?.find(s => s._id === selectedShopId) : null;

  // Hardware-Back-Button: ShopWorkspace schließen oder App nicht verlassen
  const selectedShopIdRef = useRef<Id<"shops"> | null>(null);
  useEffect(() => { selectedShopIdRef.current = selectedShopId; }, [selectedShopId]);
  useEffect(() => {
    if (!authed) return;
    window.history.pushState({ adminBack: true }, "");
    const handlePop = () => {
      if (selectedShopIdRef.current) {
        setSelectedShopId(null);
      }
      window.history.pushState({ adminBack: true }, "");
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-login from localStorage
  const [didTryAutoLogin, setDidTryAutoLogin] = useState(false);
  if (typeof window !== "undefined" && !didTryAutoLogin && !authed && !checking) {
    const saved = localStorage.getItem("adminPin");
    if (saved) {
      setChecking(true);
      setDidTryAutoLogin(true);
      checkPinMutation({ pin: saved })
        .then(() => { setAdminSecret(saved); setAuthed(true); })
        .catch(() => { localStorage.removeItem("adminPin"); })
        .finally(() => setChecking(false));
    } else {
      setDidTryAutoLogin(true);
    }
  }

  const handleLogin = async () => {
    if (!pin) return;
    setChecking(true); setPinError(null);
    try {
      await checkPinMutation({ pin });
      localStorage.setItem("adminPin", pin);
      setAdminSecret(pin);
      setAuthed(true);
    } catch (err: unknown) {
      setPinError(err instanceof Error ? err.message : "Fehler");
      setPin("");
    } finally { setChecking(false); }
  };

  if (!authed && checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

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
          <input type="password" value={pin} onChange={e => { setPin(e.target.value); setPinError(null); }}
            placeholder="PIN" onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} autoFocus
            className={`w-full px-4 py-3.5 bg-zinc-900 border rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none text-center tracking-widest text-xl transition-colors ${pinError ? "border-red-500/60" : "border-zinc-800 focus:border-amber-400/50"}`} />
          {pinError && <p className="text-red-400 text-sm text-center -mt-2">{pinError}</p>}
          <button onClick={handleLogin} disabled={checking || !pin}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 font-semibold rounded-2xl transition-colors">
            {checking ? "Prüfe..." : "Einloggen"}
          </button>
        </motion.div>
      </div>
    );
  }

  // Shop workspace mode
  if (selectedShopId && selectedShop) {
    return (
      <ShopWorkspace
        shop={selectedShop}
        adminSecret={adminSecret}
        onBack={() => setSelectedShopId(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <div className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-800/60 px-4 py-3 flex items-center gap-3">
        <AnimatePresence mode="wait">
          <motion.span key={activeTab} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
            className="font-semibold text-zinc-100 text-base">
            {activeTab === "overview"  && "Übersicht"}
            {activeTab === "shops"     && "Shops"}
            {activeTab === "analytics" && "Analytics"}
            {activeTab === "settings"  && "Einstellungen"}
          </motion.span>
        </AnimatePresence>
        <span className="ml-auto text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Admin</span>
      </div>

      <div className="flex-1 px-5 pt-5 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "overview"  && <OverviewTab   key="overview"   adminSecret={adminSecret} onSelectShop={id => setSelectedShopId(id)} />}
          {activeTab === "shops"     && <ShopsTab      key="shops"      shops={allShops} adminSecret={adminSecret} onSelectShop={id => { setSelectedShopId(id); }} />}
          {activeTab === "analytics" && <AnalyticsTab  key="analytics"  adminSecret={adminSecret} />}
          {activeTab === "settings"  && <SettingsTab   key="settings" adminSecret={adminSecret} />}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${activeTab === id ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}>
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
