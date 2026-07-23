"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Store, Users, Stamp, Award, ChevronRight, Link, X, Check,
  QrCode, Eye, EyeOff, BarChart2, Settings, AlertTriangle, Trash2,
  Shield, TrendingUp, ArrowLeft, Printer, Palette, FileText, Trophy,
  Sliders, LayoutDashboard, LayoutGrid, User, Gift, MessageSquare, Clock, Search, Building2, type LucideIcon,
} from "lucide-react";
import { STAMP_ICONS } from "@/app/me/components";
import { THEME_LIST } from "@/app/me/themes/registry";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import QRCode from "qrcode";
import { QRImage } from "@/app/components/QRImage";
import { errMsg } from "@/app/lib/errMsg";
import {
  affiliateQuery, affiliateMutation, AFFILIATE_URL, AFFILIATE_APP_URL,
  type AffiliateLead, type AffiliatePartner, type AffiliateDashboard,
} from "./lib/affiliate";
import { DesignEditor } from "./DesignEditor";
import { PartnerTab } from "./PartnerTab";
import { SupportTab } from "./SupportTab";
import { AnalyticsTab, PayLaterCard } from "./AnalyticsTab";
import {
  usePayStatus, PayBadge, ToggleSwitch, PeriodSelector, MiniBarChart, GrowthCard,
  periodToSince, periodToPrevSince, groupPayments, PERIOD_LABELS,
  type PayStatus, type Tier, type Period, type EarningsSummary, type PaymentRow,
} from "./shared";


// ─── Utilities ────────────────────────────────────────────────────────────────

const ICON_KEYWORDS: Record<string, string[]> = {
  // Spezifische Branchen zuerst — der erste Treffer gewinnt
  pill:      ["apotheke","pharmacy","sanitätshaus","sanitaetshaus","reformhaus","physio","physiotherapie","praxis","gesundheit"],
  icecream:  ["eisdiele","eiscafé","eiscafe","gelato","eis "],
  cigarette: ["kiosk","tabak","shisha","vape","e-zigarette","späti","spaeti","lotto"],
  washing:   ["wäscherei","waescherei","waschsalon","textilreinigung","reinigung"],
  paw:       ["tierbedarf","zoohandlung","hundesalon","tierfutter","zoo","tierladen"],
  scissors: ["friseur","friseuse","frisör","barber","barbershop","haar","haarschnitt","schnitt","salon","herrenfriseur","damenfriseur","stylist","stylistin","barbier","bartpflege","rasur"],
  coffee:   ["café","cafe","kaffee","coffee","espresso","cappuccino","latte","coffeeshop","bäckerei café","kaffeebar","bistro café"],
  utensils: ["restaurant","gaststätte","gaststatte","küche","küche","essen","mittagstisch","abendessen","speiselokal","wirtshaus","gasthaus","food","speisekarte"],
  pizza:    ["pizza","imbiss","döner","doner","kebab","fastfood","fast food","burger","mcdo","pommes","snack","lieferdienst","takeaway","take away","wrap","falafel","currywurst"],
  flame:    ["bäckerei","backerei","konditorei","brot","brötchen","kuchen","backstube","patisserie","torte","gebäck","backwaren"],
  dumbbell: ["gym","fitness","fitnessstudio","sport","training","crossfit","workout","kraftsport","yoga","pilates","boxen","kampfsport","mma","bootcamp","personal trainer"],
  flower:   ["wellness","kosmetik","beauty","spa","massage","nagelstudio","nägel","nagel","wimpern","waxing","maniküre","pediküre","gesichtspflege","aesthetik","ästhetik","blumen","blumenladen","florist"],
  shopping: ["laden","shop","markt","supermarkt","lebensmittel","einkaufen","einzelhandel","drogerie"],
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

// Zahlungsstatus je Shop aus der Affiliate-App (paymentCount des Vertrags).
// Key = Stempelkarten-Shop-ID; fehlt ein Shop in der Map, hat er keinen Vertrag.

function ShopListItem({ shop, index, onSelect, payStatus }: {
  shop: Doc<"shops">;
  index: number;
  onSelect: () => void;
  payStatus?: PayStatus;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.25) }}
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800/60 hover:border-zinc-700 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
        <Store size={16} className="text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-zinc-100 truncate flex items-center gap-2">
          {shop.name}
          {shop.active === false && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-red-900/25 border border-red-800/40 text-red-400 shrink-0">
              Inaktiv
            </span>
          )}
          <PayBadge status={payStatus} />
        </p>
        <p className="text-xs text-zinc-500 truncate">{shop.rewardText} · {shop.stampsRequired} Stempel</p>
      </div>
      <ChevronRight size={15} className="text-zinc-600 shrink-0" />
    </motion.button>
  );
}

