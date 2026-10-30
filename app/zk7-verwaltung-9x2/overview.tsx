"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Bell, Check, ChevronRight, Clock, LifeBuoy, Plus, PowerOff, Search, Stamp, Store, Users, X, type LucideIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { PayBadge, usePayStatus, useLimit, ShowMore, type AdminTab } from "./shared";
import { ShopListItem, CreateShopForm } from "./shop";
import { PayLaterCard } from "./AnalyticsTab";

// ─── OverviewTab ──────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

export function OverviewTab({ adminSecret, supportOpenCount, onNavigate, onSelectShop }: {
  adminSecret: string;
  supportOpenCount: number;
  onNavigate: (tab: AdminTab, opts?: { createShop?: boolean }) => void;
  onSelectShop: (id: Id<"shops">) => void;
}) {
  const globalStats = useQuery(api.shops.getGlobalStats, adminSecret ? { adminSecret } : "skip");
  const payStatus = usePayStatus(adminSecret);
  const openPayments = Object.values(payStatus).filter(s => !s.paid);
  const recent = useLimit(5);

  if (!globalStats) {
    return (
      <div className="space-y-4">
        <div className="h-16 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />)}
        </div>
        <div className="h-40 rounded-2xl bg-zinc-900 border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  const inactiveShops = globalStats.shops.filter(s => s.active === false);
  const openSum = openPayments.reduce((s, p) => s + p.amountDue, 0);

  // Shops mit offener Zahlung zählen nicht in die Statistik, sie stehen
  // unter "Braucht Aufmerksamkeit".
  const kpis = [
    { icon: Store, label: "Shops aktiv",  value: globalStats.totalShops - openPayments.length },
    { icon: Users, label: "Kunden",       value: globalStats.totalCustomers },
    { icon: Stamp, label: "Stempel",      value: globalStats.totalStamps },
    { icon: Award, label: "Belohnungen",  value: globalStats.totalRewards },
  ];

  const attention = [
    supportOpenCount > 0 && { icon: LifeBuoy, label: `${supportOpenCount} Support-Anfrage${supportOpenCount > 1 ? "n" : ""} offen`, sub: "Antworten im Support-Tab", onClick: () => onNavigate("support") },
    openPayments.length > 0 && { icon: Clock, label: `${openPayments.length} Zahlung${openPayments.length > 1 ? "en" : ""} offen`, sub: `gesamt €${openSum}`, onClick: () => onNavigate("shops") },
    inactiveShops.length > 0 && { icon: PowerOff, label: `${inactiveShops.length} Shop${inactiveShops.length > 1 ? "s" : ""} deaktiviert`, sub: inactiveShops.slice(0, 2).map(s => s.name).join(", ") + (inactiveShops.length > 2 ? " …" : ""), onClick: () => onNavigate("shops") },
  ].filter(Boolean) as { icon: LucideIcon; label: string; sub: string; onClick: () => void }[];

  const newestShops = [...globalStats.shops].sort((a, b) => b._creationTime - a._creationTime);

  return (
    <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
      {/* Begrüßung */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500">{new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight">{greeting()}</h2>
        </div>
        <button onClick={() => onNavigate("shops", { createShop: true })}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-zinc-900 text-sm font-semibold hover:brightness-105 transition">
          <Plus size={15} /> Neuer Shop
        </button>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ icon: Icon, label, value }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className="text-amber-400" />
              <p className="text-xs text-zinc-500">{label}</p>
            </div>
            <p className="text-3xl font-semibold text-zinc-100 tabular tracking-tight">{value.toLocaleString("de-DE")}</p>
          </motion.div>
        ))}
      </div>

      {/* Braucht Aufmerksamkeit */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <Bell size={14} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-200">Braucht Aufmerksamkeit</span>
        </div>
        {attention.length === 0 ? (
          <div className="px-4 py-5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center"><Check size={16} className="text-amber-400" /></div>
            <p className="text-sm text-zinc-400">Alles erledigt. Keine offenen Anfragen oder Zahlungen.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {attention.map(a => (
              <button key={a.label} onClick={a.onClick} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0"><a.icon size={16} className="text-amber-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{a.label}</p>
                  <p className="text-[11px] text-zinc-500 truncate">{a.sub}</p>
                </div>
                <ChevronRight size={15} className="text-zinc-600 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Später-zahlen-Liste (mit Bezahllink und Erledigt-Button) */}
      <PayLaterCard adminSecret={adminSecret} />

      {/* Neueste Shops */}
      {newestShops.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
            <Store size={14} className="text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-200">Neueste Shops</span>
            <button onClick={() => onNavigate("shops")} className="ml-auto text-xs text-amber-400 hover:text-amber-300">Alle {newestShops.length} →</button>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {newestShops.slice(0, recent.limit).map(shop => (
              <button key={shop._id} onClick={() => onSelectShop(shop._id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left">
                <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-xs font-semibold text-zinc-300">
                  {shop.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 font-medium truncate flex items-center gap-2">{shop.name} <PayBadge status={payStatus[shop._id]} /></p>
                  <p className="text-[11px] text-zinc-500">{shop.customerCount} Kunden{shop.active === false ? " · deaktiviert" : ""}</p>
                </div>
                <ChevronRight size={14} className="text-zinc-600 shrink-0" />
              </button>
            ))}
          </div>
          <ShowMore shown={recent.limit} total={newestShops.length} onMore={recent.more} />
        </div>
      )}
    </motion.div>
  );
}

// ─── ShopsTab ─────────────────────────────────────────────────────────────────

export function ShopsTab({ shops, adminSecret, initialCreate = false, onSelectShop }: {
  shops: Doc<"shops">[] | undefined;
  adminSecret: string;
  initialCreate?: boolean;
  onSelectShop: (id: Id<"shops">) => void;
}) {
  const [showCreate, setShowCreate] = useState(initialCreate);
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
