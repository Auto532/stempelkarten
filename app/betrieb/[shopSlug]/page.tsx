"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, Users, Settings, ChevronRight, Award, Stamp, X, Check, QrCode, Phone, Eye } from "lucide-react";
import { QRImage } from "@/app/components/QRImage";

export default function BetriebDashboard() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });
  const customers = useQuery(api.shops.listCustomersForShop, shop ? { shopId: shop._id } : "skip");
  const updateSettings = useMutation(api.shops.updateSettings);

  const [authorized, setAuthorized] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [stampsRequired, setStampsRequired] = useState(0);
  const [rewardText, setRewardText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) { router.replace("/"); return; }
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (shop) { setStampsRequired(shop.stampsRequired); setRewardText(shop.rewardText); }
  }, [shop]);

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
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
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
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4"
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
      </motion.div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
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

      {/* Customer List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-zinc-800">
          <Users size={16} className="text-zinc-400" />
          <span className="font-medium text-zinc-200 text-sm">Kunden</span>
          {shop.showLeads && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 ml-1">
              <Eye size={10} /> Leads aktiv
            </span>
          )}
          <span className="text-xs text-zinc-600 ml-auto">{customers?.length ?? "–"}</span>
        </div>

        <div className="divide-y divide-zinc-800/50">
          {customers === undefined && (
            <div className="px-5 py-6 text-center text-zinc-600 text-sm">Laden...</div>
          )}
          {customers?.length === 0 && (
            <div className="px-5 py-6 text-center text-zinc-600 text-sm">Noch keine Kunden</div>
          )}
          {customers?.map(({ customer, membership }, i) => {
            if (!customer) return null;
            const pct = Math.min((membership.currentStamps / shop.stampsRequired) * 100, 100);
            const isSelected = selectedCustomerId === customer._id;
            return (
              <motion.div
                key={membership._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <button
                  onClick={() => shop.showLeads ? setSelectedCustomerId(isSelected ? null : customer._id) : undefined}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${shop.showLeads ? "hover:bg-zinc-800/50 cursor-pointer" : "cursor-default"}`}
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-amber-400 shrink-0">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-zinc-200 truncate">{customer.name}</span>
                      <span className="text-xs text-zinc-500 ml-2 shrink-0">{membership.currentStamps}/{shop.stampsRequired}</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.5 + i * 0.05, duration: 0.6 }}
                        className="h-full bg-amber-400/70 rounded-full"
                      />
                    </div>
                  </div>
                  {shop.showLeads && (
                    <ChevronRight size={14} className={`text-zinc-600 shrink-0 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                  )}
                </button>

                {/* Lead detail panel */}
                <AnimatePresence>
                  {shop.showLeads && isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-5 mb-3 bg-zinc-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-amber-400" />
                          <a href={`tel:${customer.phone}`} className="text-sm text-zinc-200 hover:text-amber-400 transition-colors">
                            {customer.phone}
                          </a>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {[
                            { label: "Aktuelle Stempel", value: membership.currentStamps },
                            { label: "Stempel gesamt", value: membership.totalStampsEver },
                            { label: "Belohnungen", value: membership.rewardsRedeemed },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-zinc-700/50 rounded-lg py-2">
                              <p className="text-sm font-bold text-zinc-100">{value}</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
                            </div>
                          ))}
                        </div>
                        {membership.lastStampAt && (
                          <p className="text-[11px] text-zinc-500">
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
