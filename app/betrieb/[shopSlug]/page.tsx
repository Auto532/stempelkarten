"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Users, Award, Stamp, X, Check, QrCode,
  Phone, Printer, Search, Gift, Plus, TrendingUp,
  Trophy, ChevronRight, ArrowLeft, Settings, KeyRound, Share2, Copy,
} from "lucide-react";
import { QRImage } from "@/app/components/QRImage";
import { getShopTheme, DEFAULT_COLORS } from "@/app/me/themes/registry";
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";
import QRCode from "qrcode";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then(m => m.Scanner),
  { ssr: false, loading: () => <div className="aspect-square bg-zinc-900 rounded-2xl animate-pulse" /> }
);

async function printQR(shopName: string, url: string) {
  const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2, color: { dark: "#000000", light: "#ffffff" } });
  const w = window.open("", "_blank", "width=520,height=640");
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${shopName} – QR Code</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#fff;font-family:-apple-system,sans-serif;gap:20px;padding:40px;text-align:center}img{width:300px;height:300px}h2{font-size:24px;font-weight:700;color:#111}p{font-size:14px;color:#555}.url{font-size:11px;color:#aaa;font-family:monospace;margin-top:4px;word-break:break-all}</style>
  </head><body>
  <h2>${shopName}</h2><img src="${dataUrl}" alt="QR Code" />
  <div><p>Digitale Stempelkarte</p><p class="url">${url}</p></div>
  <script>setTimeout(()=>window.print(),400)</script>
  </body></html>`);
  w.document.close();
}

type Tier = { stamps: number; text: string; enabled: boolean };
type View = "home" | "einstellungen" | "kunden" | "einloesungen" | "qr" | "scan" | "wiederherstellung";

export default function BetriebDashboard() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });

  const [authorized, setAuthorized] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [view, setView] = useState<View>("home");
  const [showAllCustomers, setShowAllCustomers] = useState(false);
  const [showAllRedemptions, setShowAllRedemptions] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [openRedemptionId, setOpenRedemptionId] = useState<string | null>(null);

  // Base settings
  const [stampsRequired, setStampsRequired] = useState(0);
  const [rewardText, setRewardText] = useState("");
  const [baseSaving, setBaseSaving] = useState(false);
  const [baseSaved, setBaseSaved] = useState(false);

  // Tiers
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tiersInit, setTiersInit] = useState(false);
  const [tierSaving, setTierSaving] = useState(false);
  const [tierSaved, setTierSaved] = useState(false);

  // Milestones
  const [milestones, setMilestones] = useState<Tier[]>([]);
  const [milestonesInit, setMilestonesInit] = useState(false);
  const [milestoneSaving, setMilestoneSaving] = useState(false);
  const [milestoneSaved, setMilestoneSaved] = useState(false);

  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState<string | null>(null);
  const [recoveryCopied, setRecoveryCopied] = useState(false);

  const recoveryResult = useQuery(
    api.customers.findCustomerByPhone,
    submittedPhone && adminToken ? { phone: submittedPhone, adminToken } : "skip"
  );

  const updateSettings = useMutation(api.shops.updateSettings);
  const updateMilestones = useMutation(api.shops.updateMilestones);

  const customers = useQuery(
    api.shops.listCustomersForShop,
    shop && adminToken ? { shopId: shop._id, adminToken, limit: showAllCustomers ? undefined : 20 } : "skip"
  );
  const redemptions = useQuery(
    api.memberships.getRedemptionsForShop,
    shop?.bonusProgramEnabled && shop && adminToken ? { shopId: shop._id, adminToken, limit: showAllRedemptions ? undefined : 20 } : "skip"
  );

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    const slug = localStorage.getItem("adminShopSlug");
    if (!token || slug !== shopSlug) { router.replace("/"); return; }
    setAdminToken(token);
    setAuthorized(true);
  }, [router, shopSlug]);

  useEffect(() => {
    if (shop) { setStampsRequired(shop.stampsRequired); setRewardText(shop.rewardText); }
  }, [shop]);

  useEffect(() => {
    if (shop && !tiersInit) {
      setTiersInit(true);
      setTiers(shop.rewardTiers?.length ? [...shop.rewardTiers] : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }]);
    }
  }, [shop, tiersInit]);

  useEffect(() => {
    if (shop && !milestonesInit) {
      setMilestonesInit(true);
      setMilestones(shop.milestones ? [...shop.milestones] : []);
    }
  }, [shop, milestonesInit]);

  useShopThemeSync(shop);

  if (!authorized || shop === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }
  if (!shop) return null;

  const theme = getShopTheme(shop);
  const c = theme?.colors ?? DEFAULT_COLORS;
  const ic = c.accent;
  const tx = c.text;
  const tm = c.accentDim;
  const tb = c.textBody;
  const card = c.card;
  const sub  = c.sub;
  const inp  = c.input;
  const div  = c.divider;
  const btn  = c.gradient;

  const totalStamps  = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
  const totalRewards = customers?.reduce((s, c) => s + c.membership.rewardsRedeemed, 0) ?? 0;
  const activeTiers: Tier[] = shop.bonusProgramEnabled && shop.rewardTiers?.some(t => t.enabled)
    ? shop.rewardTiers!.filter(t => t.enabled).sort((a, b) => a.stamps - b.stamps)
    : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }];
  const lowestTierStamps = activeTiers[0].stamps;
  const readyCount = customers?.filter(({ membership }) => membership.currentStamps >= lowestTierStamps).length ?? 0;
  const filteredCustomers = customers?.filter(({ customer }) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return customer?.name.toLowerCase().includes(q) || (shop.showLeads && customer?.phone.includes(q));
  }) ?? [];

  const baseDirty = stampsRequired !== shop.stampsRequired || rewardText !== shop.rewardText;
  const tiersDirty = JSON.stringify(tiers) !== JSON.stringify(
    shop.rewardTiers?.length ? shop.rewardTiers : [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }]
  );
  const milestonesDirty = JSON.stringify(milestones) !== JSON.stringify(shop.milestones ?? []);

  const handleSaveBase = async () => {
    setBaseSaving(true);
    try {
      await updateSettings({ shopId: shop._id, adminToken, stampsRequired, rewardText });
      setBaseSaved(true); setTimeout(() => setBaseSaved(false), 2500);
    } finally { setBaseSaving(false); }
  };

  const handleSaveTiers = async () => {
    setTierSaving(true);
    try {
      const sorted = [...tiers].sort((a, b) => a.stamps - b.stamps);
      const primary = sorted.find(t => t.enabled) ?? { stamps: shop.stampsRequired, text: shop.rewardText };
      await updateSettings({ shopId: shop._id, adminToken, stampsRequired: primary.stamps, rewardText: primary.text, rewardTiers: sorted.length > 1 ? sorted : undefined });
      setTierSaved(true); setTimeout(() => setTierSaved(false), 2500);
    } finally { setTierSaving(false); }
  };

  const handleSaveMilestones = async () => {
    setMilestoneSaving(true);
    try {
      await updateMilestones({ shopId: shop._id, adminToken, milestones: [...milestones].sort((a, b) => a.stamps - b.stamps) });
      setMilestoneSaved(true); setTimeout(() => setMilestoneSaved(false), 2500);
    } finally { setMilestoneSaving(false); }
  };

  const wrapperClass = `min-h-screen max-w-sm mx-auto px-5 pb-16 ${theme ? "relative z-[2]" : ""}`;

  // ── Sub-page header ────────────────────────────────────────────────────────
  function SubHeader({ title }: { title: string }) {
    return (
      <div className="flex items-center gap-3 pt-12 pb-6">
        <button onClick={() => setView("home")}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={card}>
          <ArrowLeft size={16} style={{ color: tm }} />
        </button>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: tm }}>Inhaber</p>
          <h1 className="text-lg font-bold leading-tight" style={{ color: tx }}>{title}</h1>
        </div>
      </div>
    );
  }

  // ── SaveBar ────────────────────────────────────────────────────────────────
  function SaveBar({ dirty, saving, saved, onSave, onReset }: {
    dirty: boolean; saving: boolean; saved: boolean; onSave: () => void; onReset: () => void;
  }) {
    if (!dirty && !saved) return null;
    return (
      <div className="flex items-center gap-2 mt-2">
        {saved ? (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-green-400">
            <Check size={12} /> Gespeichert
          </motion.span>
        ) : (
          <>
            <button onClick={onSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: btn, color: "#18181b" }}>
              {saving ? "Speichert…" : "Speichern"}
            </button>
            <button onClick={onReset} className="py-2.5 px-3 rounded-xl"
              style={{ ...sub, color: tm }}>
              <X size={14} />
            </button>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HOME VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "home") {
    return (
      <div className={wrapperClass}>
        {theme && <theme.Background />}

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-10 pb-6">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 transition-colors"
            style={card}>
            <ArrowLeft size={16} style={{ color: tm }} />
          </button>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: tm }}>Inhaber · {shop.name}</p>
          <h1 className="text-3xl font-bold mt-1" style={{ color: tx }}>Dashboard</h1>
        </motion.div>

        {/* Scan — Primary CTA */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setView("scan")}
          className="w-full rounded-2xl p-5 flex items-center gap-4 mb-5"
          style={{ background: btn }}
        >
          <div className="w-12 h-12 bg-black/15 rounded-xl flex items-center justify-center shrink-0">
            <ScanLine size={26} className="text-zinc-900" />
          </div>
          <div className="text-left flex-1">
            <p className="font-bold text-lg text-zinc-900 leading-tight">Kunden scannen</p>
            <p className="text-zinc-900/60 text-sm">Stempel vergeben</p>
          </div>
          <ChevronRight size={20} className="text-zinc-900/40 shrink-0" />
        </motion.button>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Kunden", value: customers?.length ?? "–", icon: Users },
            { label: "Stempel", value: totalStamps, icon: Stamp },
            { label: "Belohnungen", value: totalRewards, icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl p-4 text-center" style={card}>
              <Icon size={17} className="mx-auto mb-1.5" style={{ color: ic }} />
              <p className="text-xl font-bold" style={{ color: tx }}>{value}</p>
              <p className="text-[10px] mt-0.5" style={{ color: tm }}>{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Nav Grid */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3">
          {[
            {
              id: "kunden" as View,
              icon: Users,
              label: "Kunden",
              sub: readyCount > 0
                ? `${readyCount} bereit`
                : `${customers?.length ?? "–"} gesamt`,
              badge: readyCount > 0 ? readyCount : null,
            },
            {
              id: "einstellungen" as View,
              icon: Settings,
              label: "Einstellungen",
              sub: `${shop.stampsRequired} Stempel · ${shop.rewardText.slice(0, 18)}${shop.rewardText.length > 18 ? "…" : ""}`,
              badge: null,
            },
            ...(shop.bonusProgramEnabled ? [{
              id: "einloesungen" as View,
              icon: Gift,
              label: "Einlösungen",
              sub: redemptions ? `${redemptions.length} vergeben` : "Treue Bonus",
              badge: null,
            }] : []),
            {
              id: "qr" as View,
              icon: QrCode,
              label: "QR-Code",
              sub: "Drucken & aufhängen",
              badge: null,
            },
            {
              id: "wiederherstellung" as View,
              icon: KeyRound,
              label: "Konto suchen",
              sub: "Karte wiederherstellen",
              badge: null,
            },
          ].map(({ id, icon: Icon, label, sub, badge }) => (
            <motion.button key={id} whileTap={{ scale: 0.96 }}
              onClick={() => setView(id)}
              className="rounded-2xl p-4 flex flex-col items-start gap-3 text-left transition-colors"
              style={card}>
              <div className="flex items-center justify-between w-full">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${ic}18` }}>
                  <Icon size={18} style={{ color: ic }} />
                </div>
                {badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${ic}22`, border: `1px solid ${ic}55`, color: ic }}>
                    {badge}
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: tx }}>{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: tm }}>{sub}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {/* Legal */}
        {(shop.impressumText || shop.datenschutzText) && (
          <div className="flex justify-center gap-3 pt-8">
            {shop.impressumText && <a href={`/me/impressum/${shopSlug}`} className="text-[11px]" style={{ color: tm }}>Impressum</a>}
            {shop.impressumText && shop.datenschutzText && <span style={{ color: tm }}>·</span>}
            {shop.datenschutzText && <a href={`/me/datenschutz/${shopSlug}`} className="text-[11px]" style={{ color: tm }}>Datenschutz</a>}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EINSTELLUNGEN VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "einstellungen") {
    return (
      <div className={wrapperClass}>
        {theme && <theme.Background />}
        <SubHeader title="Einstellungen" />

        <div className="space-y-5">
          {/* Stempelkarte + Bonus-Stufen — eine einzige Karte, expandiert bei Bonus-Programm */}
          <div className="rounded-2xl overflow-hidden" style={card}>
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${div}` }}>
              <Stamp size={15} style={{ color: ic }} />
              <span className="font-semibold text-sm" style={{ color: tx }}>Stempelkarte</span>
              {shop.bonusProgramEnabled && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${ic}18`, border: `1px solid ${ic}44`, color: ic }}>
                  Bonus-Programm aktiv
                </span>
              )}
            </div>

            {/* Basis-Einstellung: immer sichtbar */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: tm }}>
                  {shop.bonusProgramEnabled ? "Standard-Stempel (erste Stufe)" : "Stempel bis Belohnung"}
                </label>
                <input type="number" min={1} max={50} value={stampsRequired}
                  onChange={e => setStampsRequired(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={inp} />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: tm }}>
                  {shop.bonusProgramEnabled ? "Standard-Belohnung" : "Belohnungstext"}
                </label>
                <input value={rewardText} onChange={e => setRewardText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={inp} />
              </div>
              <SaveBar dirty={baseDirty} saving={baseSaving} saved={baseSaved}
                onSave={handleSaveBase} onReset={() => { setStampsRequired(shop.stampsRequired); setRewardText(shop.rewardText); }} />
            </div>

            {/* Bonus-Stufen: nur wenn Bonus-Programm aktiv */}
            <AnimatePresence>
              {shop.bonusProgramEnabled && (
                <motion.div key="tiers" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="px-5 pb-5 space-y-3" style={{ borderTop: `1px solid ${div}` }}>
                    <div className="pt-4 flex items-center gap-2">
                      <TrendingUp size={13} style={{ color: ic }} />
                      <p className="text-xs font-semibold" style={{ color: tx }}>Weitere Bonus-Stufen</p>
                    </div>
                    <p className="text-[11px]" style={{ color: tm }}>Zusätzliche Belohnungen für mehr Stempel — Stufe 1 ist der Standard oben.</p>
                    {tiers.length <= 1 && (
                      <p className="text-[11px] py-1" style={{ color: tm }}>Noch keine weiteren Stufen — füge eine hinzu.</p>
                    )}
                    {tiers.map((tier, i) => (
                      i === 0 ? null : (
                        <div key={i} className="rounded-xl p-3 space-y-2" style={sub}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold" style={{ color: tm }}>Stufe {i + 1}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setTiers(p => p.map((t, idx) => idx === i ? { ...t, enabled: !t.enabled } : t))}
                                className="text-[10px] px-2 py-0.5 rounded-full border"
                                style={tier.enabled
                                  ? { background: `${ic}22`, border: `1px solid ${ic}55`, color: ic }
                                  : { background: "transparent", border: `1px solid ${tm}55`, color: tm }}>
                                {tier.enabled ? "Aktiv" : "Inaktiv"}
                              </button>
                              <button onClick={() => setTiers(p => p.filter((_, idx) => idx !== i))} style={{ color: tm }}><X size={14} /></button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <input type="number" min={1} max={100} value={tier.stamps}
                              onChange={e => setTiers(p => p.map((t, idx) => idx === i ? { ...t, stamps: Number(e.target.value) } : t))}
                              className="w-16 px-2 py-1.5 rounded-lg text-sm text-center focus:outline-none" style={inp} />
                            <input value={tier.text}
                              onChange={e => setTiers(p => p.map((t, idx) => idx === i ? { ...t, text: e.target.value } : t))}
                              placeholder="Belohnung…"
                              className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none placeholder-zinc-600" style={inp} />
                          </div>
                          <p className="text-[10px]" style={{ color: tm }}>Bei {tier.stamps} Stempeln: {tier.text || "…"}</p>
                        </div>
                      )
                    ))}
                    <button
                      onClick={() => setTiers(p => [...p, { stamps: (p[p.length - 1]?.stamps ?? stampsRequired) + 5, text: "", enabled: true }])}
                      className="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                      style={{ border: `1px dashed ${tm}55`, color: tm }}>
                      <Plus size={12} /> Weitere Stufe hinzufügen
                    </button>
                    <SaveBar dirty={tiersDirty} saving={tierSaving} saved={tierSaved}
                      onSave={handleSaveTiers} onReset={() => setTiersInit(false)} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Meilensteine */}
          <AnimatePresence>
            {shop.milestonesEnabled && (
              <motion.div key="milestones" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl overflow-hidden" style={card}>
                <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: `1px solid ${div}` }}>
                  <Trophy size={15} style={{ color: ic }} />
                  <span className="font-semibold text-sm" style={{ color: tx }}>Treue-Meilensteine</span>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-[11px]" style={{ color: tm }}>Belohnungen für Stammkunden — basieren auf Gesamtstempeln, nie zurückgesetzt.</p>
                  {milestones.length === 0 && <p className="text-sm text-center py-2" style={{ color: tm }}>Noch keine Meilensteine</p>}
                  {milestones.map((m, i) => (
                    <div key={i} className="rounded-xl p-3 space-y-2" style={sub}>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold" style={{ color: tm }}>Meilenstein {i + 1}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setMilestones(p => p.map((t, idx) => idx === i ? { ...t, enabled: !t.enabled } : t))}
                            className="text-[10px] px-2 py-0.5 rounded-full border"
                            style={m.enabled
                              ? { background: `${ic}22`, border: `1px solid ${ic}55`, color: ic }
                              : { background: "transparent", border: `1px solid ${tm}55`, color: tm }}>
                            {m.enabled ? "Aktiv" : "Inaktiv"}
                          </button>
                          <button onClick={() => setMilestones(p => p.filter((_, idx) => idx !== i))} style={{ color: tm }}><X size={14} /></button>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input type="number" min={1} value={m.stamps}
                          onChange={e => setMilestones(p => p.map((t, idx) => idx === i ? { ...t, stamps: Number(e.target.value) } : t))}
                          className="w-16 px-2 py-1.5 rounded-lg text-sm text-center focus:outline-none" style={inp} />
                        <input value={m.text}
                          onChange={e => setMilestones(p => p.map((t, idx) => idx === i ? { ...t, text: e.target.value } : t))}
                          placeholder="z.B. Bronze Stammkunde…"
                          className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none placeholder-zinc-600" style={inp} />
                      </div>
                      <p className="text-[10px]" style={{ color: tm }}>Ab {m.stamps} Stempeln gesamt: {m.text || "…"}</p>
                    </div>
                  ))}
                  <button
                    onClick={() => setMilestones(p => [...p, { stamps: (p[p.length - 1]?.stamps ?? 25) * 2, text: "", enabled: true }])}
                    className="w-full py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                    style={{ border: `1px dashed ${tm}55`, color: tm }}>
                    <Plus size={12} /> Meilenstein hinzufügen
                  </button>
                  <SaveBar dirty={milestonesDirty} saving={milestoneSaving} saved={milestoneSaved}
                    onSave={handleSaveMilestones} onReset={() => setMilestonesInit(false)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // KUNDEN VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "kunden") {
    return (
      <div className={wrapperClass}>
        {theme && <theme.Background />}
        <SubHeader title="Kunden" />

        <div className="rounded-2xl overflow-hidden" style={card}>
          {/* Search */}
          <div className="px-4 py-3" style={{ borderBottom: `1px solid ${div}` }}>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: tm }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen…"
                className="w-full pl-8 pr-3 py-2 rounded-xl text-sm placeholder-zinc-600 focus:outline-none"
                style={inp} />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: tm }}><X size={13} /></button>}
            </div>
          </div>

          {/* Summary row */}
          <div className="flex items-center gap-4 px-5 py-2.5" style={{ borderBottom: `1px solid ${div}` }}>
            <span className="text-xs" style={{ color: tm }}>{customers?.length ?? "–"} Kunden</span>
            {readyCount > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                style={{ background: `${ic}18`, border: `1px solid ${ic}44`, color: ic }}>
                <Gift size={9} /> {readyCount} bereit
              </span>
            )}
          </div>

          {/* Table header */}
          <div className="flex items-center px-4 py-1.5" style={{ borderBottom: `1px solid ${div}` }}>
            <div className="w-7 mr-3 shrink-0" />
            <span className="flex-1 text-[10px] uppercase tracking-wider" style={{ color: tm }}>Kunde</span>
            <span className="text-[10px] uppercase tracking-wider w-12 text-right" style={{ color: tm }}>Stand</span>
            {shop.showLeads && <div className="w-4 ml-1" />}
          </div>

          {/* List */}
          <div>
            {customers === undefined && <p className="px-5 py-8 text-center text-sm" style={{ color: tm }}>Laden...</p>}
            {customers?.length === 0 && <p className="px-5 py-8 text-center text-sm" style={{ color: tm }}>Noch keine Kunden</p>}
            {customers !== undefined && filteredCustomers.length === 0 && search && (
              <p className="px-5 py-8 text-center text-sm" style={{ color: tm }}>Keine Treffer für „{search}"</p>
            )}
            {filteredCustomers.map(({ customer, membership }, i) => {
              if (!customer) return null;
              const isSelected = selectedCustomerId === customer._id;
              const isReady = membership.currentStamps >= lowestTierStamps;
              return (
                <motion.div key={membership._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  style={{ borderBottom: `1px solid ${div}44` }}>
                  <button
                    onClick={() => shop.showLeads ? setSelectedCustomerId(isSelected ? null : customer._id) : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left ${shop.showLeads ? "cursor-pointer" : "cursor-default"}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={isReady ? { background: ic, color: "#18181b" }
                        : { background: c.dark, border: c.card.border, color: c.accent }}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm truncate" style={{ color: tb }}>{customer.name}</span>
                    {isReady && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                        style={{ background: `${ic}22`, border: `1px solid ${ic}55`, color: ic }}>BEREIT</span>
                    )}
                    <span className="text-xs shrink-0 w-12 text-right" style={{ color: tm }}>
                      {membership.currentStamps}/{lowestTierStamps}
                    </span>
                    {shop.showLeads && <ChevronRight size={13} style={{ color: tm }} className={`shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />}
                  </button>
                  <AnimatePresence>
                    {shop.showLeads && isSelected && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mx-4 mb-3 rounded-xl p-4 space-y-3" style={sub}>
                          <div className="flex items-center gap-2">
                            <Phone size={13} style={{ color: ic }} />
                            <a href={`tel:${customer.phone}`} className="text-sm" style={{ color: tb }}>{customer.phone}</a>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[{ label: "Aktuell", value: membership.currentStamps }, { label: "Gesamt", value: membership.totalStampsEver }, { label: "Belohnt", value: membership.rewardsRedeemed }].map(({ label, value }) => (
                              <div key={label} className="rounded-xl py-2.5" style={{ background: c.subCard.background }}>
                                <p className="text-base font-bold" style={{ color: tx }}>{value}</p>
                                <p className="text-[9px] mt-0.5 uppercase tracking-wide" style={{ color: tm }}>{label}</p>
                              </div>
                            ))}
                          </div>
                          {membership.lastStampAt && (
                            <p className="text-[11px]" style={{ color: tm }}>
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
          {customers && customers.length >= 20 && (
            <button onClick={() => setShowAllCustomers(v => !v)}
              className="w-full py-3 text-xs" style={{ color: tm, borderTop: `1px solid ${div}` }}>
              {showAllCustomers ? "Weniger anzeigen" : "Alle anzeigen"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EINLÖSUNGEN VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "einloesungen") {
    return (
      <div className={wrapperClass}>
        {theme && <theme.Background />}
        <SubHeader title="Treue Bonus" />

        <div className="rounded-2xl overflow-hidden" style={card}>
          {redemptions === undefined && <p className="px-5 py-8 text-center text-sm" style={{ color: tm }}>Laden…</p>}
          {redemptions?.length === 0 && <p className="px-5 py-8 text-center text-sm" style={{ color: tm }}>Noch keine Einlösungen</p>}
          {redemptions?.map((r) => {
            const isOpen = openRedemptionId === r._id;
            return (
              <div key={r._id} style={{ borderBottom: `1px solid ${div}` }}>
                <button onClick={() => setOpenRedemptionId(isOpen ? null : r._id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${ic}18`, border: `1px solid ${ic}44` }}>
                    <span className="text-sm font-bold" style={{ color: ic }}>{r.customerName.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: tx }}>{r.customerName}</p>
                    <p className="text-xs truncate" style={{ color: ic }}>{r.rewardText ?? shop.rewardText}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px]" style={{ color: tm }}>
                      {new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                    </span>
                    <ChevronRight size={13} style={{ color: tm }} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mx-4 mb-3 rounded-xl p-3 space-y-1.5" style={sub}>
                        {[
                          { label: "Belohnung", value: r.rewardText ?? shop.rewardText, accent: true },
                          { label: "Datum", value: new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }), accent: false },
                          { label: "Uhrzeit", value: new Date(r.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }), accent: false },
                        ].map(({ label, value, accent }) => (
                          <div key={label} className="flex justify-between items-center">
                            <span className="text-xs" style={{ color: tm }}>{label}</span>
                            <span className="text-xs font-semibold" style={{ color: accent ? ic : tb }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {redemptions && redemptions.length >= 20 && (
            <button onClick={() => setShowAllRedemptions(v => !v)}
              className="w-full py-3 text-xs" style={{ color: tm, borderTop: `1px solid ${div}` }}>
              {showAllRedemptions ? "Weniger anzeigen" : "Alle anzeigen"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════
  // SCAN VIEW (Inhaber-Kamera — navigiert zu /stamp/[token])
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "scan") {
    return (
      <div className={wrapperClass}>
        {theme && <theme.Background />}
        <SubHeader title="Kunden scannen" />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: div }}>
            <Scanner
              onScan={(codes: IDetectedBarcode[]) => {
                if (codes.length > 0) {
                  const raw = codes[0].rawValue;
                  const token = raw.includes("/stamp/") ? raw.split("/stamp/").pop()! : raw;
                  router.push(`/stamp/${token}`);
                }
              }}
              sound={false}
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-8 border-2 rounded-2xl" style={{ borderColor: `${ic}44` }} />
              <motion.div
                animate={{ y: ["0%", "100%", "0%"] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-8 right-8 top-8 h-0.5"
                style={{ background: `linear-gradient(to right, transparent, ${ic}, transparent)` }}
              />
            </div>
          </div>
          <p className="text-center text-sm flex items-center justify-center gap-2" style={{ color: tm }}>
            <ScanLine size={15} /> Kundencode in den Rahmen halten
          </p>
        </motion.div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WIEDERHERSTELLUNG VIEW
  // ══════════════════════════════════════════════════════════════════════════
  if (view === "wiederherstellung") {
    const recoveryUrl = recoveryResult ? `${typeof window !== "undefined" ? window.location.origin : ""}/me/${recoveryResult.qrToken}` : null;

    const handleShare = async () => {
      if (!recoveryUrl) return;
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
      if (nav.share) {
        try { await nav.share({ title: `${shop.name} – Stempelkarte`, url: recoveryUrl }); } catch {}
      } else {
        await navigator.clipboard.writeText(recoveryUrl);
        setRecoveryCopied(true);
        setTimeout(() => setRecoveryCopied(false), 2500);
      }
    };

    return (
      <div className={wrapperClass}>
        {theme && <theme.Background />}
        <SubHeader title="Konto suchen" />

        <div className="space-y-4">
          {/* Eingabe */}
          <div className="rounded-2xl p-5 space-y-4" style={card}>
            <p className="text-xs" style={{ color: tm }}>
              Handynummer des Kunden eingeben — es wird nur gesucht wenn eine Mitgliedschaft bei <span style={{ color: ic }}>{shop.name}</span> existiert.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: tm }} />
                <input
                  value={recoveryPhone}
                  onChange={e => { setRecoveryPhone(e.target.value); setSubmittedPhone(null); }}
                  placeholder="+49 …"
                  type="tel"
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={inp}
                  onKeyDown={e => e.key === "Enter" && recoveryPhone.trim() && setSubmittedPhone(recoveryPhone.trim())}
                />
              </div>
              <button
                onClick={() => recoveryPhone.trim() && setSubmittedPhone(recoveryPhone.trim())}
                disabled={!recoveryPhone.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
                style={{ background: btn, color: "#18181b" }}>
                <Search size={15} />
              </button>
            </div>
          </div>

          {/* Ergebnis */}
          <AnimatePresence>
            {submittedPhone && recoveryResult === undefined && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="rounded-2xl px-5 py-4 text-sm text-center" style={{ color: tm, ...card }}>
                Suche…
              </motion.div>
            )}

            {submittedPhone && recoveryResult === null && (
              <motion.div key="notfound" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl px-5 py-4 text-sm text-center" style={card}>
                <span style={{ color: tm }}>Kein Konto bei <span style={{ color: ic }}>{shop.name}</span> für diese Nummer gefunden.</span>
              </motion.div>
            )}

            {submittedPhone && recoveryResult && recoveryUrl && (
              <motion.div key="found" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl p-5 space-y-4" style={card}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                    style={{ background: `${ic}18`, color: ic }}>
                    {recoveryResult.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: tx }}>{recoveryResult.name}</p>
                    <p className="text-xs" style={{ color: tm }}>{recoveryResult.currentStamps} Stempel bei {shop.name}</p>
                  </div>
                </div>

                <div className="rounded-xl px-4 py-2.5 font-mono text-[11px] break-all" style={{ ...sub, color: tm }}>
                  {recoveryUrl}
                </div>

                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                  style={{ background: btn, color: "#18181b" }}>
                  {recoveryCopied
                    ? <><Check size={15} /> Kopiert!</>
                    : "share" in navigator
                      ? <><Share2 size={15} /> Link teilen</>
                      : <><Copy size={15} /> Link kopieren</>}
                </button>
                <p className="text-[11px] text-center" style={{ color: tm }}>
                  Kunde öffnet den Link — Konto ist wiederhergestellt.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QR VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className={wrapperClass}>
      {theme && <theme.Background />}
      <SubHeader title="QR-Code" />

      <div className="rounded-2xl p-6 space-y-5" style={card}>
        <div className="flex justify-center">
          <QRImage value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${shopSlug}`} size={200} />
        </div>
        <div className="text-center space-y-1">
          <p className="font-semibold text-sm" style={{ color: tx }}>Kunden-Registrierung</p>
          <p className="text-xs" style={{ color: tm }}>Ausdrucken & am Tresen aufhängen</p>
          <p className="text-[11px] font-mono mt-1" style={{ color: tm }}>/join/{shopSlug}</p>
        </div>
        <button
          onClick={() => printQR(shop.name, `${window.location.origin}/join/${shopSlug}`)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{ background: btn, color: "#18181b" }}>
          <Printer size={16} />
          Drucken / Druckvorschau
        </button>
      </div>
    </div>
  );
}
