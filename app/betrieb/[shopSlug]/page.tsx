"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanLine, Users, Award, Stamp, X, Check, QrCode,
  Phone, Eye, Printer, Search, Gift, Plus, TrendingUp,
  Trophy, ChevronRight, ChevronDown,
} from "lucide-react";
import { QRImage } from "@/app/components/QRImage";
import { VintageBackground } from "@/app/me/themes/vintage";
import QRCode from "qrcode";

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

// ─── Section Card ──────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, action, children, defaultOpen = true, isVintage }: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isVintage: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const cardStyle = isVintage
    ? { background: "#130A04", border: "1px solid #7A5C1244" }
    : { background: "#18181b", border: "1px solid #27272a" };
  const divider = isVintage ? "#7A5C1222" : "#27272a";

  return (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-5 py-4 text-left"
      >
        <Icon size={15} style={{ color: isVintage ? "#C49A2A" : "#fbbf24" }} className="shrink-0" />
        <span className="font-semibold text-sm flex-1" style={{ color: isVintage ? "#E8D070" : "#e4e4e7" }}>{title}</span>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
        <ChevronDown size={15} style={{ color: isVintage ? "#7A5C12" : "#52525b" }}
          className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div style={{ borderTop: `1px solid ${divider}` }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Field Row ─────────────────────────────────────────────────────────────────
function FieldRow({ label, isVintage, children }: { label: string; isVintage: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 px-5" style={{ borderBottom: `1px solid ${isVintage ? "#7A5C1211" : "#27272a44"}` }}>
      <span className="text-xs w-36 shrink-0" style={{ color: isVintage ? "#7A5C12" : "#71717a" }}>{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── Inline Input ──────────────────────────────────────────────────────────────
function InlineInput({ value, onChange, type = "text", min, max, isVintage }: {
  value: string | number; onChange: (v: string) => void;
  type?: string; min?: number; max?: number; isVintage: boolean;
}) {
  return (
    <input
      type={type} value={value} min={min} max={max}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-1.5 rounded-xl text-sm focus:outline-none"
      style={isVintage
        ? { background: "#1C0E06", border: "1px solid #7A5C1244", color: "#C8A86A" }
        : { background: "#27272a", border: "1px solid #3f3f46", color: "#d4d4d8" }}
    />
  );
}

// ─── Save Bar ──────────────────────────────────────────────────────────────────
function SaveBar({ dirty, saving, saved, onSave, onReset, isVintage }: {
  dirty: boolean; saving: boolean; saved: boolean;
  onSave: () => void; onReset: () => void; isVintage: boolean;
}) {
  if (!dirty && !saved) return null;
  return (
    <div className="flex items-center gap-2 px-5 py-3" style={{ borderTop: `1px solid ${isVintage ? "#7A5C1222" : "#27272a"}` }}>
      {saved ? (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-green-400">
          <Check size={12} /> Gespeichert
        </motion.span>
      ) : (
        <>
          <button onClick={onSave} disabled={saving}
            className="flex-1 py-2 rounded-xl text-sm font-semibold transition-colors"
            style={{ background: isVintage ? "linear-gradient(135deg,#C49A2A,#7A5C12)" : "#fbbf24", color: "#18181b" }}>
            {saving ? "Speichert…" : "Speichern"}
          </button>
          <button onClick={onReset}
            className="py-2 px-3 rounded-xl text-sm transition-colors"
            style={{ background: isVintage ? "#1C0E06" : "#27272a", color: isVintage ? "#7A5C12" : "#71717a" }}>
            <X size={14} />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function BetriebDashboard() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });

  const [authorized, setAuthorized] = useState(false);
  const [adminToken, setAdminToken] = useState("");
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

  const updateSettings = useMutation(api.shops.updateSettings);
  const updateMilestones = useMutation(api.shops.updateMilestones);

  const customers = useQuery(
    api.shops.listCustomersForShop,
    shop && adminToken ? { shopId: shop._id, adminToken, limit: showAllCustomers ? undefined : 10 } : "skip"
  );
  const redemptions = useQuery(
    api.memberships.getRedemptionsForShop,
    shop?.bonusProgramEnabled && shop && adminToken ? { shopId: shop._id, adminToken, limit: showAllRedemptions ? undefined : 10 } : "skip"
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

  const isVintage = !!shop.customDesignEnabled && shop.theme === "vintage";

  const totalStamps = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
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
  const tiersDirty = JSON.stringify(tiers) !== JSON.stringify(shop.rewardTiers ?? [{ stamps: shop.stampsRequired, text: shop.rewardText, enabled: true }]);
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

  const iconColor = isVintage ? "#C49A2A" : "#fbbf24";
  const textMuted = isVintage ? "#7A5C12" : "#71717a";

  return (
    <div className={`min-h-screen px-5 pt-12 pb-16 max-w-sm mx-auto space-y-5 ${isVintage ? "relative z-[2]" : ""}`}>
      {isVintage && <VintageBackground />}

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: textMuted }}>Inhaber</p>
        <h1 className="text-2xl font-bold mt-0.5" style={{ color: isVintage ? "#E8D070" : "#f4f4f5" }}>{shop.name}</h1>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push(`/betrieb/${shopSlug}/scan`)}
          className="rounded-2xl p-4 flex flex-col items-start gap-3 transition-colors"
          style={{ background: isVintage ? "linear-gradient(135deg,#C49A2A,#7A5C12)" : "#fbbf24" }}
        >
          <ScanLine size={22} className="text-zinc-900" />
          <div>
            <p className="font-bold text-zinc-900 text-sm leading-tight">Kunden scannen</p>
            <p className="text-zinc-900/60 text-xs">Stempel vergeben</p>
          </div>
        </button>
        <button
          onClick={() => printQR(shop.name, `${window.location.origin}/join/${shopSlug}`)}
          className="rounded-2xl p-4 flex flex-col items-start gap-3 transition-colors"
          style={isVintage ? { background: "#130A04", border: "1px solid #7A5C1244" } : { background: "#18181b", border: "1px solid #27272a" }}
        >
          <Printer size={22} style={{ color: iconColor }} />
          <div>
            <p className="font-bold text-sm leading-tight" style={{ color: isVintage ? "#E8D070" : "#e4e4e7" }}>QR drucken</p>
            <p className="text-xs" style={{ color: textMuted }}>Für den Tresen</p>
          </div>
        </button>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="grid grid-cols-3 gap-3">
        {[
          { label: "Kunden", value: customers?.length ?? "–", icon: Users },
          { label: "Stempel", value: totalStamps, icon: Stamp },
          { label: "Belohnungen", value: totalRewards, icon: Award },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 text-center"
            style={isVintage ? { background: "#130A04", border: "1px solid #7A5C1244" } : { background: "#18181b", border: "1px solid #27272a" }}>
            <Icon size={17} className="mx-auto mb-1.5" style={{ color: iconColor }} />
            <p className="text-xl font-bold" style={{ color: isVintage ? "#E8D070" : "#f4f4f5" }}>{value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: textMuted }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Stempelkarte ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
        <Section title="Stempelkarte" icon={Stamp} isVintage={isVintage}>
          <FieldRow label="Stempel bis Belohnung" isVintage={isVintage}>
            <InlineInput type="number" min={1} max={50} value={stampsRequired}
              onChange={v => setStampsRequired(Number(v))} isVintage={isVintage} />
          </FieldRow>
          <FieldRow label="Belohnungstext" isVintage={isVintage}>
            <InlineInput value={rewardText} onChange={setRewardText} isVintage={isVintage} />
          </FieldRow>
          <SaveBar dirty={baseDirty} saving={baseSaving} saved={baseSaved}
            onSave={handleSaveBase}
            onReset={() => { setStampsRequired(shop.stampsRequired); setRewardText(shop.rewardText); }}
            isVintage={isVintage} />
        </Section>
      </motion.div>

      {/* ── Bonus-Stufen ── */}
      <AnimatePresence>
        {shop.bonusProgramEnabled && (
          <motion.div key="tiers" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Section title="Bonus-Stufen" icon={TrendingUp} isVintage={isVintage}>
              <div className="px-5 py-3 space-y-3">
                <p className="text-[11px]" style={{ color: textMuted }}>
                  Mehrere Belohnungsstufen — je mehr Stempel, desto wertvoller die Belohnung.
                </p>
                {tiers.map((tier, i) => (
                  <div key={i} className="rounded-xl p-3 space-y-2"
                    style={isVintage ? { background: "#1C0E06", border: "1px solid #7A5C1222" } : { background: "#27272a" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold" style={{ color: textMuted }}>Stufe {i + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTiers(p => p.map((t, idx) => idx === i ? { ...t, enabled: !t.enabled } : t))}
                          className="text-[10px] px-2 py-0.5 rounded-full border transition-colors"
                          style={tier.enabled
                            ? { background: `${iconColor}22`, border: `1px solid ${iconColor}55`, color: iconColor }
                            : { background: isVintage ? "#13070255" : "#3f3f4644", border: `1px solid ${textMuted}55`, color: textMuted }}>
                          {tier.enabled ? "Aktiv" : "Inaktiv"}
                        </button>
                        {tiers.length > 1 && (
                          <button onClick={() => setTiers(p => p.filter((_, idx) => idx !== i))}
                            className="transition-colors" style={{ color: textMuted }}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" min={1} max={100} value={tier.stamps}
                        onChange={e => setTiers(p => p.map((t, idx) => idx === i ? { ...t, stamps: Number(e.target.value) } : t))}
                        className="w-16 px-2 py-1.5 rounded-lg text-sm text-center focus:outline-none"
                        style={isVintage ? { background: "#13070288", border: "1px solid #7A5C1233", color: "#C8A86A" } : { background: "#3f3f46", border: "1px solid #52525b", color: "#d4d4d8" }} />
                      <input value={tier.text}
                        onChange={e => setTiers(p => p.map((t, idx) => idx === i ? { ...t, text: e.target.value } : t))}
                        placeholder="Belohnung…"
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none placeholder-zinc-600"
                        style={isVintage ? { background: "#13070288", border: "1px solid #7A5C1233", color: "#C8A86A" } : { background: "#3f3f46", border: "1px solid #52525b", color: "#d4d4d8" }} />
                    </div>
                    <p className="text-[10px]" style={{ color: textMuted }}>
                      Bei {tier.stamps} Stempeln: {tier.text || "…"}
                    </p>
                  </div>
                ))}
                <button
                  onClick={() => setTiers(p => [...p, { stamps: (p[p.length - 1]?.stamps ?? 10) + 5, text: "", enabled: true }])}
                  className="w-full py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  style={{ border: `1px dashed ${textMuted}55`, color: textMuted }}>
                  <Plus size={12} /> Stufe hinzufügen
                </button>
              </div>
              <SaveBar dirty={tiersDirty} saving={tierSaving} saved={tierSaved}
                onSave={handleSaveTiers}
                onReset={() => { setTiersInit(false); }}
                isVintage={isVintage} />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Meilensteine ── */}
      <AnimatePresence>
        {shop.milestonesEnabled && (
          <motion.div key="milestones" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Section title="Treue-Meilensteine" icon={Trophy} isVintage={isVintage}>
              <div className="px-5 py-3 space-y-3">
                <p className="text-[11px]" style={{ color: textMuted }}>
                  Belohnungen für Stammkunden — basieren auf Gesamtstempeln, nie zurückgesetzt.
                </p>
                {milestones.length === 0 && (
                  <p className="text-sm text-center py-2" style={{ color: textMuted }}>Noch keine Meilensteine</p>
                )}
                {milestones.map((m, i) => (
                  <div key={i} className="rounded-xl p-3 space-y-2"
                    style={isVintage ? { background: "#1C0E06", border: "1px solid #7A5C1222" } : { background: "#27272a" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold" style={{ color: textMuted }}>Meilenstein {i + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMilestones(p => p.map((t, idx) => idx === i ? { ...t, enabled: !t.enabled } : t))}
                          className="text-[10px] px-2 py-0.5 rounded-full border transition-colors"
                          style={m.enabled
                            ? { background: `${iconColor}22`, border: `1px solid ${iconColor}55`, color: iconColor }
                            : { background: isVintage ? "#13070255" : "#3f3f4644", border: `1px solid ${textMuted}55`, color: textMuted }}>
                          {m.enabled ? "Aktiv" : "Inaktiv"}
                        </button>
                        <button onClick={() => setMilestones(p => p.filter((_, idx) => idx !== i))}
                          style={{ color: textMuted }}><X size={14} /></button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input type="number" min={1} value={m.stamps}
                        onChange={e => setMilestones(p => p.map((t, idx) => idx === i ? { ...t, stamps: Number(e.target.value) } : t))}
                        className="w-16 px-2 py-1.5 rounded-lg text-sm text-center focus:outline-none"
                        style={isVintage ? { background: "#13070288", border: "1px solid #7A5C1233", color: "#C8A86A" } : { background: "#3f3f46", border: "1px solid #52525b", color: "#d4d4d8" }} />
                      <input value={m.text}
                        onChange={e => setMilestones(p => p.map((t, idx) => idx === i ? { ...t, text: e.target.value } : t))}
                        placeholder="z.B. Bronze Stammkunde…"
                        className="flex-1 px-3 py-1.5 rounded-lg text-sm focus:outline-none placeholder-zinc-600"
                        style={isVintage ? { background: "#13070288", border: "1px solid #7A5C1233", color: "#C8A86A" } : { background: "#3f3f46", border: "1px solid #52525b", color: "#d4d4d8" }} />
                    </div>
                    <p className="text-[10px]" style={{ color: textMuted }}>
                      Ab {m.stamps} Stempeln gesamt: {m.text || "…"}
                    </p>
                  </div>
                ))}
                <button
                  onClick={() => setMilestones(p => [...p, { stamps: (p[p.length - 1]?.stamps ?? 25) * 2, text: "", enabled: true }])}
                  className="w-full py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
                  style={{ border: `1px dashed ${textMuted}55`, color: textMuted }}>
                  <Plus size={12} /> Meilenstein hinzufügen
                </button>
              </div>
              <SaveBar dirty={milestonesDirty} saving={milestoneSaving} saved={milestoneSaved}
                onSave={handleSaveMilestones}
                onReset={() => { setMilestonesInit(false); }}
                isVintage={isVintage} />
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QR-Code ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Section title="Kunden-QR-Code" icon={QrCode} isVintage={isVintage} defaultOpen={false}>
          <div className="p-5 space-y-4">
            <div className="flex justify-center">
              <QRImage value={`${typeof window !== "undefined" ? window.location.origin : ""}/join/${shopSlug}`} size={160} />
            </div>
            <p className="text-center text-xs" style={{ color: textMuted }}>
              Ausdrucken & am Tresen aufhängen — Kunden scannen diesen Code
            </p>
            <button
              onClick={() => printQR(shop.name, `${window.location.origin}/join/${shopSlug}`)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-colors"
              style={isVintage ? { background: "#1C0E06", border: "1px solid #7A5C1244", color: "#C8A86A" } : { background: "#27272a", border: "1px solid #3f3f46", color: "#d4d4d8" }}>
              <Printer size={15} style={{ color: iconColor }} />
              Drucken / Druckvorschau
            </button>
          </div>
        </Section>
      </motion.div>

      {/* ── Einlösungen ── */}
      <AnimatePresence>
        {shop.bonusProgramEnabled && (
          <motion.div key="redemptions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Section title="Treue Bonus Einlösungen" icon={Gift} isVintage={isVintage} defaultOpen={false}>
              <div>
                {redemptions === undefined && <p className="px-5 py-6 text-center text-sm" style={{ color: textMuted }}>Laden…</p>}
                {redemptions?.length === 0 && <p className="px-5 py-6 text-center text-sm" style={{ color: textMuted }}>Noch keine Einlösungen</p>}
                {redemptions?.map((r) => {
                  const isOpen = openRedemptionId === r._id;
                  return (
                    <div key={r._id} style={{ borderBottom: `1px solid ${isVintage ? "#7A5C1222" : "#27272a"}` }}>
                      <button onClick={() => setOpenRedemptionId(isOpen ? null : r._id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={isVintage ? { background: "#C49A2A22", border: "1px solid #7A5C12" } : { background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.2)" }}>
                          <span className="text-xs font-bold" style={{ color: iconColor }}>{r.customerName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: isVintage ? "#E8D070" : "#e4e4e7" }}>{r.customerName}</p>
                          <p className="text-xs truncate" style={{ color: iconColor }}>{r.rewardText ?? shop.rewardText}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px]" style={{ color: textMuted }}>
                            {new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                          </span>
                          <ChevronRight size={13} style={{ color: textMuted }} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        </div>
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="mx-4 mb-3 rounded-xl p-3 space-y-1.5"
                              style={isVintage ? { background: "#1C0E0688" } : { background: "#27272a" }}>
                              {[
                                { label: "Belohnung", value: r.rewardText ?? shop.rewardText, accent: true },
                                { label: "Datum", value: new Date(r.timestamp).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }), accent: false },
                                { label: "Uhrzeit", value: new Date(r.timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }), accent: false },
                              ].map(({ label, value, accent }) => (
                                <div key={label} className="flex justify-between items-center">
                                  <span className="text-xs" style={{ color: textMuted }}>{label}</span>
                                  <span className="text-xs font-semibold" style={{ color: accent ? iconColor : (isVintage ? "#C8A86A" : "#d4d4d8") }}>{value}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                {redemptions && redemptions.length >= 10 && (
                  <button onClick={() => setShowAllRedemptions(v => !v)}
                    className="w-full py-3 text-xs transition-colors" style={{ color: textMuted }}>
                    {showAllRedemptions ? "Weniger anzeigen" : "Alle anzeigen"}
                  </button>
                )}
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Kundenliste ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Section
          title="Kunden"
          icon={Users}
          isVintage={isVintage}
          action={readyCount > 0 ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold mr-1"
              style={isVintage ? { background: "#C49A2A22", border: "1px solid #7A5C12", color: "#E8D070" } : { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
              <Gift size={9} className="inline mr-0.5" />{readyCount} bereit
            </span>
          ) : undefined}
        >
          <div className="px-5 pt-3 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: textMuted }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suchen…"
                className="w-full pl-8 pr-3 py-2 rounded-xl text-sm placeholder-zinc-600 focus:outline-none"
                style={isVintage ? { background: "#1C0E06", border: "1px solid #7A5C1244", color: "#C8A86A" } : { background: "#27272a", border: "1px solid #3f3f46", color: "#d4d4d8" }} />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: textMuted }}><X size={13} /></button>}
            </div>
          </div>

          <div className="flex items-center px-4 py-1.5" style={{ borderBottom: `1px solid ${isVintage ? "#7A5C1222" : "#27272a"}` }}>
            <div className="w-7 mr-3 shrink-0" />
            <span className="flex-1 text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>Kunde</span>
            <span className="text-[10px] uppercase tracking-wider w-12 text-right" style={{ color: textMuted }}>Stand</span>
            {shop.showLeads && <div className="w-4 ml-1" />}
          </div>

          <div>
            {customers === undefined && <p className="px-5 py-6 text-center text-sm" style={{ color: textMuted }}>Laden...</p>}
            {customers?.length === 0 && <p className="px-5 py-6 text-center text-sm" style={{ color: textMuted }}>Noch keine Kunden</p>}
            {customers !== undefined && filteredCustomers.length === 0 && search && (
              <p className="px-5 py-6 text-center text-sm" style={{ color: textMuted }}>Keine Treffer für „{search}"</p>
            )}
            {filteredCustomers.map(({ customer, membership }, i) => {
              if (!customer) return null;
              const isSelected = selectedCustomerId === customer._id;
              const isReady = membership.currentStamps >= lowestTierStamps;
              return (
                <motion.div key={membership._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  style={{ borderBottom: `1px solid ${isVintage ? "#7A5C1211" : "#27272a55"}` }}>
                  <button
                    onClick={() => shop.showLeads ? setSelectedCustomerId(isSelected ? null : customer._id) : undefined}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${shop.showLeads ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={isReady
                        ? { background: iconColor, color: "#18181b" }
                        : isVintage ? { background: "#1C0E06", border: "1px solid #7A5C1244", color: "#C49A2A" }
                        : { background: "#27272a", border: "1px solid #3f3f46", color: "#fbbf24" }}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm truncate" style={{ color: isVintage ? "#C8A86A" : "#d4d4d8" }}>{customer.name}</span>
                    {isReady && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0"
                        style={isVintage ? { background: "#C49A2A22", border: "1px solid #7A5C12", color: "#E8D070" } : { background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
                        BEREIT
                      </span>
                    )}
                    <span className="text-xs shrink-0 w-12 text-right" style={{ color: textMuted }}>
                      {membership.currentStamps}/{lowestTierStamps}
                    </span>
                    {shop.showLeads && (
                      <ChevronRight size={13} style={{ color: textMuted }} className={`shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    )}
                  </button>
                  <AnimatePresence>
                    {shop.showLeads && isSelected && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="mx-4 mb-3 rounded-xl p-4 space-y-3"
                          style={isVintage ? { background: "#1C0E0688" } : { background: "#27272a" }}>
                          <div className="flex items-center gap-2">
                            <Phone size={13} style={{ color: iconColor }} />
                            <a href={`tel:${customer.phone}`} className="text-sm transition-colors" style={{ color: isVintage ? "#C8A86A" : "#d4d4d8" }}>
                              {customer.phone}
                            </a>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {[
                              { label: "Aktuell", value: membership.currentStamps },
                              { label: "Gesamt", value: membership.totalStampsEver },
                              { label: "Belohnt", value: membership.rewardsRedeemed },
                            ].map(({ label, value }) => (
                              <div key={label} className="rounded-xl py-2.5"
                                style={isVintage ? { background: "#13070266" } : { background: "#3f3f46" }}>
                                <p className="text-base font-bold" style={{ color: isVintage ? "#E8D070" : "#f4f4f5" }}>{value}</p>
                                <p className="text-[9px] mt-0.5 uppercase tracking-wide" style={{ color: textMuted }}>{label}</p>
                              </div>
                            ))}
                          </div>
                          {membership.lastStampAt && (
                            <p className="text-[11px]" style={{ color: textMuted }}>
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
              className="w-full py-3 text-xs transition-colors" style={{ color: textMuted, borderTop: `1px solid ${isVintage ? "#7A5C1222" : "#27272a"}` }}>
              {showAllCustomers ? "Weniger anzeigen" : "Alle anzeigen"}
            </button>
          )}
        </Section>
      </motion.div>

      {/* Legal */}
      <div className="flex justify-center gap-3 pt-2">
        {shop.impressumText && (
          <a href={`/me/impressum/${shopSlug}`} className="text-[11px] transition-colors" style={{ color: textMuted }}>Impressum</a>
        )}
        {shop.impressumText && shop.datenschutzText && <span style={{ color: textMuted }}>·</span>}
        {shop.datenschutzText && (
          <a href={`/me/datenschutz/${shopSlug}`} className="text-[11px] transition-colors" style={{ color: textMuted }}>Datenschutz</a>
        )}
      </div>
    </div>
  );
}