// ─── ContractInfoCard ─────────────────────────────────────────────────────────
// Vertrag & Zahlung in der Shop-Detailansicht: Modell + Bonus, bei offener
// Zahlung der Bezahllink zum Kopieren, nach Zahlung Abschluss- und
// Verlängerungsdatum (Daten aus der Affiliate-App).

function ContractInfoCard({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const [contract, setContract] = useState<any | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await affiliateQuery("admin:getContractForShop", { adminSecret, loatycardShopId: shop._id });
        if (!cancelled) setContract(c);
      } catch { if (!cancelled) setContract(null); }
    })();
    return () => { cancelled = true; };
  }, [shop._id, adminSecret]);

  if (!contract) return null; // kein Vertrag (z.B. Alt-Shop) → nichts anzeigen

  const paid      = contract.paymentCount > 0;
  const fmt       = (ts: number) => new Date(ts).toLocaleDateString("de-DE");
  const planTxt   = contract.planType === "annual" ? "Jahresabo" : "Monatsabo";
  const periodTxt = contract.planType === "annual" ? "Jahr" : "Monat";
  const payUrl    = contract.paymentToken ? `${AFFILIATE_APP_URL}/pay/${contract.paymentToken}` : "";

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(payUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <FileText size={14} className="text-amber-400" />
        <span className="text-sm font-medium text-zinc-200">Vertrag & Zahlung</span>
        <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-md border ${paid
          ? "bg-green-900/25 border-green-800/40 text-green-400"
          : "bg-yellow-900/25 border-yellow-700/40 text-yellow-400"}`}>
          {paid ? "Bezahlt" : contract.payLaterAt ? "Später zahlen" : "Zahlung offen"}
        </span>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            {planTxt}{contract.rewardCount > 0 ? ` + ${contract.rewardCount} Belohnung${contract.rewardCount === 1 ? "" : "en"}` : ""}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            €{contract.recurringPrice}/{periodTxt}{contract.discountCode ? ` · Rabatt ${contract.discountCode} (nur 1. Rechnung)` : ""}
          </p>
        </div>

        {paid ? (
          <div className="rounded-xl p-3 bg-zinc-800 border border-zinc-700 space-y-1">
            {contract.firstPaidAt && (
              <p className="text-xs text-zinc-300">Abgeschlossen am <b className="text-zinc-100">{fmt(contract.firstPaidAt)}</b></p>
            )}
            {contract.paymentCount > 1 && contract.lastPaidAt && (
              <p className="text-xs text-zinc-300">Letzte Zahlung: {fmt(contract.lastPaidAt)} (Zahlung #{contract.paymentCount})</p>
            )}
            {contract.nextRenewalAt && (
              <p className="text-xs text-zinc-300">
                Läuft bis <b className="text-zinc-100">{fmt(contract.nextRenewalAt)}</b>, dann Verlängerung zu €{contract.recurringPrice}/{periodTxt}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-xl p-3 bg-yellow-900/15 border border-yellow-800/40">
              <p className="text-xs text-yellow-400">
                Erste Zahlung offen: <b>€{contract.amountDue}</b>
                {contract.payLaterAt ? ` · Später zahlen vorgemerkt am ${fmt(contract.payLaterAt)}` : ""}
              </p>
            </div>
            {payUrl && (
              <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                <code className="text-[11px] text-amber-300 flex-1 truncate">{payUrl}</code>
                <button onClick={copyLink} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                  {copied ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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

      {/* Vertrag & Zahlung (Modell, Bezahllink bzw. Laufzeit) */}
      <ContractInfoCard shop={shop} adminSecret={adminSecret} />

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
                <p className="text-sm text-zinc-200 truncate">
                  {membership.memberNumber != null && (
                    <span className="text-zinc-500 font-mono text-xs mr-1.5">#{membership.memberNumber}</span>
                  )}
                  {customer.name}
                </p>
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


// ─── ShopEinstellungen ────────────────────────────────────────────────────────


// ─── ContractBonusCard ────────────────────────────────────────────────────────
// Bonusprogramm (Anzahl Belohnungen) nachträglich ändern: liest den Vertrag aus
// der Affiliate-App (per loatycardShopId) und schreibt Änderungen zurück. Der
// neue Betrag fließt sofort in alle künftigen Abrechnungen ein; ein laufender
// Erstjahr-Rabatt wird serverseitig mit eingerechnet.

function ContractBonusCard({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const [contract, setContract] = useState<any | null | undefined>(undefined);
  const [count, setCount]       = useState(0);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [err, setErr]           = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await affiliateQuery("admin:getContractForShop", { adminSecret, loatycardShopId: shop._id });
        if (cancelled) return;
        setContract(c);
        setCount(c?.rewardCount ?? 0);
      } catch { if (!cancelled) setContract(null); }
    })();
    return () => { cancelled = true; };
  }, [shop._id, adminSecret]);

  if (contract === undefined || contract === null) return null; // kein Vertrag → nichts anzeigen

  const perPeriod  = contract.planType === "annual" ? count * 60 : count * 5;
  const periodTxt  = contract.planType === "annual" ? "Jahr" : "Monat";
  const aboTotal   = (contract.planType === "annual" ? 240 : 20) + perPeriod;
  const dirty      = count !== contract.rewardCount;

  const handleSave = async () => {
    setSaving(true); setErr("");
    try {
      await affiliateMutation("admin:updateContractRewardCount", { adminSecret, contractId: contract.contractId, rewardCount: count });
      setContract({ ...contract, rewardCount: count });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) { setErr(errMsg(e, "Fehler beim Speichern")); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-200">Bonusprogramm (Abrechnung)</p>
        <span className="text-[10px] text-zinc-500">{contract.planType === "annual" ? "Jahresabo" : "Monatsabo"}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="rounded-xl p-3 flex items-center justify-between bg-zinc-800 border border-zinc-700">
          <div>
            <p className="text-sm font-semibold text-zinc-100">{count} Belohnung{count === 1 ? "" : "en"}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              €5/Monat pro Belohnung · Abo gesamt €{aboTotal}/{periodTxt}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setCount(c => Math.max(0, c - 1))}
              className="w-9 h-9 rounded-lg text-lg font-bold text-zinc-100 bg-zinc-700 border border-zinc-600">−</button>
            <button type="button" onClick={() => setCount(c => Math.min(20, c + 1))}
              className="w-9 h-9 rounded-lg text-lg font-bold text-zinc-900 bg-amber-400">+</button>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600">
          Zählt nur ZUSATZ-Stufen, die Basis-Belohnung ist immer kostenlos. Wird automatisch
          angeglichen, sobald Bonus-Stufen oder der Bonus-Toggle des Shops geändert werden
          (manuell ändern nur für Sonderfälle). Gilt ab der nächsten Abrechnung
          {contract.paymentCount === 0 ? " (erste Zahlung steht noch aus)" : ""}.
          {contract.firstYearDiscount ? ` Rabatt ${contract.discountCode ?? ""} (nur 1. Rechnung, Einrichtung dann €45) wird automatisch mit eingerechnet.` : ""}
          {" "}Einrichtung einmalig: €{contract.setupFee}.
        </p>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        {dirty && (
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: saved ? "#22c55e" : "#fbbf24", color: "#18181b" }}>
            {saving ? "Speichert..." : "Bonusprogramm speichern"}
          </button>
        )}
        {saved && !dirty && (
          <p className="text-center text-xs text-green-400 flex items-center justify-center gap-1.5"><Check size={13} /> Gespeichert</p>
        )}
      </div>
    </div>
  );
}

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
  const [legalOpen, setLegalOpen]                 = useState(false); // Rechtstexte standardmäßig eingeklappt
  const [themesOpen, setThemesOpen]               = useState(false); // Signature-Themes standardmäßig eingeklappt

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

      {/* Bonusprogramm (Abrechnung) ist in den Vertrag-Tab umgezogen */}

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

      {/* Signature-Themes (einklappbar) */}
      {shop.customDesignEnabled && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <button type="button" onClick={() => setThemesOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left">
            <Palette size={14} className={shop.theme ? "text-amber-400" : "text-zinc-500"} />
            <span className="text-sm font-semibold text-zinc-200">Signature-Themes</span>
            {shop.theme && <span className="text-[10px] text-amber-400">aktiv</span>}
            <ChevronRight size={14} className={`ml-auto text-zinc-600 transition-transform ${themesOpen ? "rotate-90" : ""}`} />
          </button>
          {themesOpen && (
          <div className="px-4 pb-4 pt-3 border-t border-zinc-800 space-y-3">
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
        </div>
      )}

      {/* Design-Editor (Config-Design) */}
      {shop.customDesignEnabled && <DesignEditor shop={shop} adminSecret={adminSecret} />}

      {/* Rechtliche Texte (einklappbar) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <button type="button" onClick={() => setLegalOpen(o => !o)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left">
          <FileText size={14} className={shop.impressumText ? "text-amber-400" : "text-zinc-500"} />
          <span className="text-sm font-semibold text-zinc-200">Rechtliche Texte</span>
          {shop.impressumText && shop.datenschutzText && <span className="text-[10px] text-green-400">✓ vollständig</span>}
          {shop.impressumText && !shop.datenschutzText && <span className="text-[10px] text-amber-400">! Datenschutz fehlt</span>}
          <ChevronRight size={14} className={`ml-auto text-zinc-600 transition-transform ${legalOpen ? "rotate-90" : ""}`} />
        </button>
        {legalOpen && (
        <div className="p-4 pt-3 space-y-3 border-t border-zinc-800">
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
        )}
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

// ─── ShopVertragTab ───────────────────────────────────────────────────────────
// Eigener Tab pro Shop: Vertrag im Detail — Modell + Preisaufschlüsselung,
// Zahlungsstatus (offen inkl. Bezahllink / bezahlt inkl. Laufzeit),
// komplette Zahlungshistorie und die Bonusprogramm-Verwaltung.

function ShopVertragTab({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const [contract, setContract] = useState<any | null | undefined>(undefined);
  const [copied, setCopied]     = useState(false);
  const [histOpen, setHistOpen] = useState(false); // Zahlungshistorie standardmäßig zu

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await affiliateQuery("admin:getContractForShop", { adminSecret, loatycardShopId: shop._id });
        if (!cancelled) setContract(c);
      } catch { if (!cancelled) setContract(null); }
    })();
    return () => { cancelled = true; };
  }, [shop._id, adminSecret]);

  if (contract === undefined) return (
    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
      className="text-zinc-500 text-sm text-center py-16">Laden...</motion.div>
  );
  if (contract === null) return (
    <div className="text-center py-16 text-zinc-600 text-sm">
      Kein Vertrag zu diesem Shop gefunden (Alt-Shop ohne Partnerprogramm-Anbindung).
    </div>
  );

  const paid      = contract.paymentCount > 0;
  const fmt       = (ts: number) => new Date(ts).toLocaleDateString("de-DE");
  const planTxt   = contract.planType === "annual" ? "Jahresabo" : "Monatsabo";
  const periodTxt = contract.planType === "annual" ? "Jahr" : "Monat";
  const aboBase   = contract.planType === "annual" ? 240 : 20;
  const payUrl    = contract.paymentToken ? `${AFFILIATE_APP_URL}/pay/${contract.paymentToken}` : "";

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(payUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const priceRow = (label: string, value: string, dim = false) => (
    <div className="flex justify-between text-xs">
      <span className={dim ? "text-zinc-600" : "text-zinc-400"}>{label}</span>
      <span className={dim ? "text-zinc-500" : "text-zinc-200"}>{value}</span>
    </div>
  );

  return (
    <motion.div key="vertrag" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Modell + Preise */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <FileText size={14} className="text-amber-400" />
          <span className="text-sm font-medium text-zinc-200">Vertrag</span>
          <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-md border ${paid
            ? "bg-green-900/25 border-green-800/40 text-green-400"
            : "bg-yellow-900/25 border-yellow-700/40 text-yellow-400"}`}>
            {paid ? "Bezahlt" : contract.payLaterAt ? "Später zahlen" : "Zahlung offen"}
          </span>
        </div>
        <div className="p-4 space-y-2.5">
          <p className="text-sm font-semibold text-zinc-100">{planTxt}</p>
          {priceRow(`LoyaltyCard ${planTxt}`, `€${aboBase}/${periodTxt}`)}
          {contract.rewardCount > 0 && priceRow(
            `Bonusprogramm (${contract.rewardCount} Belohnung${contract.rewardCount === 1 ? "" : "en"} × €${contract.rewardUnitPrice})`,
            `€${contract.rewardCount * contract.rewardUnitPrice}/${periodTxt}`
          )}
          <div className="border-t border-zinc-800 pt-2">
            {priceRow("Wiederkehrend gesamt", `€${contract.recurringPrice}/${periodTxt}`)}
          </div>
          {priceRow(`Einrichtung & Design (einmalig, 1. Rechnung)`, `€${contract.setupFee}`, true)}
          {contract.discountCode && priceRow(
            `Rabattcode ${contract.discountCode} (−${Math.round((contract.firstYearDiscount ?? 0) * 100)}%, nur 1. Rechnung)`,
            contract.paymentCount === 0 ? "aktiv" : "eingelöst", true
          )}
          {priceRow("Vertragsbeginn", fmt(contract.contractStart), true)}
        </div>
      </div>

      {/* Zahlungsstatus */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <Clock size={14} className={paid ? "text-green-400" : "text-yellow-400"} />
          <span className="text-sm font-medium text-zinc-200">{paid ? "Laufzeit" : "Offene Zahlung"}</span>
        </div>
        <div className="p-4 space-y-2.5">
          {paid ? (
            <>
              {contract.firstPaidAt   && priceRow("Abgeschlossen am", fmt(contract.firstPaidAt))}
              {contract.lastPaidAt && contract.paymentCount > 1 && priceRow(`Letzte Zahlung (#${contract.paymentCount})`, fmt(contract.lastPaidAt))}
              {contract.nextRenewalAt && priceRow("Läuft bis / Verlängerung am", fmt(contract.nextRenewalAt))}
              {contract.nextRenewalAt && (
                <p className="text-[10px] text-zinc-600">
                  Zur Verlängerung wird wieder €{contract.recurringPrice}/{periodTxt} fällig (ohne Einrichtung).
                </p>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl p-3 bg-yellow-900/15 border border-yellow-800/40">
                <p className="text-xs text-yellow-400">
                  Erste Zahlung offen: <b>€{contract.amountDue}</b>
                  {contract.payLaterAt ? ` · Später zahlen vorgemerkt am ${fmt(contract.payLaterAt)}` : ""}
                </p>
              </div>
              {payUrl && (
                <div className="flex items-center gap-2 bg-zinc-800 rounded-xl px-3 py-2">
                  <code className="text-[11px] text-amber-300 flex-1 truncate">{payUrl}</code>
                  <button onClick={copyLink} className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                    {copied ? <Check size={13} className="text-green-400" /> : <Link size={13} />}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Zahlungshistorie (einklappbar) */}
      {(contract.payments?.length ?? 0) > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <button type="button" onClick={() => setHistOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-3 text-left">
            <TrendingUp size={14} className="text-zinc-500" />
            <span className="text-sm font-medium text-zinc-200">Zahlungshistorie</span>
            <span className="ml-auto text-xs text-zinc-600">{contract.payments.length}</span>
            <ChevronRight size={14} className={`text-zinc-600 transition-transform ${histOpen ? "rotate-90" : ""}`} />
          </button>
          {histOpen && (
          <div className="divide-y divide-zinc-800/50 border-t border-zinc-800">
            {[...contract.payments].reverse().map((p: any) => (
              <div key={p.paymentNumber} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Zahlung #{p.paymentNumber}</span>
                  {p.isTest && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-500">Test</span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-zinc-200">€{p.amount}</p>
                  <p className="text-[10px] text-zinc-600">{fmt(p.paidAt)}</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* Bonusprogramm verwalten */}
      <ContractBonusCard shop={shop} adminSecret={adminSecret} />
    </motion.div>
  );
}

// ─── ShopWorkspace ───────────────────────────────────────────────────────────

type SubView = "dashboard" | "analytics" | "vertrag" | "einstellungen";

const SUB_TABS: { id: SubView; label: string; icon: LucideIcon }[] = [
  { id: "dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { id: "analytics",     label: "Analytics",     icon: BarChart2       },
  { id: "vertrag",       label: "Vertrag",       icon: FileText        },
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
          {subView === "vertrag"       && <ShopVertragTab    key={`${shop._id}-vertr`} shop={shop} adminSecret={adminSecret} />}
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

// ─── CreateShopForm ───────────────────────────────────────────────────────────

function CreateShopForm({ onDone, adminSecret }: { onDone: () => void; adminSecret: string }) {
  const createShop = useMutation(api.shops.createShop);
  const deleteShop = useMutation(api.shops.adminDeleteShop);
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
        // Rollback: Schlägt die Vertragsanlage fehl, den gerade erstellten Shop
        // sofort wieder löschen — sonst bleibt bei jedem Versuch ein Shop ohne
        // Vertrag in der Übersicht zurück (Duplikate).
        try { await deleteShop({ shopId: created.shopId, adminSecret }); } catch {}
        setError(`Shop NICHT erstellt, Vertrag fehlgeschlagen: ${errMsg(err, "Fehler")}`);
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
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Einmalig €99, bei jedem Shop automatisch dabei. Mit Rabattcode auf der Zahlungsseite nur €45.
          </p>
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-2">Bonusprogramm: zusätzliche Belohnungsstufen</label>
          <div className="rounded-xl p-3 flex items-center justify-between bg-zinc-800 border border-zinc-700">
            <div>
              <p className="text-sm font-semibold text-zinc-100">{rewardCount} Zusatz-Stufe{rewardCount === 1 ? "" : "n"}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                Basis-Belohnung inklusive · €5/Monat pro Zusatz-Stufe{planType === "annual" ? " (€60/Jahr)" : ""}
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
  const payStatus = usePayStatus(adminSecret);
  const openPayments = Object.values(payStatus).filter(s => !s.paid);
  const [showAllShops, setShowAllShops] = useState(false);

  if (!globalStats) {
    return (
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
        className="text-zinc-500 text-sm text-center py-16">Laden...</motion.div>
    );
  }

  // Shops mit offener Zahlung zählen nicht in die Statistik, sie stehen in
  // der eigenen Kategorie "Zahlung offen" darunter.
  const statCards = [
    { icon: Store, label: "Shops",       value: globalStats.totalShops - openPayments.length, color: "text-amber-400" },
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

      {/* Eigene Kategorie "Zahlung offen" (inkl. Später zahlen) */}
      {openPayments.length > 0 && (
        <div className="bg-zinc-900 border border-yellow-800/40 rounded-2xl p-4">
          <Clock size={20} className="text-yellow-400 mb-3" />
          <p className="text-3xl font-bold text-zinc-100">{openPayments.length}</p>
          <p className="text-xs text-yellow-400 mt-1">
            Zahlung offen · gesamt €{openPayments.reduce((s, p) => s + p.amountDue, 0)}
          </p>
        </div>
      )}

      {/* Später-zahlen-Liste (mit Bezahllink und Erledigt-Button) */}
      <PayLaterCard adminSecret={adminSecret} />

      {globalStats.shops.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-800">
            <Store size={14} className="text-zinc-500" />
            <span className="text-sm font-medium text-zinc-200">Shops</span>
            {openPayments.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-yellow-900/25 border border-yellow-700/40 text-yellow-400">
                {openPayments.length} offen
              </span>
            )}
            <span className="ml-auto text-xs text-zinc-600">{globalStats.shops.length}</span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {[...globalStats.shops].sort((a, b) => a.name.localeCompare(b.name))
              .slice(0, showAllShops ? undefined : 10)
              .map((shop, i) => (
              <motion.button key={shop._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(0.15 + i * 0.03, 0.4) }}
                onClick={() => onSelectShop(shop._id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/40 transition-colors text-left">
                <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Store size={13} className="text-amber-400" />
                </div>
                <span className="flex-1 text-sm text-zinc-200 font-medium truncate flex items-center gap-2">
                  {shop.name}
                  <PayBadge status={payStatus[shop._id]} />
                </span>
                <ChevronRight size={14} className="text-zinc-600 shrink-0" />
              </motion.button>
            ))}
          </div>
          {globalStats.shops.length > 10 && (
            <button onClick={() => setShowAllShops(v => !v)}
              className="w-full py-3 text-xs text-zinc-500 hover:text-zinc-300 border-t border-zinc-800 transition-colors">
              {showAllShops ? "Weniger anzeigen" : `Alle ${globalStats.shops.length} Shops anzeigen`}
            </button>
          )}
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"alle" | "aktiv" | "offen" | "inaktiv">("alle");
  const [showAll, setShowAll] = useState(false);
  const payStatus = usePayStatus(adminSecret);

  // Neueste zuerst, damit frisch angelegte Shops oben stehen
  const sorted = [...(shops ?? [])].sort((a, b) => b._creationTime - a._creationTime);
  const q = search.trim().toLowerCase();
  const activeCount   = sorted.filter(s => s.active !== false).length;
  const openCount     = sorted.filter(s => payStatus[s._id] && !payStatus[s._id].paid).length;
  const inactiveCount = sorted.filter(s => s.active === false).length;
  const filtered = sorted.filter(s => {
    if (q && !s.name.toLowerCase().includes(q) && !s.slug.toLowerCase().includes(q)) return false;
    if (filter === "aktiv")   return s.active !== false;
    if (filter === "offen")   return !!payStatus[s._id] && !payStatus[s._id].paid;
    if (filter === "inaktiv") return s.active === false;
    return true;
  });
  // Bei Suche/Filter alles zeigen, sonst erst nach Klick auf "Alle anzeigen"
  const LIMIT = 25;
  const capped = !showAll && !q && filter === "alle" && filtered.length > LIMIT;
  const visible = capped ? filtered.slice(0, LIMIT) : filtered;

  const chips: { id: typeof filter; label: string; count: number | null }[] = [
    { id: "alle",    label: "Alle",          count: sorted.length },
    { id: "aktiv",   label: "Aktiv",         count: activeCount },
    { id: "offen",   label: "Zahlung offen", count: openCount },
    { id: "inaktiv", label: "Inaktiv",       count: inactiveCount },
  ];

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

      {/* Suche + Filter: erst relevant, wenn die Liste wächst */}
      {(shops?.length ?? 0) > 5 && (
        <div className="space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Shop suchen…"
              className="w-full pl-8 pr-8 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chips.map(c => (
              <button key={c.id} onClick={() => setFilter(c.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  filter === c.id
                    ? "bg-amber-400 border-amber-400 text-zinc-900"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"}`}>
                {c.label}{c.count !== null ? ` (${c.count})` : ""}
              </button>
            ))}
          </div>
        </div>
      )}

      {shops === undefined && (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm text-center py-10">Laden...</motion.div>
      )}
      {shops?.length === 0 && !showCreate && (
        <div className="text-center py-10 text-zinc-600 text-sm">Noch keine Shops. Klicke Neu um den ersten anzulegen.</div>
      )}
      {shops && shops.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10 text-zinc-600 text-sm">Keine Treffer{q ? ` für „${search}"` : ""}.</div>
      )}
      {visible.map((shop, i) => (
        <ShopListItem key={shop._id} shop={shop} index={i} onSelect={() => onSelectShop(shop._id)}
          payStatus={payStatus[shop._id]} />
      ))}
      {capped && (
        <button onClick={() => setShowAll(true)}
          className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Alle {filtered.length} Shops anzeigen
        </button>
      )}
    </motion.div>
  );
}

// ─── PeriodSelector ───────────────────────────────────────────────────────────


// ─── ShopAnalytics (pro Shop, wird in ShopWorkspace eingebettet) ──────────────


// Statistik-PDF im Loyaltycard-Look (react-pdf, siehe app/components/reportPdf)
async function exportShopPdf(shop: Doc<"shops">, period: Period, adminSecret: string, data: {
  stamps: number; redeems: number; stampValue: number | null;
  rewardBreakdown: { rewardText: string; count: number; valuePerRedemption: number | null }[];
  customers: { customerName: string; stamps: number; redeems: number; currentStamps: number }[];
}, company?: Doc<"companyProfile"> | null) {
  const [{ pdf }, { LoyaltyReport }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/app/components/reportPdf"),
  ]);
  const required = shop.stampsRequired || 10;
  const avg = data.customers.length
    ? Math.round(data.customers.reduce((s, c) => s + c.currentStamps, 0) / data.customers.length)
    : 0;

  // Vertragsdaten aus der Affiliate-App (Modell, Preis, Bezahlstatus, Daten)
  const fmtDate = (ts: number) => new Date(ts).toLocaleDateString("de-DE");
  let contract: {
    plan: string; price: string; paid: boolean; statusLabel: string;
    firstPaidAt: string | null; nextRenewalAt: string | null;
  } | null = null;
  try {
    const c = await affiliateQuery("admin:getContractForShop", { adminSecret, loatycardShopId: shop._id }) as {
      planType: "annual" | "monthly"; recurringPrice: number; paymentCount: number;
      payLaterAt?: number; firstPaidAt?: number; nextRenewalAt?: number;
    } | null;
    if (c) {
      const per = c.planType === "annual" ? "Jahr" : "Monat";
      const paid = c.paymentCount > 0;
      contract = {
        plan: c.planType === "annual" ? "Jahresabo" : "Monatsabo",
        price: `${c.recurringPrice} €/${per}`,
        paid,
        statusLabel: paid ? "Bezahlt" : c.payLaterAt ? "Später zahlen" : "Zahlung offen",
        firstPaidAt: paid && c.firstPaidAt ? fmtDate(c.firstPaidAt) : null,
        nextRenewalAt: c.nextRenewalAt ? fmtDate(c.nextRenewalAt) : null,
      };
    }
  } catch { /* kein Vertrag / Affiliate-App nicht erreichbar → Sektion entfällt */ }

  const reportData = {
    shopName: shop.name,
    periodLabel: PERIOD_LABELS[period],
    dateStr: new Date().toLocaleDateString("de-DE"),
    stamps: data.stamps,
    redeems: data.redeems,
    customerCount: data.customers.length,
    rewards: data.rewardBreakdown.map((r) => ({
      text: r.rewardText,
      count: r.count,
      value: r.valuePerRedemption != null && data.stampValue
        ? `€${(r.count * r.valuePerRedemption).toLocaleString("de-DE")}` : null,
    })),
    customers: data.customers.slice(0, 10).map((c) => ({
      name: c.customerName, stamps: c.stamps, redeems: c.redeems, currentStamps: c.currentStamps, required,
    })),
    progress: { cur: avg, req: required, remaining: Math.max(required - avg, 0) },
    contract,
    company: company ?? null,
  };
  const blob = await pdf(<LoyaltyReport data={reportData} />).toBlob();
  const file = new File([blob], `${shop.slug}-bericht.pdf`, { type: "application/pdf" });
  const nav = navigator as Navigator & { share?: (d: object) => Promise<void> };
  if (typeof navigator !== "undefined" && nav.share) {
    try { await nav.share({ files: [file], title: `${shop.name} Bericht` }); return; } catch { /* Download-Fallback */ }
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
  const company = useQuery(api.company.getCompanyProfile, { adminSecret });

  const handleExport = async () => {
    if (!data) return;
    setExporting(true);
    try { await exportShopPdf(shop, period, adminSecret, data, company); }
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

function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "gerade eben";
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  return `vor ${Math.floor(h / 24)} Tg`;
}

type SystemHealth = {
  now: number;
  counts: { shops: number; customers: number; memberships: number; stampEvents: number };
  lastActivity: number | null;
};

// System & Auslastung: Live-Health-Ping + Kapazitäts-Ampel direkt in der App.
// Detaillierte Fehler/Performance bleiben im Convex-Dashboard.
function SystemHealthCard({ adminSecret }: { adminSecret: string }) {
  const convex = useConvex();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);

  // Auslastungs-Zahlen bewusst NICHT live-reaktiv, sondern nur alle 30s laden
  // (spart Lesebudget) und nur solange die Karte aufgeklappt ist.
  useEffect(() => {
    if (!adminSecret || !open) return;
    let cancelled = false;
    const load = async () => {
      try {
        const h = await convex.query(api.system.getSystemHealth, { adminSecret });
        if (!cancelled) setHealth(h);
      } catch { /* still — nächster Tick versucht es erneut */ }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [convex, adminSecret, open]);

  // Health-Ping (nur Antwortzeit, kein DB-Zugriff) alle 4s
  useEffect(() => {
    let cancelled = false;
    const doPing = async () => {
      const t0 = performance.now();
      try {
        await convex.query(api.system.ping, {});
        if (!cancelled) { setLatency(Math.round(performance.now() - t0)); setOnline(true); }
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    doPing();
    const id = setInterval(doPing, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [convex]);

  // Ampel-Schwellen: Convex liest max. ~16.000 Dokumente pro Query
  const rows = health ? [
    { label: "Shops",            value: health.counts.shops,       warn: 300,   crit: 800 },
    { label: "Kunden",           value: health.counts.customers,   warn: 10000, crit: 15000 },
    { label: "Mitgliedschaften", value: health.counts.memberships, warn: 10000, crit: 15000 },
    { label: "Stempel-Aktionen", value: health.counts.stampEvents, warn: 12000, crit: 15000 },
  ] : [];
  const ampel = (v: number, warn: number, crit: number) =>
    v >= crit ? "#f87171" : v >= warn ? "#fbbf24" : "#4ade80";
  // Ping-Ampel: <300 ms grün, <800 ms gelb, sonst rot (meist eigenes Netz)
  const pingColor = !online ? "#f87171"
    : latency == null ? "#4ade80"
    : latency >= 800 ? "#f87171" : latency >= 300 ? "#fbbf24" : "#4ade80";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-5 py-4 text-left ${open ? "border-b border-zinc-800" : ""}`}>
        <BarChart2 size={15} className="text-amber-400" />
        <span className="text-sm font-medium text-zinc-200">System & Auslastung</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: pingColor }} />
          <span className="text-[11px]" style={{ color: pingColor }}>
            {online ? `Online${latency != null ? ` · ${latency} ms` : ""}` : "Keine Verbindung"}
          </span>
        </span>
        <ChevronRight size={14} className={`text-zinc-600 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
      <div className="p-5 space-y-4">
        {!health ? (
          <p className="text-sm text-zinc-500">Laden…</p>
        ) : (
          <>
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.label} className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ampel(r.value, r.warn, r.crit) }} />
                  <span className="text-sm text-zinc-300 flex-1">{r.label}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: ampel(r.value, r.warn, r.crit) }}>
                    {r.value.toLocaleString("de-DE")}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 pt-3 border-t border-zinc-800">
              Letzte Stempel-Aktivität: {health.lastActivity != null ? relTime(health.lastActivity) : "noch keine"}
            </p>
          </>
        )}
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Grün = viel Luft, Gelb = beobachten, Rot = Grenze naht. Detaillierte Fehler & Performance findest du im Convex-Dashboard.
        </p>
      </div>
      )}
    </div>
  );
}

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
      <SystemHealthCard adminSecret={adminSecret} />
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
        <p className="text-[11px] text-zinc-500">Löscht alle gespeicherten Tokens auf <span className="text-zinc-400 font-medium">diesem Gerät</span> (QR-Token, Admin-PIN, Shop-Login). Nur lokal, keine Daten in der Datenbank werden gelöscht.</p>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

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
