"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, ChevronRight, Clock, Plus, Search, Stamp, Store, Users, X } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PayBadge, usePayStatus } from "./shared";
import { ShopListItem, CreateShopForm } from "./shop";
import { PayLaterCard } from "./AnalyticsTab";

// ─── OverviewTab ──────────────────────────────────────────────────────────────

export function OverviewTab({ adminSecret, onSelectShop }: { adminSecret: string; onSelectShop: (id: Id<"shops">) => void }) {
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

export function ShopsTab({ shops, adminSecret, onSelectShop }: {
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
