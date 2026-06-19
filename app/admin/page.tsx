"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Store, Users, Stamp, Award, ChevronRight, Link, X, Check, QrCode } from "lucide-react";
import { QRImage } from "@/app/components/QRImage";

const SUPERADMIN_PIN = "1337"; // In Produktion: Env-Variable

function ShopCard({ slug, index }: { slug: string; index: number }) {
  const shop = useQuery(api.shops.getBySlug, { slug });
  const customers = useQuery(api.shops.listCustomersForShop, shop ? { shopId: shop._id } : "skip");
  const [showLinks, setShowLinks] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!shop) return null;

  const totalStamps = customers?.reduce((s, c) => s + c.membership.totalStampsEver, 0) ?? 0;
  const totalRewards = customers?.reduce((s, c) => s + c.membership.rewardsRedeemed, 0) ?? 0;
  const base = typeof window !== "undefined" ? window.location.origin : "";

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
    >
      <button onClick={() => setShowLinks(!showLinks)} className="w-full px-5 py-4 flex items-center gap-3 text-left">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
          <Store size={18} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-zinc-100">{shop.name}</p>
          <p className="text-xs text-zinc-500">{shop.slug} · {shop.stampsRequired} Stempel</p>
        </div>
        <ChevronRight size={16} className={`text-zinc-600 transition-transform ${showLinks ? "rotate-90" : ""}`} />
      </button>

      {/* Stats row */}
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

      {/* Links panel */}
      <AnimatePresence>
        {showLinks && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-zinc-800"
          >
            <div className="p-4 space-y-4">
              {/* Join QR Code */}
              <div className="bg-zinc-800 rounded-xl p-4 text-center space-y-3">
                <div className="flex items-center gap-2 justify-center">
                  <QrCode size={14} className="text-amber-400" />
                  <p className="text-xs text-zinc-300 font-medium">Kunden-QR-Code (ausdrucken & aufhängen)</p>
                </div>
                <div className="flex justify-center">
                  <QRImage value={`${base}/join/${shop.slug}`} size={160} />
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] text-amber-300 flex-1 truncate">{`${base}/join/${shop.slug}`}</code>
                  <button onClick={() => copy(`${base}/join/${shop.slug}`, "join")}
                    className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                    {copied === "join" ? <Check size={14} className="text-green-400" /> : <Link size={14} />}
                  </button>
                </div>
              </div>

              {/* Admin Login */}
              {[
                { label: "Admin-Login (Betrieb)", url: `${base}/betrieb/login/${shop.adminLoginToken}`, key: "admin" },
              ].map(({ label, url, key }) => (
                <div key={key} className="bg-zinc-800 rounded-xl p-3">
                  <p className="text-[11px] text-zinc-500 mb-1.5">{label}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] text-amber-300 flex-1 truncate">{url}</code>
                    <button onClick={() => copy(url, key)}
                      className="shrink-0 text-zinc-500 hover:text-amber-400 transition-colors">
                      {copied === key ? <Check size={14} className="text-green-400" /> : <Link size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CreateShopForm({ onDone }: { onDone: () => void }) {
  const createShop = useMutation(api.shops.createShop);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [stampsRequired, setStampsRequired] = useState(10);
  const [rewardText, setRewardText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await createShop({ name, slug, stampsRequired, rewardText });
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler");
    } finally { setLoading(false); }
  };

  return (
    <motion.form onSubmit={handleCreate} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-zinc-100">Neuer Shop</h2>
        <button type="button" onClick={onDone} className="text-zinc-500 hover:text-zinc-300"><X size={18} /></button>
      </div>
      {[
        { label: "Shop-Name", value: name, onChange: setName, placeholder: "Friseur Müller", type: "text" },
        { label: "Slug", value: slug, onChange: (v: string) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "-")), placeholder: "friseur-mueller", type: "text" },
        { label: "Belohnungstext", value: rewardText, onChange: setRewardText, placeholder: "1x Haarschnitt gratis", type: "text" },
      ].map(({ label, value, onChange, placeholder, type }) => (
        <div key={label}>
          <label className="block text-xs text-zinc-500 mb-1.5">{label}</label>
          <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
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

export default function SuperAdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Quick shop list via a known query — we query a few shops by known slugs
  // In production this would be a "listAllShops" query
  const [slugs] = useState<string[]>([]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Store size={26} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold">Super Admin</h1>
            <p className="text-zinc-500 text-sm mt-1">Nur für interne Nutzung</p>
          </div>
          <input
            type="password" value={pin} onChange={(e) => setPin(e.target.value)}
            placeholder="PIN eingeben"
            onKeyDown={(e) => { if (e.key === "Enter" && pin === SUPERADMIN_PIN) setAuthed(true); }}
            className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 text-center tracking-widest text-xl"
          />
          <button onClick={() => { if (pin === SUPERADMIN_PIN) setAuthed(true); else setPin(""); }}
            className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-900 font-semibold rounded-2xl transition-colors">
            Einloggen
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-5 pt-12 pb-10 max-w-sm mx-auto space-y-5">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Super Admin</p>
          <h1 className="text-2xl font-bold text-zinc-100 mt-0.5">Übersicht</h1>
        </div>
        <button onClick={() => { setShowCreate(!showCreate); setRefreshKey(k => k + 1); }}
          className="w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-300 flex items-center justify-center transition-colors">
          <Plus size={20} className="text-zinc-900" />
        </button>
      </motion.div>

      <AnimatePresence>
        {showCreate && (
          <CreateShopForm onDone={() => { setShowCreate(false); setRefreshKey(k => k + 1); }} />
        )}
      </AnimatePresence>

      <SuperAdminShopList key={refreshKey} />
    </div>
  );
}

function SuperAdminShopList() {
  const allShops = useQuery(api.shops.listAllShops);

  if (allShops === undefined) {
    return <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-zinc-500 text-sm text-center py-10">Laden...</motion.div>;
  }

  if (allShops.length === 0) {
    return (
      <div className="text-center py-10 text-zinc-600 text-sm">
        Noch keine Shops. Klicke + um den ersten anzulegen.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allShops.map((shop, i) => (
        <ShopCard key={shop._id} slug={shop.slug} index={i} />
      ))}
    </div>
  );
}
