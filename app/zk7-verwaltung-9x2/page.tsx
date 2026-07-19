"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
import { THEME_LIST } from "@/app/me/themes/registry";
import { makeConfigTheme, normalizeDecor, type ShopDesignConfig } from "@/app/me/themes/configTheme";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import QRCode from "qrcode";
import { QRImage } from "@/app/components/QRImage";
import { errMsg } from "@/app/lib/errMsg";

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

// Shop-Name/URL escapen — printQR baut ein HTML-Dokument, unescaped wäre das
// eine XSS-Lücke (Shop-Namen kommen auch aus dem Partner-Formular)
function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function printQR(rawShopName: string, rawUrl: string) {
  const shopName = escHtml(rawShopName);
  const url = escHtml(rawUrl);
  const dataUrl = await QRCode.toDataURL(rawUrl, { width: 400, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  const w = window.open("", "_blank", "width=520,height=640");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${shopName} · QR Code</title>
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
    api.shops.listCustomersForShopAsAdmin,
    { shopId: shop._id, adminSecret }
  );
  const loginLinks = useQuery(api.shops.getLoginLinksForShop, { shopId: shop._id, adminSecret });
  const messages = useQuery(api.messages.getMessagesForShop, { shopId: shop._id, adminSecret });
  const markRead = useMutation(api.messages.markMessagesRead);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const totalStamps  = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
  const totalRewards = customers?.reduce((s, c) => s + c.membership.rewardsRedeemed, 0) ?? 0;

  const base           = typeof window !== "undefined" ? window.location.origin : "";
  const joinUrl        = `${base}/join/${shop.slug}`;
  const loginUrl       = loginLinks ? `${base}/betrieb/login/${loginLinks.adminLoginToken}` : null;
  const mitarbeiterUrl = loginLinks?.mitarbeiterToken ? `${base}/betrieb/login/${loginLinks.mitarbeiterToken}` : null;

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
            {loginUrl ? (
              <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                <code className="text-[11px] text-amber-300 flex-1 truncate">{loginUrl}</code>
                <button onClick={() => copy(loginUrl, "login")} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                  {copied === "login" ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-zinc-600 italic">Laden...</div>
            )}
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
                <p className="text-[11px] text-zinc-500 truncate">{customer.email}</p>
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

function ShopEinstellungen({ shop, adminSecret, onDeleted }: { shop: Doc<"shops">; adminSecret: string; onDeleted: () => void }) {
  const adminSetFeatures  = useMutation(api.shops.adminSetFeatures);
  const updateContent     = useMutation(api.shops.adminUpdateShopContent);
  const updateLegalTexts  = useMutation(api.shops.adminUpdateLegalTexts);
  const deleteShop        = useMutation(api.shops.adminDeleteShop);

  const shopActive = shop.active !== false; // fehlend = aktiv
  const [togglingActive, setTogglingActive] = useState(false);
  const [deleting, setDeleting]             = useState(false);

  const handleToggleActive = async () => {
    setTogglingActive(true);
    try { await adminSetFeatures({ shopId: shop._id, adminSecret, active: !shopActive }); }
    finally { setTogglingActive(false); }
  };

  const handleDeleteShop = async () => {
    if (!window.confirm(`Shop „${shop.name}" wirklich KOMPLETT löschen? Alle Kundenkarten, Stempel und Nachrichten dieses Shops werden unwiderruflich gelöscht.`)) return;
    setDeleting(true);
    try {
      await deleteShop({ shopId: shop._id, adminSecret });
      // Sync: zugehörigen Lead + Vertrag + Provisionen in der Affiliate-App
      // mitlöschen, damit der Shop auch beim Partner/in den Finanzen verschwindet.
      try { await affiliateMutation("admin:deleteLeadForShop", { adminSecret, loatycardShopId: shop._id }); }
      catch { /* Shop ist gelöscht — Affiliate-Sync-Fehler nicht blockierend */ }
      onDeleted();
    }
    catch (e) { alert(errMsg(e, "Fehler beim Löschen")); setDeleting(false); }
  };

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
        shopId: shop._id, adminSecret,
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

      {/* Shop-Status (aktiv/deaktiviert) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${shopActive ? "bg-green-500" : "bg-red-500"}`} />
          <div>
            <p className="text-sm font-semibold text-zinc-200">Shop {shopActive ? "aktiv" : "deaktiviert"}</p>
            <p className="text-[10px] text-zinc-500">{shopActive ? "Kunden können Stempel sammeln" : "Stempeln ist gesperrt"}</p>
          </div>
        </div>
        <ToggleSwitch active={shopActive} onToggle={handleToggleActive} disabled={togglingActive} />
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

      {/* Signature-Themes */}
      {shop.customDesignEnabled && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-200">Signature-Themes</p>
          <div className="flex gap-1.5 flex-wrap">
            {THEME_LIST.map(({ id, label, color }) => (
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
        </div>
      )}

      {/* Design-Editor (Config-Design) */}
      {shop.customDesignEnabled && <DesignEditor shop={shop} adminSecret={adminSecret} />}

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

      {/* Gefahrenzone: Shop löschen */}
      <div className="bg-zinc-900 border border-red-900/40 rounded-2xl p-4 space-y-2">
        <p className="text-sm font-semibold text-red-400">Gefahrenzone</p>
        <p className="text-[11px] text-zinc-500">Löscht diesen Shop samt aller Kundenkarten, Stempel und Nachrichten. Nicht umkehrbar.</p>
        <button onClick={handleDeleteShop} disabled={deleting}
          className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-900/30 border border-red-900/50 text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50">
          {deleting ? "Löscht..." : "Shop komplett löschen"}
        </button>
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
          {subView === "einstellungen" && <ShopEinstellungen key={`${shop._id}-einst`} shop={shop} adminSecret={adminSecret} onDeleted={onBack} />}
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

// ─── DesignEditor (Config-Design, 99€-Produkt) ────────────────────────────────
// Baut das Kunden-Design aus DB-Daten zusammen: Farben, Hintergrund, Logo,
// Stempel-Icon, Kartenstil — mit Live-Vorschau. Kein Code/Deploy pro Shop.

// Farbpalette: gedeckte Töne quer durch alle Farbbereiche. Ein Klick leitet
// daraus ein komplettes, dezentes Farbschema ab (Karte, Hintergrund, Texte) —
// keine benannten Vorlagen mehr, nur Farbton wählen + Feinschliff darunter.
const COLOR_PALETTE = [
  "#c9a560", "#b08d57", "#b57e5e", "#b5694a", "#c67d5b", "#b87070",
  "#c69fa5", "#a4586a", "#96566e", "#8b6b8f", "#a596c7", "#8b7bbf",
  "#7d92c4", "#5b89b4", "#8ba3b8", "#6e8fa3", "#6aa5a8", "#4a9494",
  "#5f9e7a", "#9caf88", "#7a8f4a", "#a8a678", "#b8a98a", "#d7d2c6",
];

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const to = (t: number) => Math.round(hue2rgb(p, q, t) * 255).toString(16).padStart(2, "0");
  return `#${to(h + 1 / 3)}${to(h)}${to(h - 1 / 3)}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

// Leitet aus einem Palettenton ein stimmiges, gedecktes Schema ab. Sättigung
// wird gedeckelt, damit auch kräftige Töne dezent bleiben; im Hell-Modus wird
// die Akzentfarbe bei Bedarf abgedunkelt (Kontrast auf hellem Grund).
function deriveScheme(base: string, mode: "dark" | "light") {
  const [h, s, l] = hexToHsl(base);
  const sat = Math.min(s, 0.45);
  if (mode === "dark") {
    return {
      accent:   base,
      text:     hslToHex(h, sat * 0.35, 0.92),
      textBody: hslToHex(h, sat * 0.3, 0.62),
      cardBg:   hslToHex(h, sat * 0.5, 0.09),
      bgColor:  hslToHex(h, sat * 0.5, 0.05),
      bgColor2: hslToHex(h, sat * 0.5, 0.11),
    };
  }
  return {
    accent:   l > 0.55 ? hslToHex(h, Math.min(s + 0.08, 0.5), 0.42) : base,
    text:     hslToHex(h, sat * 0.7, 0.16),
    textBody: hslToHex(h, sat * 0.45, 0.4),
    cardBg:   hslToHex(h, sat * 0.5, 0.975),
    bgColor:  hslToHex(h, sat * 0.55, 0.94),
    bgColor2: hslToHex(h, sat * 0.6, 0.88),
  };
}

// Gruppiert die Editor-Bereiche optisch (Übersichtlichkeit)
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 space-y-2">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{title}</p>
      {children}
    </div>
  );
}

// Auswahlfarben für die Farbfelder: gedeckte Töne + Neutral-/Hell-/Dunkeltöne
// (für Text- und Flächenfarben), Stil wie die Akzentfarben-Auswahl in /me.
const FIELD_COLORS = [
  ...COLOR_PALETTE,
  "#f4f4f5", "#f0e9db", "#d4d4d8", "#a1a1aa", "#71717a", "#3f3f46", "#18181b", "#0b0b0d",
];

// Benutzerdefinierte Farbwahl: großes Sättigungs-/Helligkeitsfeld + Farbton-
// Leiste zum Tippen/Ziehen — ersetzt den nativen Browser-Picker.
function CustomColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value));
  // Extern gesetzte Farbe (z.B. Swatch-Klick) übernehmen; eigene Updates
  // erzeugen denselben Hex und lösen dadurch kein Zurücksetzen aus.
  useEffect(() => {
    if (hsvToHex(hsv[0], hsv[1], hsv[2]).toLowerCase() !== value.toLowerCase()) setHsv(hexToHsv(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const [h, s, v] = hsv;
  const apply = (next: [number, number, number]) => { setHsv(next); onChange(hsvToHex(next[0], next[1], next[2])); };

  const pickSV = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    apply([h, x, 1 - y]);
  };
  const pickHue = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    apply([Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1), s, v]);
  };
  const drag = (fn: (e: React.PointerEvent<HTMLDivElement>) => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); fn(e); },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => { if (e.buttons) fn(e); },
  });

  return (
    <div className="space-y-2">
      <div className="relative h-28 rounded-xl border border-zinc-700 cursor-crosshair touch-none"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${Math.round(h * 360)},100%,50%))` }}
        {...drag(pickSV)}>
        <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: value }} />
      </div>
      <div className="relative h-3.5 rounded-full border border-zinc-700 cursor-pointer touch-none"
        style={{ background: `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map(d => `hsl(${d},70%,55%)`).join(",")})` }}
        {...drag(pickHue)}>
        <div className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${h * 100}%`, background: `hsl(${Math.round(h * 360)},70%,55%)` }} />
      </div>
    </div>
  );
}

// Farbfeld wie im /me-Bereich: aufklappbares Swatch-Grid + Benutzerdefiniert.
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const sel = value.toLowerCase();
  return (
    <div className="bg-zinc-800/50 rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="min-w-0 text-left">
          <p className="text-[11px] text-zinc-400 truncate">{label}</p>
          <p className="text-[9px] font-mono text-zinc-600">{value}</p>
        </div>
        <span className="w-7 h-7 shrink-0 rounded-lg border"
          style={{ background: value, borderColor: open ? "#a1a1aa" : "#3f3f46" }} />
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          <div className="grid grid-cols-8 gap-1.5">
            {FIELD_COLORS.map(c => (
              <button key={c} type="button" onClick={() => onChange(c)}
                className="aspect-square rounded-lg transition-transform hover:scale-110"
                style={{
                  background: c,
                  border: sel === c ? "2px solid #fff" : "2px solid rgba(0,0,0,.35)",
                  boxShadow: sel === c ? "0 0 8px rgba(255,255,255,.25)" : undefined,
                }} />
            ))}
          </div>
          <button type="button" onClick={() => setCustom(c => !c)}
            className="w-full py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors">
            Benutzerdefiniert {custom ? "▴" : "▾"}
          </button>
          {custom && <CustomColorPicker value={value} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

function DesignEditor({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const generateUploadUrl = useMutation(api.shops.adminGenerateUploadUrl);
  const setDesignConfig   = useMutation(api.shops.adminSetDesignConfig);

  const dc = shop.designConfig;
  const [open, setOpen] = useState(!!dc);

  // Farben
  const [accent, setAccent]     = useState(dc?.accent   ?? shop.accentColor ?? "#fbbf24");
  const [text, setText]         = useState(dc?.text     ?? "#f4f4f5");
  const [textBody, setTextBody] = useState(dc?.textBody ?? "#a1a1aa");
  const [cardBg, setCardBg]     = useState(dc?.cardBg   ?? "#18181b");
  // Hintergrund
  const [bgType, setBgType]     = useState<"color" | "gradient" | "image">(dc?.bgType ?? "color");
  const [bgColor, setBgColor]   = useState(dc?.bgColor  ?? "#09090b");
  const [bgColor2, setBgColor2] = useState(dc?.bgColor2 ?? "#1c1917");
  const [bgImageId, setBgImageId]     = useState<Id<"_storage"> | undefined>(dc?.bgImageId);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | undefined>(dc?.bgImageUrl);
  // Logo
  const [logoId, setLogoId]           = useState<Id<"_storage"> | undefined>(dc?.logoId);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | undefined>(dc?.logoUrl);
  // Stempel & Stil
  const [icon, setIcon]           = useState(dc?.stampIcon ?? shop.stampIcon ?? "stamp");
  const [decor, setDecor]         = useState<"none" | "thin" | "double" | "swirl">(normalizeDecor(dc?.decor));
  // Farbpalette: gewählter Grundton + Hell/Dunkel für das abgeleitete Schema
  const [paletteSel, setPaletteSel]   = useState<string | null>(null);
  const [paletteMode, setPaletteMode] = useState<"dark" | "light">("dark");

  const applyPalette = (base: string, mode: "dark" | "light" = paletteMode) => {
    const s = deriveScheme(base, mode);
    setPaletteSel(base);
    setAccent(s.accent); setText(s.text); setTextBody(s.textBody); setCardBg(s.cardBg);
    setBgType("gradient"); setBgColor(s.bgColor); setBgColor2(s.bgColor2);
  };

  const [uploading, setUploading] = useState<"logo" | "bg" | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [err, setErr]             = useState("");

  const uploadFile = async (file: File): Promise<Id<"_storage">> => {
    const url = await generateUploadUrl({ adminSecret });
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file });
    if (!res.ok) throw new Error("Upload fehlgeschlagen");
    const { storageId } = await res.json();
    return storageId as Id<"_storage">;
  };

  const handleUpload = (kind: "logo" | "bg") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(kind); setErr("");
    try {
      const id = await uploadFile(file);
      const preview = URL.createObjectURL(file);
      if (kind === "logo") { setLogoId(id); setLogoPreviewUrl(preview); }
      else { setBgImageId(id); setBgPreviewUrl(preview); setBgType("image"); }
    } catch (ex: unknown) {
      setErr(errMsg(ex, "Upload fehlgeschlagen"));
    } finally { setUploading(null); e.target.value = ""; }
  };

  // Live-Vorschau: dieselbe Komponente, die auch die Kunden sehen
  const previewCfg: ShopDesignConfig = useMemo(() => ({
    accent, text, textBody, cardBg, bgType, bgColor, bgColor2,
    bgImageUrl: bgPreviewUrl, logoUrl: logoPreviewUrl, stampIcon: icon, decor,
  }), [accent, text, textBody, cardBg, bgType, bgColor, bgColor2, bgPreviewUrl, logoPreviewUrl, icon, decor]);
  const previewTheme = useMemo(() => makeConfigTheme(previewCfg), [previewCfg]);

  const previewBg: React.CSSProperties = bgType === "image" && bgPreviewUrl
    ? { backgroundImage: `url('${bgPreviewUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }
    : bgType === "gradient"
      ? { background: `linear-gradient(180deg, ${bgColor} 0%, ${bgColor2} 100%)` }
      : { background: bgColor };

  const handleSave = async () => {
    setSaving(true); setErr(""); setSaved(false);
    try {
      await setDesignConfig({
        shopId: shop._id, adminSecret,
        config: {
          accent, text, textBody, cardBg, bgType,
          bgColor, bgColor2, bgImageId, logoId,
          stampIcon: icon, decor,
        },
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (ex: unknown) {
      setErr(errMsg(ex, "Fehler beim Speichern"));
    } finally { setSaving(false); }
  };

  const handleRemove = async () => {
    if (!window.confirm("Eigenes Design entfernen? Der Shop nutzt dann wieder den Standard-Look.")) return;
    setSaving(true); setErr("");
    try { await setDesignConfig({ shopId: shop._id, adminSecret, config: null }); }
    catch (ex: unknown) { setErr(errMsg(ex, "Fehler")); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left">
        <Palette size={14} className={dc ? "text-amber-400" : "text-zinc-500"} />
        <span className="text-sm font-semibold text-zinc-200">Design-Editor</span>
        {dc && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400">aktiv</span>}
        <ChevronRight size={14} className={`ml-auto text-zinc-600 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
          {shop.theme && (
            <p className="text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/25 rounded-lg px-2.5 py-2">
              Signature-Theme „{shop.theme}" ist aktiv und überdeckt den Editor. Beim Speichern hier wird es automatisch ersetzt.
            </p>
          )}

          {/* Farbpalette: Ton anklicken → komplettes dezentes Schema */}
          <Section title="Farbpalette (Ton wählen, setzt das ganze Schema)">
            <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
              {([
                { id: "dark",  label: "Dunkel" },
                { id: "light", label: "Hell"   },
              ] as const).map(m => (
                <button key={m.id} type="button"
                  onClick={() => { setPaletteMode(m.id); if (paletteSel) applyPalette(paletteSel, m.id); }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={paletteMode === m.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {COLOR_PALETTE.map(c => (
                <button key={c} type="button" onClick={() => applyPalette(c)}
                  className="aspect-square rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    border: paletteSel === c ? "2px solid #fff" : "2px solid rgba(0,0,0,.35)",
                    boxShadow: paletteSel === c ? `0 0 8px ${c}88` : undefined,
                  }} />
              ))}
            </div>
          </Section>

          {/* Farben (Feinschliff) */}
          <Section title="Farben (Feinschliff)">
            <ColorField label="Akzentfarbe"  value={accent}   onChange={setAccent} />
            <ColorField label="Überschrift"  value={text}     onChange={setText} />
            <ColorField label="Text"         value={textBody} onChange={setTextBody} />
            <ColorField label="Kartenfläche" value={cardBg}   onChange={setCardBg} />
          </Section>

          {/* Hintergrund */}
          <Section title="Hintergrund">
            <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
              {([
                { id: "color",    label: "Farbe"   },
                { id: "gradient", label: "Verlauf" },
                { id: "image",    label: "Foto"    },
              ] as const).map(t => (
                <button key={t.id} type="button" onClick={() => setBgType(t.id)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={bgType === t.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
                  {t.label}
                </button>
              ))}
            </div>
            {bgType !== "image" && (
              <>
                <ColorField label={bgType === "gradient" ? "Farbe oben" : "Hintergrundfarbe"} value={bgColor} onChange={setBgColor} />
                {bgType === "gradient" && <ColorField label="Farbe unten" value={bgColor2} onChange={setBgColor2} />}
              </>
            )}
            {bgType === "image" && (
              <label className="block">
                <span className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-700 transition-colors">
                  {uploading === "bg" ? "Lädt hoch…" : bgPreviewUrl ? "Hintergrundfoto ändern" : "Hintergrundfoto hochladen"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload("bg")} disabled={uploading !== null} />
              </label>
            )}
          </Section>

          {/* Logo & Stempel-Icon */}
          <Section title="Logo & Stempel-Icon">
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-700 transition-colors">
                  {uploading === "logo" ? "Lädt hoch…" : logoPreviewUrl ? "Logo ändern" : "Logo hochladen (statt Shopname)"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload("logo")} disabled={uploading !== null} />
              </label>
              {logoPreviewUrl && (
                <button type="button" onClick={() => { setLogoId(undefined); setLogoPreviewUrl(undefined); }}
                  className="px-2.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 text-xs transition-colors">✕</button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap max-h-40 overflow-y-auto pr-1">
              {Object.entries(STAMP_ICONS).map(([key, IconComp]) => (
                <button key={key} type="button" onClick={() => setIcon(key)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                  style={icon === key
                    ? { background: `${accent}22`, border: `1px solid ${accent}66` }
                    : { background: "#27272a", border: "1px solid #3f3f46" }}>
                  <IconComp size={15} style={{ color: icon === key ? accent : "#71717a" }} />
                </button>
              ))}
            </div>
          </Section>

          {/* Ecken-Verzierung in Akzentfarbe */}
          <Section title="Ecken">
            <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
              {([
                { id: "none",   label: "Ohne"        },
                { id: "thin",   label: "Fein"        },
                { id: "double", label: "Doppelt"     },
                { id: "swirl",  label: "Geschwungen" },
              ] as const).map(d => (
                <button key={d.id} type="button" onClick={() => setDecor(d.id)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={decor === d.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
                  {d.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Live-Vorschau */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Vorschau (so sieht es der Kunde)</p>
            <div className="rounded-2xl p-4 space-y-3 border border-zinc-800" style={previewBg}>
              <previewTheme.Card
                shopName={shop.name}
                stampsRequired={shop.stampsRequired}
                currentStamps={Math.min(4, shop.stampsRequired)}
                animateIndex={null}
                qrToken="preview"
                onShowQR={() => {}}
                rewardTiers={shop.bonusProgramEnabled ? shop.rewardTiers : undefined}
                stampValue={shop.stampValue}
                cardNumber={1}
              />
              <previewTheme.Banner
                rewardText={shop.rewardText}
                stampsRequired={shop.stampsRequired}
                rewardTiers={shop.bonusProgramEnabled ? shop.rewardTiers : undefined}
              />
            </div>
          </div>

          {err && <p className="text-red-400 text-xs">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving || uploading !== null}
              className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 text-sm font-semibold rounded-xl transition-colors">
              {saving ? "Speichert…" : saved ? "Gespeichert ✓" : "Design speichern"}
            </button>
            {dc && (
              <button type="button" onClick={handleRemove} disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 text-sm transition-colors disabled:opacity-50">
                Entfernen
              </button>
            )}
          </div>
        </div>
      )}
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
  const [ownerName, setOwnerName]   = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [rewardCount, setRewardCount] = useState(0);
  const [planType, setPlanType] = useState<"annual" | "monthly">("annual");
  const [payLink, setPayLink]   = useState("");
  const [copied, setCopied]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stampIcon = detectIcon(brancheText);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const created = await createShop({
        adminSecret, name, slug, stampsRequired, rewardText, stampIcon,
        stampValue:       stampValue === "" ? undefined : Number(stampValue),
        ownerName:        ownerName  || undefined,
        ownerEmail:       ownerEmail || undefined,
        ownerPhone:       ownerPhone || undefined,
        rewardCount:      rewardCount || undefined,
      });

      // Vertrag im Partnerprogramm registrieren (Direktvertrieb, 0% Provision)
      // → Zahlung läuft über den normalen Bezahllink, Umsatz landet in den Finanzen.
      try {
        const contract = await affiliateMutation("admin:createDirectShopContract", {
          adminSecret,
          shopName:            name,
          ownerName:           ownerName   || undefined,
          ownerEmail:          ownerEmail  || undefined,
          ownerPhone:          ownerPhone  || undefined,
          businessType:        brancheText || undefined,
          planType,
          rewardCount:         rewardCount || undefined,
          loatycardShopId:     created.shopId,
          loatycardShopSlug:   created.slug,
          loatycardAdminToken: created.adminLoginToken,
        });
        if (contract?.paymentToken) {
          setPayLink(`${AFFILIATE_APP_URL}/pay/${contract.paymentToken}`);
          return;
        }
        setError("Shop erstellt, aber kein Bezahllink erhalten (Affiliate-App nicht konfiguriert?)");
      } catch (err: unknown) {
        setError(`Shop erstellt, aber Vertrag fehlgeschlagen: ${errMsg(err, "Fehler")}`);
      }
    } catch (err: unknown) {
      setError(errMsg(err, "Fehler"));
    } finally { setLoading(false); }
  };

  const copyPayLink = async () => {
    try { await navigator.clipboard.writeText(payLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  if (payLink) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="font-semibold text-zinc-100">Shop erstellt</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Vertrag ({planType === "annual" ? "Jahresabo" : "Monatsabo"}) ist angelegt. Über den Bezahllink
          wird bezahlt. Der Rabattcode kann direkt auf der Zahlungsseite eingegeben werden. Nach der Zahlung
          erscheint der Umsatz automatisch in den Finanzen.
        </p>
        {/* Zahlungs-QR: Inhaber scannt und landet auf der Zahlungsseite */}
        <div className="flex flex-col items-center gap-2 py-1">
          <QRImage value={payLink} size={160} />
          <p className="text-[10px] text-zinc-600">QR scannen → Zahlungsseite öffnet sich</p>
        </div>
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-300 break-all">{payLink}</div>
        <div className="flex gap-2">
          <button type="button" onClick={copyPayLink}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-sm font-semibold rounded-xl transition-colors">
            {copied ? "Kopiert ✓" : "Link kopieren"}
          </button>
          <button type="button" onClick={onDone}
            className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 text-sm font-semibold rounded-xl transition-colors">
            Fertig
          </button>
        </div>
      </motion.div>
    );
  }

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
      {/* Inhaber-Infos */}
      <div className="pt-2 border-t border-zinc-800 space-y-3">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Inhaber (für Bestätigungsmail)</p>
        {[
          { label: "Name",    value: ownerName,  set: setOwnerName,  placeholder: "Max Müller",    type: "text"  },
          { label: "E-Mail",  value: ownerEmail, set: setOwnerEmail, placeholder: "max@cafe.de",   type: "email" },
          { label: "Telefon", value: ownerPhone, set: setOwnerPhone, placeholder: "+49 ...",       type: "tel"   },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-xs text-zinc-500 mb-1.5">{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
              placeholder={f.placeholder}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50" />
          </div>
        ))}

        <div className="rounded-xl p-3 bg-amber-400/10 border border-amber-400/25">
          <p className="text-sm font-semibold text-zinc-100">Einrichtung & individuelles Design</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">Einmalig €99, bei jedem Shop automatisch dabei.</p>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-2">Bonusprogramm: Anzahl Belohnungen</label>
          <div className="rounded-xl p-3 flex items-center justify-between bg-zinc-800 border border-zinc-700">
            <div>
              <p className="text-sm font-semibold text-zinc-100">{rewardCount} Belohnung{rewardCount === 1 ? "" : "en"}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                €5/Monat pro Belohnung{planType === "annual" ? " (€60/Jahr)" : ""}
                {rewardCount > 0 && ` · gesamt ${planType === "annual" ? `€${rewardCount * 60}/Jahr` : `€${rewardCount * 5}/Monat`}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setRewardCount(c => Math.max(0, c - 1))}
                className="w-9 h-9 rounded-lg text-lg font-bold text-zinc-100 bg-zinc-700 border border-zinc-600">−</button>
              <button type="button" onClick={() => setRewardCount(c => Math.min(20, c + 1))}
                className="w-9 h-9 rounded-lg text-lg font-bold text-zinc-900 bg-amber-400">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Vertrag / Abo */}
      <div className="pt-2 border-t border-zinc-800 space-y-2">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Vertrag (Finanzen)</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: "annual",  label: "Jahresabo",  sub: "€240/Jahr" },
            { id: "monthly", label: "Monatsabo",  sub: "€20/Monat" },
          ] as const).map(opt => (
            <button key={opt.id} type="button" onClick={() => setPlanType(opt.id)}
              className="rounded-xl p-3 text-center transition-colors"
              style={planType === opt.id
                ? { background: "rgba(251,191,36,.12)", border: "1px solid rgba(251,191,36,.4)" }
                : { background: "rgb(39,39,42)",        border: "1px solid rgb(63,63,70)" }}>
              <p className={`text-sm font-semibold leading-none ${planType === opt.id ? "text-amber-400" : "text-zinc-100"}`}>{opt.label}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{opt.sub}</p>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600">
          Nach dem Erstellen bekommst du Bezahllink + QR (Rabattcode auf der Zahlungsseite eingebbar). Der Umsatz zählt nach Zahlung in den Finanzen.
        </p>
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

type EarningsSummary = {
  revenueTotal: number; commTotal: number; commPaid: number;
  commConfirmed: number; commPending: number; netEarnings: number; activeContracts: number;
  // Vertrags-Aufschlüsselung (ältere Server-Version liefert die Felder noch nicht)
  payingContracts?: number; payingMonthly?: number; payingAnnual?: number;
  awaitingPayment?: number; canceledContracts?: number;
  monthlyRunRate?: number; yearlyRunRate?: number;
};

type PaymentRow = {
  date: number; shopName: string; planType: "annual" | "monthly"; paymentNumber: number;
  paidAmount: number; commission: number; commissionStatus: string; direct: boolean;
  discountCode: string | null;
};

function groupPayments(payments: PaymentRow[], mode: "month" | "year") {
  const map = new Map<string, { label: string; sort: number; count: number; revenue: number; commission: number }>();
  for (const p of payments) {
    const d = new Date(p.date);
    const key = mode === "month"
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : String(d.getFullYear());
    const g = map.get(key) ?? {
      label: mode === "month"
        ? d.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
        : String(d.getFullYear()),
      sort:  mode === "month" ? d.getFullYear() * 12 + d.getMonth() : d.getFullYear(),
      count: 0, revenue: 0, commission: 0,
    };
    g.count++; g.revenue += p.paidAmount; g.commission += p.commission;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.sort - a.sort);
}

function EarningsCard({ adminSecret }: { adminSecret: string }) {
  const [data, setData] = useState<null | EarningsSummary>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!adminSecret) return;
    // Einnahmen über die reguläre, secret-geschützte Query abrufen — mit dem
    // zur Laufzeit eingegebenen Admin-PIN. Kein Secret im Client-Bundle.
    affiliateQuery("admin:getEarningsSummary", { adminSecret })
      .then(setData).catch(() => {});
  }, [adminSecret]);

  if (!data) return null;

  return (
    <>
      <button type="button" onClick={() => setShowDetail(true)}
        className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition-colors">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <TrendingUp size={14} className="text-green-400" />
          <span className="text-sm font-semibold text-zinc-200">Finanzen</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500">
            Details <ChevronRight size={12} />
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-green-400">€{data.revenueTotal.toFixed(2)}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">alle eingegangenen Zahlungen</p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Mein Anteil</p>
              <p className="text-2xl font-bold text-amber-400">€{data.netEarnings.toFixed(2)}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">nach Provisionen</p>
            </div>
          </div>

          {/* Verträge: nur wer gezahlt hat, zählt als wirklich aktiv */}
          {data.payingContracts !== undefined && (
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Verträge</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Zahlende Shops</span>
                <span className="text-sm font-semibold text-green-400">
                  {data.payingContracts}
                  <span className="text-[10px] text-zinc-600 font-normal">
                    {" "}({data.payingAnnual ?? 0}× Jahr, {data.payingMonthly ?? 0}× Monat)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Warten auf Zahlung</span>
                <span className="text-sm font-semibold text-yellow-400">{data.awaitingPayment ?? 0}</span>
              </div>
              {(data.canceledContracts ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Gekündigt</span>
                  <span className="text-sm font-semibold text-zinc-400">{data.canceledContracts}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                <span className="text-xs text-zinc-400 font-semibold">Laufender Abo-Umsatz</span>
                <span className="text-sm font-bold text-green-400">
                  €{(data.monthlyRunRate ?? 0).toFixed(2)}/Monat
                  <span className="text-[10px] text-zinc-600 font-normal"> (€{(data.yearlyRunRate ?? 0).toFixed(0)}/Jahr)</span>
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-3 space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Provisionen an Partner</p>
            {[
              { label: "Ausstehend",  value: data.commPending,   color: "text-yellow-400" },
              { label: "Bestätigt",   value: data.commConfirmed, color: "text-blue-400"   },
              { label: "Ausgezahlt",  value: data.commPaid,      color: "text-zinc-400"   },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{r.label}</span>
                <span className={`text-sm font-semibold ${r.color}`}>€{r.value.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
              <span className="text-xs text-zinc-400 font-semibold">Gesamt Provisionen</span>
              <span className="text-sm font-bold text-red-400">– €{data.commTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {showDetail && (
          <FinanceDetailModal adminSecret={adminSecret} summary={data} onClose={() => setShowDetail(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Finanzen-Detailansicht (Monate / Jahre / Zahlungen + PDF-Export) ─────────

function FinanceDetailModal({ adminSecret, summary, onClose }: {
  adminSecret: string; summary: EarningsSummary; onClose: () => void;
}) {
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [err, setErr]           = useState("");
  const [view, setView]         = useState<"month" | "year" | "list">("month");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    affiliateQuery("admin:getEarningsDetail", { adminSecret })
      .then(setPayments)
      .catch((e: unknown) => setErr(errMsg(e, "Fehler beim Laden")));
  }, [adminSecret]);

  const handlePdf = async () => {
    if (!payments) return;
    setExporting(true);
    try { await exportFinancePdf(summary, payments); }
    finally { setExporting(false); }
  };

  const groups = payments ? groupPayments(payments, view === "year" ? "year" : "month") : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-2 z-10">
          <TrendingUp size={16} className="text-green-400" />
          <h2 className="font-semibold text-zinc-100">Finanzen</h2>
          <button type="button" onClick={handlePdf} disabled={!payments || exporting}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 disabled:opacity-40 transition-colors">
            <FileText size={13} /> {exporting ? "Erstelle…" : "PDF"}
          </button>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Zusammenfassung */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Umsatz",      value: summary.revenueTotal, color: "text-green-400" },
              { label: "Provisionen", value: summary.commTotal,    color: "text-red-400"   },
              { label: "Mein Anteil", value: summary.netEarnings,  color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <p className={`text-base font-bold ${s.color}`}>€{s.value.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 -mt-2">
            {summary.payingContracts ?? summary.activeContracts} zahlende Shops
            {(summary.awaitingPayment ?? 0) > 0 && ` · ${summary.awaitingPayment} warten auf Zahlung`}
            {" "}· {payments ? `${payments.length} Zahlungen` : "…"}
          </p>

          {/* Ansicht wählen */}
          <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
            {([
              { id: "month", label: "Monatlich" },
              { id: "year",  label: "Jährlich"  },
              { id: "list",  label: "Zahlungen" },
            ] as const).map(t => (
              <button key={t.id} type="button" onClick={() => setView(t.id)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={view === t.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
                {t.label}
              </button>
            ))}
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}
          {!payments && !err && (
            <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="text-zinc-500 text-sm text-center py-8">Laden...</motion.p>
          )}
          {payments && payments.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-8">Noch keine Zahlungen.</p>
          )}

          {/* Monats-/Jahresübersicht */}
          {payments && payments.length > 0 && view !== "list" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
                <span>{view === "year" ? "Jahr" : "Monat"}</span>
                <span className="text-right w-14">Umsatz</span>
                <span className="text-right w-14">Prov.</span>
                <span className="text-right w-14">Netto</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {groups.map(g => (
                  <div key={g.label} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2.5 items-center">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{g.label}</p>
                      <p className="text-[10px] text-zinc-600">{g.count} Zahlung{g.count !== 1 ? "en" : ""}</p>
                    </div>
                    <span className="text-xs font-semibold text-green-400 text-right w-14">€{g.revenue.toFixed(0)}</span>
                    <span className="text-xs font-semibold text-red-400 text-right w-14">€{g.commission.toFixed(0)}</span>
                    <span className="text-xs font-bold text-amber-400 text-right w-14">€{(g.revenue - g.commission).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Einzelne Zahlungen */}
          {payments && payments.length > 0 && view === "list" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/50">
              {payments.map((p, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{p.shopName}</p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(p.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      {" · "}{p.planType === "annual" ? "Jahresabo" : "Monatsabo"} · #{p.paymentNumber}
                      {p.direct && <span className="text-blue-400"> · Direkt</span>}
                      {p.discountCode && <span className="text-purple-400"> · {p.discountCode}</span>}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-400">€{p.paidAmount.toFixed(2)}</p>
                    <p className="text-[10px] text-zinc-600">{p.commission > 0 ? `– €${p.commission.toFixed(2)} Prov.` : "keine Prov."}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Finanzbericht als PDF ────────────────────────────────────────────────────

async function exportFinancePdf(summary: EarningsSummary, payments: PaymentRow[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const accent: [number, number, number] = [251, 191, 36];
  const dark: [number, number, number]   = [18, 18, 18];
  const mid: [number, number, number]    = [80, 80, 80];
  const light: [number, number, number]  = [245, 245, 245];
  const green: [number, number, number]  = [22, 130, 60];
  const red: [number, number, number]    = [180, 50, 50];

  const euro = (n: number) => `€${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const today = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...accent);
  doc.rect(0, 0, W, 36, "F");
  doc.setFillColor(...dark);
  doc.rect(0, 0, 5, 36, "F");
  doc.setTextColor(...dark);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Finanzbericht", 13, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Loatycard  ·  Stand: ${today}`, 13, 26);

  // ── Zusammenfassung ─────────────────────────────────────────────────────────
  let y = 46;
  const bx = [13, 77, 141] as const;
  const bw = 60; const bh = 24;
  const boxes = [
    { label: "Gesamtumsatz",          value: euro(summary.revenueTotal), color: green  },
    { label: "Provisionen an Partner", value: euro(summary.commTotal),   color: red    },
    { label: "Mein Anteil (Netto)",    value: euro(summary.netEarnings), color: accent },
  ];
  boxes.forEach(({ label, value, color }, i) => {
    doc.setFillColor(...light);
    doc.rect(bx[i], y, bw, bh, "F");
    doc.setDrawColor(220, 220, 220);
    doc.rect(bx[i], y, bw, bh, "S");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(value, bx[i] + bw / 2, y + 12, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mid);
    doc.text(label, bx[i] + bw / 2, y + 20, { align: "center" });
  });
  y += bh + 7;

  doc.setFontSize(8);
  doc.setTextColor(...mid);
  doc.text(
    `${summary.payingContracts ?? summary.activeContracts} zahlende Shops  ·  ${payments.length} Zahlungen  ·  ` +
    `Provisionen: ${euro(summary.commPending)} ausstehend, ${euro(summary.commConfirmed)} bestätigt, ${euro(summary.commPaid)} ausgezahlt`,
    13, y
  );
  y += 8;

  // ── Tabellen-Helfer ─────────────────────────────────────────────────────────
  const ensureSpace = (needed: number) => {
    if (y + needed > 278) { doc.addPage(); y = 20; }
  };
  const sectionTitle = (title: string) => {
    ensureSpace(20);
    doc.setDrawColor(220, 220, 220);
    doc.line(13, y, W - 13, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    doc.text(title, 13, y);
    y += 7;
  };
  const tableHead = (cols: { label: string; x: number; align?: "right" }[]) => {
    doc.setFillColor(...light);
    doc.rect(13, y - 4, W - 26, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mid);
    cols.forEach(c => doc.text(c.label, c.x, y, c.align ? { align: c.align } : undefined));
    y += 6;
    doc.setFont("helvetica", "normal");
  };

  // ── Monats-/Jahresübersicht ─────────────────────────────────────────────────
  for (const mode of ["month", "year"] as const) {
    const groups = groupPayments(payments, mode);
    if (groups.length === 0) continue;
    if (mode === "year" && groups.length < 2) continue; // Jahresübersicht erst ab 2 Jahren sinnvoll
    sectionTitle(mode === "month" ? "Monatsübersicht" : "Jahresübersicht");
    tableHead([
      { label: mode === "month" ? "Monat" : "Jahr", x: 15 },
      { label: "Zahlungen",   x: 105, align: "right" },
      { label: "Umsatz",      x: 135, align: "right" },
      { label: "Provisionen", x: 165, align: "right" },
      { label: "Netto",       x: W - 15, align: "right" },
    ]);
    groups.forEach((g, i) => {
      ensureSpace(8);
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(13, y - 3.5, W - 26, 5.5, "F");
      }
      doc.setTextColor(...dark);
      doc.text(g.label, 15, y);
      doc.setTextColor(...mid);
      doc.text(String(g.count), 105, y, { align: "right" });
      doc.setTextColor(...green);
      doc.text(euro(g.revenue), 135, y, { align: "right" });
      doc.setTextColor(...red);
      doc.text(g.commission > 0 ? `- ${euro(g.commission)}` : "—", 165, y, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(euro(g.revenue - g.commission), W - 15, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 5.5;
    });
    y += 4;
  }

  // ── Einzelne Zahlungen ──────────────────────────────────────────────────────
  if (payments.length > 0) {
    sectionTitle("Einzelne Zahlungen");
    tableHead([
      { label: "Datum",     x: 15 },
      { label: "Shop",      x: 38 },
      { label: "Modell",    x: 100 },
      { label: "Betrag",    x: 152, align: "right" },
      { label: "Provision", x: W - 15, align: "right" },
    ]);
    payments.forEach((p, i) => {
      ensureSpace(8);
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(13, y - 3.5, W - 26, 5.5, "F");
      }
      doc.setTextColor(...mid);
      doc.text(new Date(p.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" }), 15, y);
      doc.setTextColor(...dark);
      doc.text(p.shopName.slice(0, 32), 38, y);
      doc.setTextColor(...mid);
      const model = `${p.planType === "annual" ? "Jahresabo" : "Monatsabo"} #${p.paymentNumber}`
        + (p.discountCode ? ` · ${p.discountCode}` : "") + (p.direct ? " · Direkt" : "");
      doc.text(model, 100, y);
      doc.setTextColor(...green);
      doc.text(euro(p.paidAmount), 152, y, { align: "right" });
      doc.setTextColor(...(p.commission > 0 ? red : mid));
      doc.text(p.commission > 0 ? `- ${euro(p.commission)}` : "—", W - 15, y, { align: "right" });
      y += 5.5;
    });
  }

  // ── Footer (jede Seite) ──────────────────────────────────────────────────────
  const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(...accent);
    doc.rect(0, 289, W, 8, "F");
    doc.setFillColor(...dark);
    doc.rect(0, 289, 5, 8, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    doc.text("Loatycard · Finanzbericht", 13, 294);
    doc.text(`Seite ${p} / ${pageCount}`, W - 13, 294, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const blob = doc.output("blob");
  const file = new File([blob], `loatycard-finanzbericht-${stamp}.pdf`, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (data: object) => Promise<void> }).share) {
    try {
      await (navigator as Navigator & { share: (d: object) => Promise<void> }).share({ files: [file], title: "Finanzbericht" });
      return;
    } catch { /* fallback to download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
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

      {/* Sektion 1: Finanzen (Zahlungen, Provisionen) */}
      <div className="flex items-center gap-2 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Finanzen</p>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      <EarningsCard adminSecret={adminSecret} />

      {/* Sektion 2: Nutzung (Stempel-Aktivität, unabhängig von den Finanzen) */}
      <div className="flex items-center gap-2 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Nutzung & Aktivität</p>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      <p className="text-[11px] text-zinc-600 -mt-2">
        Stempel und Kunden im gewählten Zeitraum. Hat nichts mit den Finanzen oben zu tun.
      </p>

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
              <p className="text-xs text-zinc-500 mt-1">Shops mit Stempeln</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">im Zeitraum, nicht Vertragsstatus</p>
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

function hexToRgbPdf(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length !== 6) return [251, 191, 36];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

async function exportShopPdf(shop: Doc<"shops">, period: Period, data: {
  stamps: number; redeems: number; stampValue: number | null;
  rewardBreakdown: { rewardText: string; count: number; valuePerRedemption: number | null }[];
  customers: { customerName: string; stamps: number; redeems: number; currentStamps: number }[];
}) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const accent: [number, number, number] = (shop.customDesignEnabled && shop.accentColor)
    ? hexToRgbPdf(shop.accentColor)
    : [251, 191, 36];
  const dark: [number, number, number]  = [18, 18, 18];
  const mid: [number, number, number]   = [80, 80, 80];
  const light: [number, number, number] = [245, 245, 245];

  const periodLabel = period === "all" ? "Gesamt"
    : period === "7d" ? "Letzte 7 Tage"
    : period === "30d" ? "Letzter Monat"
    : period === "90d" ? "Letzte 3 Monate"
    : "Letztes Jahr";

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...accent);
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

  // ── Preisinfo ───────────────────────────────────────────────────────────────
  let y = 44;
  if (shop.priceInfo) {
    doc.setFillColor(248, 248, 248);
    const lines = doc.splitTextToSize(shop.priceInfo, W - 28) as string[];
    const boxH = 8 + lines.length * 4.5;
    doc.rect(13, y, W - 26, boxH, "F");
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.6);
    doc.rect(13, y, 3, boxH, "F");
    doc.setLineWidth(0.2);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...mid);
    doc.text("Preisinfo / Angebot", 20, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    lines.forEach((line: string, i: number) => {
      doc.text(line, 20, y + 10 + i * 4.5);
    });
    y += boxH + 8;
  }

  // ── Stat-Boxen ──────────────────────────────────────────────────────────────
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
    doc.setTextColor(...accent);
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
      doc.setTextColor(...accent);
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
    doc.setFillColor(...accent);
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

function ShopAnalytics({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const [period, setPeriod] = useState<Period>("all");
  const [exporting, setExporting] = useState(false);
  const data = useQuery(
    api.shops.getShopAnalyticsByPeriodAsAdmin,
    { shopId: shop._id, adminSecret, since: periodToSince(period) }
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
  const createTestCustomer = useMutation(api.admin.adminCreateTestCustomer);
  const [showAdminZugang, setShowAdminZugang] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [copied, setCopied] = useState(false);

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
      await affiliateMutation("admin:clearAllData", { adminSecret: pinInput });
      setDeleted(true);
      setConfirmDelete(false);
    } finally { setDeleting(false); }
  };


  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <button onClick={() => setShowAdminZugang(!showAdminZugang)}
          className="w-full flex items-center gap-2 px-5 py-4 hover:bg-zinc-800/50 transition-colors">
          <Shield size={15} className="text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200 flex-1 text-left">Admin-Zugang</span>
          <ChevronRight size={13} className={`text-zinc-600 transition-transform ${showAdminZugang ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence>
          {showAdminZugang && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-5 space-y-4 border-t border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 mb-2">Geheime Admin-URL</p>
                  <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2.5">
                    <code className="text-[11px] text-amber-300 flex-1 truncate">{adminUrl}</code>
                    <button onClick={copyAdminUrl} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                      {copied ? <Check size={14} className="text-green-400" /> : <Link size={14} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1.5">Nur du kennst diese URL. Teile sie niemals.</p>
                </div>
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-3">
                  <p className="text-xs text-amber-300 font-medium mb-1">PIN: gesetzt via ADMIN_PIN Env-Variable</p>
                  <p className="text-[11px] text-zinc-500">PIN wird server-seitig geprüft und ist nicht im Client-Bundle sichtbar.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Gerät zurücksetzen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-zinc-400 shrink-0" />
          <p className="text-sm font-medium text-zinc-200">Gerät zurücksetzen</p>
        </div>
        <p className="text-[11px] text-zinc-500">Löscht alle gespeicherten Tokens auf <span className="text-zinc-400 font-medium">diesem Gerät</span> (QR-Token, Admin-PIN, Shop-Login). Nur lokal — keine Daten in der Datenbank werden gelöscht.</p>
        <button onClick={() => {
          ["qrToken","adminTestQrToken","adminToken","adminShopSlug","adminRole","adminPinLS","meAccentColor","meBgPreset","meStarsOn"].forEach(k => localStorage.removeItem(k));
          sessionStorage.removeItem("adminPin");
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
        <p className="text-[11px] text-zinc-500">Erstellt deinen Kunden-Account und verbindet ihn mit /me, einmalig nach jedem Gerät-Reset.</p>
        {registered ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <Check size={14} /> Registriert! /me ist jetzt aktiv.
            </div>
            <p className="text-[11px] text-zinc-500">QR-Token gespeichert. Öffne /me um deine Karte zu sehen.</p>
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
                    <p className="text-xs text-zinc-500">Löscht alle Shops, Kunden, Stempel und Ereignisse, unwiderruflich.</p>
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

// ─── Partner Tab ─────────────────────────────────────────────────────────────

const AFFILIATE_URL = process.env.NEXT_PUBLIC_AFFILIATE_CONVEX_URL ?? "";

// ConvexError-Texte stehen im HTTP-API-Feld errorData (auch in Produktion);
// errorMessage ist bei anderen Fehlern in Prod nur ein redigiertes "Server Error".
function affiliateError(data: { errorData?: unknown; errorMessage?: string }): Error {
  if (typeof data.errorData === "string") return new Error(data.errorData);
  const msg = data.errorMessage ?? "";
  if (!msg || /Server Error|Uncaught|\[Request ID/i.test(msg)) {
    return new Error("Fehler bei der Partner-App. Bitte nochmal versuchen.");
  }
  return new Error(msg);
}

async function affiliateQuery(path: string, args: Record<string, unknown>) {
  if (!AFFILIATE_URL) return null;
  const res = await fetch(`${AFFILIATE_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, format: "json", args }),
  });
  const data = await res.json();
  if (data.status === "error") throw affiliateError(data);
  return data.value;
}

async function affiliateMutation(path: string, args: Record<string, unknown>) {
  if (!AFFILIATE_URL) return null;
  const res = await fetch(`${AFFILIATE_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, format: "json", args }),
  });
  const data = await res.json();
  if (data.status === "error") throw affiliateError(data);
  return data.value;
}

type AffiliateStatus = "pending" | "active" | "suspended";
type LeadStatus = "submitted" | "under_review" | "approved" | "rejected" | "active" | "draft";

interface AffiliateLead {
  _id: string; _creationTime: number;
  shopName: string; ownerName: string; ownerEmail: string;
  city?: string; businessType?: string;
  affiliateName: string; affiliateCode: string;
  status: LeadStatus;
}

interface AffiliatePartner {
  _id: string; name: string; email: string;
  referralCode: string; status: AffiliateStatus;
  _creationTime: number;
  company?: string;
  pendingProfile?: Record<string, any> | null;
}

interface AffiliateDashboard {
  leads: { total: number; submitted: number; active: number; rejected: number };
  affiliates: { total: number; pending: number; active: number };
  commissions: { pending: number; confirmed: number; paid: number };
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const EMPTY_PARTNER = {
  name: "", email: "", password: "", phone: "",
  company: "", dateOfBirth: "", taxId: "", vatId: "",
  address: "", zip: "", city: "", country: "Deutschland",
  bankIban: "", bankBic: "", bankName: "", notes: "",
};

function CreatePartnerForm({ adminSecret, onCreated }: { adminSecret: string; onCreated: () => void }) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(EMPTY_PARTNER);
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState<{ referralCode: string; name: string } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    try {
      const passwordHash = await sha256(form.password);
      const res = await affiliateMutation("admin:createAffiliate", {
        adminSecret,
        name:        form.name,
        email:       form.email,
        passwordHash,
        phone:       form.phone       || undefined,
        company:     form.company     || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        taxId:       form.taxId       || undefined,
        vatId:       form.vatId       || undefined,
        address:     form.address     || undefined,
        zip:         form.zip         || undefined,
        city:        form.city        || undefined,
        country:     form.country     || undefined,
        bankIban:    form.bankIban    || undefined,
        bankBic:     form.bankBic     || undefined,
        bankName:    form.bankName    || undefined,
        notes:       form.notes       || undefined,
      });
      setResult({ referralCode: (res as any).referralCode, name: form.name });
      setForm(EMPTY_PARTNER);
      onCreated();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setSaving(false); }
  };

  if (result) return (
    <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-4 space-y-2">
      <p className="text-sm font-semibold text-green-400">✓ Partner angelegt</p>
      <p className="text-xs text-zinc-400">{result.name} · Code: <span className="font-mono text-amber-400">{result.referralCode}</span></p>
      <p className="text-xs text-zinc-500">Login über die Partner-App mit der gesetzten E-Mail + Passwort.</p>
      <button onClick={() => { setResult(null); setOpen(false); }}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Schließen</button>
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors">
        <span className="text-sm font-medium text-zinc-200">+ Partner erstellen</span>
        <span className="ml-auto text-zinc-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4">

          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Zugangsdaten</p>
          <div className="space-y-2">
            {[
              { k: "name",  label: "Vollständiger Name *", type: "text"  },
              { k: "email", label: "E-Mail (Login) *",     type: "email" },
              { k: "phone", label: "Telefon",              type: "tel"   },
            ].map(({ k, label, type }) => (
              <div key={k}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[k]} onChange={set(k)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
            ))}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Initial-Passwort *</label>
              <input type="text" value={form.password} onChange={set("password")}
                placeholder="Sichtbar, wird dem Partner mitgeteilt"
                className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40 font-mono" />
              <p className="text-[10px] text-zinc-600 mt-1">Partner kann es nach dem Login ändern</p>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold pt-1">Rechtliches</p>
          <div className="space-y-2">
            {[
              { k: "company",     label: "Firmenname (falls Gewerbe)",   type: "text" },
              { k: "dateOfBirth", label: "Geburtsdatum (TT.MM.JJJJ)",   type: "text", placeholder: "15.03.1990" },
              { k: "taxId",       label: "Steuernummer",                 type: "text", placeholder: "123/456/78901" },
              { k: "vatId",       label: "USt-IdNr. (falls vorhanden)",  type: "text", placeholder: "DE123456789" },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[k]} onChange={set(k)} placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
            ))}
          </div>

          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold pt-1">Adresse</p>
          <div className="space-y-2">
            {[
              { k: "address", label: "Straße + Hausnummer", type: "text" },
              { k: "zip",     label: "PLZ",                 type: "text" },
              { k: "city",    label: "Stadt",               type: "text" },
              { k: "country", label: "Land",                type: "text" },
            ].map(({ k, label, type }) => (
              <div key={k}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[k]} onChange={set(k)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
            ))}
          </div>

          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold pt-1">Bankverbindung</p>
          <div className="space-y-2">
            {[
              { k: "bankIban", label: "IBAN",         type: "text", placeholder: "DE89 3704 0044 ..." },
              { k: "bankBic",  label: "BIC / SWIFT",  type: "text", placeholder: "COBADEFFXXX" },
              { k: "bankName", label: "Bankname",      type: "text" },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[k]} onChange={set(k)} placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">Interne Notiz</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none" />
          </div>

          <button onClick={handleCreate} disabled={saving || !form.name || !form.email || !form.password}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 transition-colors">
            {saving ? "Erstelle..." : "Partner anlegen & Konto erstellen"}
          </button>
        </div>
      )}
    </div>
  );
}

const AFFILIATE_APP_URL = process.env.NEXT_PUBLIC_AFFILIATE_APP_URL ?? "http://localhost:3000";

function InvitePartnerButton({ adminSecret }: { adminSecret: string }) {
  const [link, setLink]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await affiliateMutation("admin:generateAffiliateInvite", { adminSecret });
      const token = (res as any).token;
      setLink(`${AFFILIATE_APP_URL}/invite/partner/${token}`);
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setLoading(false); }
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-200">Partner einladen</p>
          <p className="text-xs text-zinc-500">Link ist 7 Tage gültig</p>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 transition-colors"
          style={{ background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24" }}>
          {loading ? "..." : "Link generieren"}
        </button>
      </div>

      {link && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: "#18181b", border: "1px solid #27272a" }}>
          <p className="flex-1 text-[10px] text-zinc-400 truncate font-mono">{link}</p>
          <button onClick={handleCopy}
            className="text-[10px] font-semibold flex-shrink-0 transition-colors"
            style={{ color: copied ? "#4ade80" : "#fbbf24" }}>
            {copied ? "✓ Kopiert" : "Kopieren"}
          </button>
        </div>
      )}
    </div>
  );
}

function nextCommissionPreview(planType: "annual" | "monthly", paymentNumber: number) {
  const phase =
    planType === "annual"
      ? paymentNumber === 1 ? "Erstprovision" : paymentNumber === 2 ? "Jahr 2" : paymentNumber === 3 ? "Jahr 3" : "Jahr 4+"
      : paymentNumber <= 12 ? "Erstprovision" : paymentNumber <= 24 ? "Jahr 2" : paymentNumber <= 36 ? "Jahr 3" : "Jahr 4+";
  const rates: Record<string, number> = { "Erstprovision": 0.20, "Jahr 2": 0.05, "Jahr 3": 0.10, "Jahr 4+": 0.15 };
  const base   = planType === "annual" ? 240 : 20; // Provision nur auf den Abo-Anteil
  const rate   = rates[phase];
  const amount = Math.round(base * rate * 100) / 100;
  return { phase, rate, amount };
}

const PARTNER_FIELD_LABELS: Record<string, string> = {
  name: "Name", company: "Firma", taxId: "Steuernr.", vatId: "USt-IdNr.",
  dateOfBirth: "Geburtsdatum", bankIban: "IBAN", bankBic: "BIC", bankName: "Bank",
  phone: "Telefon", address: "Adresse", zip: "PLZ", city: "Stadt", country: "Land",
  businessType: "Kontotyp",
};

function fmtPartnerVal(key: string, val: unknown): string {
  if (key === "businessType") {
    return val === "business" ? "Gewerbe" : val === "private" ? "Privat" : "—";
  }
  return val === undefined || val === null || val === "" ? "—" : String(val);
}

function PModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{title}</p>
      {children}
    </div>
  );
}

function PModalRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-zinc-500 flex-shrink-0">{label}</span>
      <span className={`text-zinc-300 text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function PartnerDetailModal({ adminSecret, affiliateId, onClose, onChanged }: {
  adminSecret: string; affiliateId: string; onClose: () => void; onChanged: () => void;
}) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");

  const load = async () => {
    setLoading(true); setErr("");
    try { setData(await affiliateQuery("admin:getAffiliateDetail", { adminSecret, affiliateId })); }
    catch (e: any) { setErr(e?.message ?? "Fehler"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [affiliateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (approve: boolean) => {
    setBusy(true); setErr("");
    try {
      await affiliateMutation(approve ? "admin:approveProfileChange" : "admin:rejectProfileChange", { adminSecret, affiliateId });
      await load(); onChanged();
    } catch (e: any) { setErr(e?.message ?? "Fehler"); }
    finally { setBusy(false); }
  };

  const toggleDiscount = async (eligible: boolean) => {
    setBusy(true); setErr("");
    try {
      await affiliateMutation("admin:setDiscountEligible", { adminSecret, affiliateId, eligible });
      await load(); onChanged();
    } catch (e: any) { setErr(e?.message ?? "Fehler"); }
    finally { setBusy(false); }
  };

  const a = data?.affiliate;
  const pending = data?.pendingProfile as Record<string, any> | null | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between z-10">
          <p className="text-sm font-semibold text-zinc-100">Partner-Details</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-lg leading-none">✕</button>
        </div>

        {loading ? (
          <p className="text-center text-zinc-500 text-sm py-12 animate-pulse">Laden...</p>
        ) : !a ? (
          <p className="text-center text-zinc-500 text-sm py-12">{err || "Nicht gefunden"}</p>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-lg font-bold text-zinc-100">{a.name}</p>
              <p className="text-xs text-zinc-500">{a.email} · <span className="font-mono text-amber-400">{a.referralCode}</span></p>
            </div>

            {pending && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.3)" }}>
                <p className="text-xs font-semibold text-yellow-400">Änderungen warten auf Freigabe</p>
                {pending.businessType === "business" && a.businessType !== "business" && (
                  <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(249,115,22,.12)", border: "1px solid rgba(249,115,22,.4)" }}>
                    <p className="text-[11px] font-bold text-orange-400">⚠ Wechsel Privat → Gewerbe</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Firmenname und USt-IdNr./Steuernr. prüfen, steuerlich relevant (Provisions-Abrechnung).</p>
                  </div>
                )}
                {pending.businessType === "private" && a.businessType === "business" && (
                  <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(249,115,22,.12)", border: "1px solid rgba(249,115,22,.4)" }}>
                    <p className="text-[11px] font-bold text-orange-400">⚠ Wechsel Gewerbe → Privat</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Prüfen, ob das plausibel ist, steuerlich relevant (Provisions-Abrechnung).</p>
                  </div>
                )}
                <div className="space-y-1">
                  {Object.keys(pending).filter(k => k !== "submittedAt").map(k => (
                    <div key={k} className="text-[11px] flex flex-wrap items-center gap-1">
                      <span className="text-zinc-500">{PARTNER_FIELD_LABELS[k] ?? k}:</span>
                      <span className="text-zinc-500 line-through">{fmtPartnerVal(k, a[k])}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-green-400 font-medium">{fmtPartnerVal(k, pending[k])}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => decide(true)} disabled={busy}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-green-900/30 border border-green-800/50 text-green-400 disabled:opacity-50">Freigeben</button>
                  <button onClick={() => decide(false)} disabled={busy}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-red-900/20 border border-red-900/40 text-red-400 disabled:opacity-50">Ablehnen</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Shops aktiv",       value: String(data.stats.leadsActive) },
                { label: "In Prüfung",        value: String(data.stats.leadsInReview) },
                { label: "Prov. ausstehend",  value: `€${data.commissions.pending.toFixed(2)}` },
                { label: "Prov. ausgezahlt",  value: `€${data.commissions.paid.toFixed(2)}` },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <p className="text-lg font-bold text-zinc-100">{s.value}</p>
                  <p className="text-[10px] text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Rabatt-Berechtigung (muss vor Nutzung eines Rabattcodes aktiviert sein) */}
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-semibold text-zinc-200">Rabatt berechtigt</p>
                <p className="text-[10px] text-zinc-500">Erlaubt Rabattcodes (z.B. LOYAL50 · 50% aufs 1. Jahr) für die Shops dieses Partners</p>
              </div>
              <button onClick={() => toggleDiscount(!a.discountEligible)} disabled={busy}
                className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${a.discountEligible ? "bg-green-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${a.discountEligible ? "translate-x-5" : ""}`} />
              </button>
            </div>

            <PModalSection title="Stammdaten">
              <PModalRow label="Telefon" value={a.phone} />
              <PModalRow label="Firma" value={a.company} />
              <PModalRow label="Adresse" value={[a.address, [a.zip, a.city].filter(Boolean).join(" "), a.country].filter(Boolean).join(", ") || undefined} />
              <PModalRow label="Geburtsdatum" value={a.dateOfBirth} />
              <PModalRow label="Steuernr." value={a.taxId} />
              <PModalRow label="USt-IdNr." value={a.vatId} />
              <PModalRow label="Typ" value={a.businessType === "business" ? "Gewerbe" : a.businessType === "private" ? "Privat" : undefined} />
            </PModalSection>

            <PModalSection title="Bankverbindung">
              <PModalRow label="IBAN" value={a.bankIban} mono />
              <PModalRow label="BIC" value={a.bankBic} mono />
              <PModalRow label="Bank" value={a.bankName} />
            </PModalSection>

            <PModalSection title={`Shops (${data.leads.length})`}>
              {data.leads.length === 0 && <p className="text-xs text-zinc-600">Noch keine.</p>}
              {data.leads.map((l: any) => (
                <div key={l._id} className="flex items-center justify-between gap-2 text-xs py-0.5">
                  <span className="text-zinc-300 truncate">{l.shopName || "—"} <span className="text-zinc-600">· {l.ownerName}</span></span>
                  <span className="text-zinc-500 flex-shrink-0">{l.status}</span>
                </div>
              ))}
            </PModalSection>

            {err && <p className="text-red-400 text-xs text-center">{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerTab({ adminSecret }: { adminSecret: string }) {
  const [dashboard, setDashboard]     = useState<AffiliateDashboard | null>(null);
  const [leads, setLeads]             = useState<AffiliateLead[] | null>(null);
  const [partners, setPartners]       = useState<AffiliatePartner[] | null>(null);
  const [activeLeads, setActiveLeads] = useState<any[]>([]);
  const [contractMap, setContractMap] = useState<Record<string, any>>({});
  const [commissionsMap, setCommissionsMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [approving, setApproving]     = useState<string | null>(null);
  const [rejecting, setRejecting]     = useState<string | null>(null);
  const [recording, setRecording]     = useState<string | null>(null);
  const [confirming, setConfirming]   = useState<string | null>(null);
  const [planMap, setPlanMap]         = useState<Record<string, "annual" | "monthly">>({});
  const [reasonMap, setReasonMap]     = useState<Record<string, string>>({});
  const [section, setSection]         = useState<"leads" | "partners" | "provisionen">("leads");
  const [detailId, setDetailId]       = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [dash, pendingLeads, allPartners, allLeads] = await Promise.all([
        affiliateQuery("admin:getAdminDashboard", { adminSecret }),
        affiliateQuery("admin:getAllLeads",         { adminSecret }),
        affiliateQuery("admin:listAffiliates",    { adminSecret }),
        affiliateQuery("admin:getAllLeads",        { adminSecret }),
      ]);
      setDashboard(dash);
      setLeads(pendingLeads);
      setPartners(allPartners);

      const active = (allLeads ?? []).filter((l: any) => l.status === "active");
      setActiveLeads(active);

      const contracts: Record<string, any>    = {};
      const commissions: Record<string, any[]> = {};
      await Promise.all(active.map(async (lead: any) => {
        const contract = await affiliateQuery("admin:getContractForLead", { adminSecret, leadId: lead._id });
        if (contract) {
          contracts[lead._id] = contract;
          const comms = await affiliateQuery("admin:getCommissionsForContract", { adminSecret, contractId: contract._id });
          commissions[lead._id] = comms ?? [];
        }
      }));
      setContractMap(contracts);
      setCommissionsMap(commissions);
    } catch (e: unknown) {
      setError(errMsg(e, "Verbindungsfehler zur Partner-App"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApproveLead = async (leadId: string) => {
    setApproving(leadId);
    try {
      await affiliateMutation("admin:approveLead", {
        adminSecret, leadId, planType: planMap[leadId] ?? "annual", adminName: "Admin",
      });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setApproving(null); }
  };

  const handleRejectLead = async (leadId: string) => {
    if (!reasonMap[leadId]) return;
    setRejecting(leadId);
    try {
      await affiliateMutation("admin:rejectLead", { adminSecret, leadId, reason: reasonMap[leadId] });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setRejecting(null); }
  };

  const handleApprovePartner = async (affiliateId: string) => {
    try {
      await affiliateMutation("admin:approveAffiliate", { adminSecret, affiliateId });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    }
  };

  const handleDeletePartner = async (affiliateId: string, name: string) => {
    if (!window.confirm(`Partner „${name}" wirklich löschen? Alle Leads, Verträge und Provisionen werden unwiderruflich gelöscht.`)) return;
    try {
      await affiliateMutation("admin:deleteAffiliate", { adminSecret, affiliateId });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    }
  };

  const handleSuspendPartner = async (affiliateId: string) => {
    try {
      await affiliateMutation("admin:suspendAffiliate", { adminSecret, affiliateId });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    }
  };

  const handleRecordPayment = async (contractId: string) => {
    setRecording(contractId);
    try {
      const result = await affiliateMutation("admin:recordPayment", { adminSecret, shopContractId: contractId });
      alert(`✓ Provision erfasst: €${(result as any)?.amount?.toFixed(2)} (${(result as any)?.phase})`);
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setRecording(null); }
  };

  const handleConfirmCommission = async (commissionId: string) => {
    setConfirming(commissionId);
    try {
      await affiliateMutation("admin:confirmCommission", { adminSecret, commissionId });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setConfirming(null); }
  };

  if (!AFFILIATE_URL) return (
    <div className="py-10 text-center text-zinc-500 text-sm">
      NEXT_PUBLIC_AFFILIATE_CONVEX_URL nicht konfiguriert
    </div>
  );

  if (loading) return (
    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
      className="text-zinc-500 text-sm text-center py-10">Lade Partner-Daten...</motion.div>
  );

  if (error) return (
    <div className="py-8 text-center space-y-3">
      <p className="text-red-400 text-sm">{error}</p>
      <button onClick={load} className="text-xs text-zinc-400 hover:text-zinc-200">Erneut versuchen</button>
    </div>
  );

  const pendingPartners = partners?.filter(p => p.status === "pending") ?? [];

  return (
    <motion.div key="partner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Shops offen",    value: dashboard?.leads.submitted ?? 0,                                     color: "text-yellow-400" },
          { label: "Partner aktiv",  value: dashboard?.affiliates.active ?? 0,                                   color: "text-amber-400"  },
          { label: "Provision off.", value: `€${(dashboard?.commissions.pending ?? 0).toFixed(0)}`,              color: "text-orange-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending Partner-Anfragen */}
      {pendingPartners.length > 0 && (
        <div className="bg-zinc-900 border border-amber-900/30 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
            <Users size={13} className="text-amber-400" />
            <span className="text-sm font-medium text-zinc-200">Neue Partner-Anfragen</span>
            <span className="ml-auto text-[10px] text-amber-400 font-semibold">{pendingPartners.length}</span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {pendingPartners.map(p => (
              <div key={p._id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium">{p.name}</p>
                  <p className="text-xs text-zinc-500">{p.email} · {p.referralCode}</p>
                </div>
                <button onClick={() => handleApprovePartner(p._id)}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                  style={{ background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24" }}>
                  Freigeben
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section-Toggle */}
      <div className="flex gap-1.5">
        {(["leads", "partners", "provisionen"] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className="flex-1 py-2 rounded-xl text-[11px] font-semibold transition-colors"
            style={section === s
              ? { background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24" }
              : { background: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>
            {s === "leads" ? `Shops (${leads?.length ?? 0})` : s === "partners" ? `Partner (${partners?.length ?? 0})` : `Prov. (${activeLeads.length})`}
          </button>
        ))}
      </div>

      {/* Neue Shops (Info) */}
      {section === "leads" && (
        <div className="space-y-3">
          <div className="rounded-xl px-3 py-2.5 text-xs text-zinc-400"
            style={{ background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.15)" }}>
            Shops werden automatisch aktiviert. Hier siehst du neue Shops die in Loatycard eingerichtet werden müssen.
          </div>
          {leads?.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-6">Keine neuen Shops</p>
          )}
          {leads?.map((lead: any) => (
            <div key={lead._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-100">{lead.shopName}</p>
                  <p className="text-xs text-zinc-500">{lead.ownerName} · {lead.ownerEmail}</p>
                  {lead.ownerPhone && <p className="text-xs text-zinc-600">{lead.ownerPhone}</p>}
                  {lead.city && <p className="text-xs text-zinc-600">{lead.businessType ?? ""}{lead.businessType && lead.city ? " · " : ""}{lead.city}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-amber-400">{lead.affiliateName}</p>
                  <p className="text-[10px] text-zinc-600">{lead.affiliateCode}</p>
                  <p className="text-[10px] text-green-400 mt-0.5">● Aktiv</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 pt-1 border-t border-zinc-800">
                Eingereicht: {new Date(lead._creationTime).toLocaleDateString("de-DE")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Alle Partner */}
      {section === "partners" && (
        <div className="space-y-3">
          {/* Partner erstellen */}
          <CreatePartnerForm adminSecret={adminSecret} onCreated={load} />
          <InvitePartnerButton adminSecret={adminSecret} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {partners?.length === 0 && (
              <p className="text-center text-zinc-500 text-sm p-6">Noch keine Partner</p>
            )}
            <div className="divide-y divide-zinc-800/50">
              {partners?.map(p => (
                <div key={p._id} className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setDetailId(p._id)} className="flex-1 min-w-0 text-left group">
                    <p className="text-sm text-zinc-200 group-hover:text-amber-400 transition-colors flex items-center gap-2">
                      {p.name}
                      {p.pendingProfile && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/30 border border-yellow-800/50 text-yellow-400">Änderung offen</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">{p.email}</p>
                    {p.company && <p className="text-xs text-zinc-600">{p.company}</p>}
                  </button>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-xs font-mono text-amber-400">{p.referralCode}</p>
                    <p className={`text-[10px] ${p.status === "active" ? "text-green-400" : p.status === "pending" ? "text-yellow-400" : "text-red-400"}`}>
                      {p.status === "active" ? "Aktiv" : p.status === "pending" ? "Ausstehend" : "Gesperrt"}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <button onClick={() => setDetailId(p._id)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-900/40 transition-colors">
                        Details
                      </button>
                      {p.status === "active" && (
                        <button onClick={() => handleSuspendPartner(p._id)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-red-900/20 border border-red-900/40 text-red-400 hover:bg-red-900/30 transition-colors">
                          Sperren
                        </button>
                      )}
                      {p.status === "suspended" && (
                        <button onClick={() => handleApprovePartner(p._id)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-green-900/20 border border-green-900/40 text-green-400 hover:bg-green-900/30 transition-colors">
                          Reaktivieren
                        </button>
                      )}
                      <button onClick={() => handleDeletePartner(p._id, p.name)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-900/40 transition-colors">
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Partner-Detail-Popup */}
      {detailId && (
        <PartnerDetailModal
          adminSecret={adminSecret}
          affiliateId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}

      {/* Provisionen */}
      {section === "provisionen" && (
        <div className="space-y-3">
          {activeLeads.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-6">Keine aktiven Shops</p>
          )}
          {activeLeads.map(lead => {
            const contract = contractMap[lead._id];
            if (!contract) return null;
            const comms    = commissionsMap[lead._id] ?? [];
            const pending  = comms.filter((c: any) => c.status === "pending");
            const confirmed = comms.filter((c: any) => c.status === "confirmed");
            const preview  = nextCommissionPreview(contract.planType, contract.paymentCount + 1);
            return (
              <div key={lead._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-100">{lead.shopName}</p>
                    <p className="text-xs text-zinc-500">{lead.affiliateName} · {lead.affiliateCode}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-amber-400">
                      {contract.planType === "annual" ? "Jahresabo" : "Monatsabo"}
                    </p>
                    <p className="text-[10px] text-zinc-600">{contract.paymentCount} Zahlungen</p>
                  </div>
                </div>

                {/* Nächste Provision */}
                <div className="rounded-lg px-3 py-2 bg-zinc-800/60 border border-zinc-700/50">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Zahlung #{contract.paymentCount + 1} → Provision</p>
                  <p className="text-sm font-bold text-amber-400">
                    €{preview.amount.toFixed(2)}
                    <span className="text-xs font-normal text-zinc-500 ml-1">
                      ({(preview.rate * 100).toFixed(0)}% · {preview.phase})
                    </span>
                  </p>
                </div>

                <button onClick={() => handleRecordPayment(contract._id)}
                  disabled={recording === contract._id}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 transition-colors">
                  {recording === contract._id ? "Erfasse..." : "Zahlung erfassen →"}
                </button>

                {/* Ausstehende Provisionen bestätigen */}
                {pending.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ausstehend (nach 14 Tagen bestätigen)</p>
                    {pending.map((c: any) => (
                      <div key={c._id} className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{ background: "rgba(249,115,22,.07)", border: "1px solid rgba(249,115,22,.2)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-200">€{c.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-zinc-500">
                            {new Date(c.triggeredAt).toLocaleDateString("de-DE")}
                          </p>
                        </div>
                        <button onClick={() => handleConfirmCommission(c._id)} disabled={confirming === c._id}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold text-green-400 disabled:opacity-40 transition-opacity"
                          style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)" }}>
                          {confirming === c._id ? "..." : "Bestätigen"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {confirmed.length > 0 && (
                  <p className="text-[10px] text-green-400">
                    ✓ {confirmed.length}× bestätigt · €{confirmed.reduce((s: number, c: any) => s + c.amount, 0).toFixed(2)} bereit
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={load} className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
        ↻ Aktualisieren
      </button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── SupportTab (Tickets aus beiden Apps: Betrieb + Partner) ──────────────────

type TicketMsg = { from: "user" | "admin"; text: string; at: number };
type AdminTicket = {
  _id: string; number: number; source: "betrieb" | "partner"; name: string; sub?: string | null;
  senderRole?: string; contact?: string | null;
  status: "open" | "done"; createdAt: number; thread: TicketMsg[];
};

function SupportTab({ adminSecret }: { adminSecret: string }) {
  const btTickets = useQuery(api.support.adminListTickets, { adminSecret });
  const answerBt  = useMutation(api.support.adminAnswerTicket);
  const [affTickets, setAffTickets] = useState<Record<string, unknown>[] | null>(null);
  const [filter, setFilter]     = useState<"open" | "done" | "all">("open");
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [busyId, setBusyId]     = useState<string | null>(null);
  // Geschlossene Tickets sind eingeklappt (nur "Ticket #001") — Klick öffnet
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadAff = async () => {
    try { setAffTickets((await affiliateQuery("support:adminListTickets", { adminSecret })) ?? []); }
    catch { setAffTickets([]); }
  };
  useEffect(() => { loadAff(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tickets: AdminTicket[] = [
    ...(btTickets ?? []).map(t => ({
      _id: t._id as string, number: t.number, source: "betrieb" as const, name: t.shopName,
      senderRole: t.senderRole === "inhaber" ? "Inhaber" : "Mitarbeiter",
      contact: t.contact ?? null, status: t.status,
      createdAt: t.createdAt, thread: t.thread as TicketMsg[],
    })),
    ...((affTickets ?? []) as any[]).map((t: any) => ({
      _id: t._id as string, number: (t.number as number) ?? 0, source: "partner" as const, name: t.partnerName as string,
      sub: (t.partnerEmail as string) ?? null,
      contact: (t.contact as string) ?? null, status: t.status as "open" | "done",
      createdAt: t.createdAt as number, thread: (t.thread ?? []) as TicketMsg[],
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const shown = tickets.filter(t => filter === "all" || t.status === filter);

  // Antworten hält das Ticket offen — geschlossen wird nur explizit.
  const act = async (t: AdminTicket, opts: { reply?: boolean; status?: "open" | "done" }) => {
    setBusyId(t._id);
    try {
      const reply = opts.reply ? (replyMap[t._id]?.trim() || undefined) : undefined;
      if (t.source === "betrieb") {
        await answerBt({ adminSecret, ticketId: t._id as Id<"supportTickets">, reply, status: opts.status });
      } else {
        await affiliateMutation("support:adminAnswerTicket", { adminSecret, ticketId: t._id, reply, status: opts.status });
        await loadAff();
      }
      if (opts.reply) setReplyMap(m => ({ ...m, [t._id]: "" }));
    } finally { setBusyId(null); }
  };

  return (
    <motion.div key="support" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Filter */}
      <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
        {([
          { id: "open", label: `Offen (${tickets.filter(t => t.status === "open").length})` },
          { id: "done", label: "Erledigt" },
          { id: "all",  label: "Alle" },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
            style={filter === f.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
            {f.label}
          </button>
        ))}
      </div>

      {btTickets === undefined || affTickets === null ? (
        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm text-center py-10">Laden...</motion.p>
      ) : shown.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-10">
          {filter === "open" ? "Keine offenen Anfragen, alles erledigt! 🎉" : "Keine Anfragen."}
        </p>
      ) : shown.map(t => {
        const isOpen = t.status === "open" || !!expanded[t._id];
        const num = `#${String(t.number).padStart(3, "0")}`;
        return (
        <div key={t._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <button type="button"
            onClick={() => { if (t.status === "done") setExpanded(e => ({ ...e, [t._id]: !e[t._id] })); }}
            className={`w-full px-4 py-3 flex items-center gap-2 flex-wrap text-left ${isOpen ? "border-b border-zinc-800" : ""} ${t.status === "done" ? "cursor-pointer hover:bg-zinc-800/40 transition-colors" : "cursor-default"}`}>
            <span className="text-[10px] font-bold font-mono text-zinc-500 shrink-0">Ticket {num}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
              style={t.source === "betrieb"
                ? { background: "rgba(96,165,250,.15)", color: "#60a5fa" }
                : { background: "rgba(167,139,250,.15)", color: "#a78bfa" }}>
              {t.source === "betrieb" ? "Betrieb" : "Partner"}
            </span>
            {isOpen && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-200 truncate">
                  {t.name}{t.senderRole ? <span className="text-zinc-500 font-normal"> · {t.senderRole}</span> : null}
                </p>
                {t.sub && <p className="text-[10px] text-zinc-600 truncate">{t.sub}</p>}
              </div>
            )}
            <div className="ml-auto text-right shrink-0 flex items-center gap-2">
              <div>
                <p className="text-[10px] text-zinc-600">
                  {new Date(t.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.status === "open" ? "bg-yellow-400/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>
                  {t.status === "open" ? "offen" : "erledigt"}
                </span>
              </div>
              {t.status === "done" && (
                <ChevronRight size={14} className={`text-zinc-600 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              )}
            </div>
          </button>
          {isOpen && (
          <div className="p-4 space-y-3">
            {/* Verlauf als Chat */}
            <div className="space-y-2">
              {t.thread.map((m, i) => (
                <div key={i} className={`flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 ${m.from === "admin"
                    ? "bg-amber-400/10 border border-amber-400/25"
                    : "bg-zinc-800 border border-zinc-700"}`}>
                    <p className={`text-[9px] font-semibold mb-0.5 ${m.from === "admin" ? "text-amber-400" : "text-zinc-500"}`}>
                      {m.from === "admin" ? "Du" : t.name} · {new Date(m.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-zinc-200 whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {t.contact && <p className="text-xs text-zinc-500">📞 Kontakt: <span className="text-zinc-300">{t.contact}</span></p>}
            <textarea value={replyMap[t._id] ?? ""} onChange={e => setReplyMap(m => ({ ...m, [t._id]: e.target.value }))}
              rows={2} placeholder="Antwort schreiben…"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => act(t, { reply: true })} disabled={busyId === t._id || !(replyMap[t._id] ?? "").trim()}
                className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 text-xs font-semibold disabled:opacity-40 transition-colors">
                Antwort senden
              </button>
              <button onClick={() => act(t, { status: t.status === "open" ? "done" : "open" })} disabled={busyId === t._id}
                className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold hover:text-zinc-200 disabled:opacity-40 transition-colors">
                {t.status === "open" ? "Ticket schließen" : "Wieder öffnen"}
              </button>
            </div>
          </div>
          )}
        </div>
        );
      })}
    </motion.div>
  );
}

type Tab = "overview" | "shops" | "analytics" | "settings" | "partner" | "support";

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "overview",   label: "Übersicht",    icon: BarChart2  },
  { id: "shops",      label: "Shops",        icon: Store      },
  { id: "analytics",  label: "Analytics",    icon: TrendingUp },
  { id: "partner",    label: "Partner",      icon: Users      },
  { id: "support",    label: "Support",      icon: MessageSquare },
  { id: "settings",   label: "Settings",     icon: Settings  },
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

  const allShops = useQuery(api.shops.listAllShops, authed && adminSecret ? { adminSecret } : "skip") as Doc<"shops">[] | undefined;
  const selectedShop = selectedShopId ? allShops?.find(s => s._id === selectedShopId) : null;

  // Offene Support-Tickets (beide Apps) → roter Punkt am Support-Tab
  const btTickets = useQuery(api.support.adminListTickets, authed && adminSecret ? { adminSecret } : "skip");
  const [affOpenCount, setAffOpenCount] = useState(0);
  useEffect(() => {
    if (!authed || !adminSecret) return;
    affiliateQuery("support:adminListTickets", { adminSecret })
      .then((t: { status: string }[] | null) => setAffOpenCount((t ?? []).filter(x => x.status === "open").length))
      .catch(() => {});
  }, [authed, adminSecret, activeTab]);
  const supportOpenCount = (btTickets?.filter(t => t.status === "open").length ?? 0) + affOpenCount;

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

  // Auto-login from sessionStorage (cleared on tab close)
  useEffect(() => {
    const saved = sessionStorage.getItem("adminPin");
    if (saved) {
      setChecking(true);
      checkPinMutation({ pin: saved })
        .then(() => { setAdminSecret(saved); setAuthed(true); })
        .catch(() => { sessionStorage.removeItem("adminPin"); })
        .finally(() => setChecking(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async () => {
    if (!pin) return;
    setChecking(true); setPinError(null);
    try {
      await checkPinMutation({ pin });
      sessionStorage.setItem("adminPin", pin);
      setAdminSecret(pin);
      setAuthed(true);
    } catch (err: unknown) {
      setPinError(errMsg(err, "Fehler"));
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
        shop={selectedShop as Doc<"shops">}
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
            {activeTab === "partner"   && "Partner"}
            {activeTab === "support"   && "Support"}
          </motion.span>
        </AnimatePresence>
        <span className="ml-auto text-[10px] text-zinc-600 uppercase tracking-widest font-medium">Admin</span>
      </div>

      <div className="flex-1 px-5 pt-5 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "overview"  && <OverviewTab   key="overview"   adminSecret={adminSecret} onSelectShop={id => setSelectedShopId(id)} />}
          {activeTab === "shops"     && <ShopsTab      key="shops"      shops={allShops} adminSecret={adminSecret} onSelectShop={id => { setSelectedShopId(id); }} />}
          {activeTab === "analytics" && <AnalyticsTab  key="analytics"  adminSecret={adminSecret} />}
          {activeTab === "settings"  && <SettingsTab   key="settings"   adminSecret={adminSecret} />}
          {activeTab === "partner"   && <PartnerTab    key="partner"    adminSecret={adminSecret} />}
          {activeTab === "support"   && <SupportTab    key="support"    adminSecret={adminSecret} />}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-900/95 backdrop-blur border-t border-zinc-800 flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors relative ${activeTab === id ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"}`}>
            <span className="relative">
              <Icon size={20} />
              {id === "support" && supportOpenCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                  {supportOpenCount > 9 ? "9+" : supportOpenCount}
                </span>
              )}
            </span>
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
