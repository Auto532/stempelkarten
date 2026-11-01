"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Store, TrendingUp, Users, MessageSquare, Settings, LogOut, type LucideIcon } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { errMsg } from "@/app/lib/errMsg";
import { affiliateQuery } from "./lib/affiliate";
import { PartnerTab } from "./PartnerTab";
import { SupportTab } from "./SupportTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { SettingsTab } from "./SettingsTab";
import { ShopWorkspace } from "./shop";
import { OverviewTab, ShopsTab } from "./overview";
import type { AdminTab as Tab } from "./shared";

const TABS: { id: Tab; label: string; title: string; icon: LucideIcon }[] = [
  { id: "overview",  label: "Start",     title: "Übersicht",     icon: LayoutGrid    },
  { id: "shops",     label: "Shops",     title: "Shops",         icon: Store         },
  { id: "analytics", label: "Analytics", title: "Analytics",     icon: TrendingUp    },
  { id: "partner",   label: "Partner",   title: "Partner",       icon: Users         },
  { id: "support",   label: "Support",   title: "Support",       icon: MessageSquare },
  { id: "settings",  label: "System",    title: "Einstellungen", icon: Settings      },
];

export default function SuperAdminPage() {
  const checkPinMutation = useMutation(api.admin.checkPin);
  const [pin, setPin]               = useState("");
  const [adminSecret, setAdminSecret] = useState("");
  const [authed, setAuthed]         = useState(false);
  const [checking, setChecking]     = useState(false);
  const [pinError, setPinError]     = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<Tab>("overview");
  const [createShopOpen, setCreateShopOpen] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<Id<"shops"> | null>(null);

  const allShops = useQuery(api.shops.listAllShops, authed && adminSecret ? { adminSecret } : "skip") as Doc<"shops">[] | undefined;
  const selectedShop = selectedShopId ? allShops?.find(s => s._id === selectedShopId) : null;

  // Offene Support-Tickets (beide Apps) → Zähler am Support-Tab
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
      if (selectedShopIdRef.current) setSelectedShopId(null);
      window.history.pushState({ adminBack: true }, "");
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-Login aus sessionStorage (wird beim Schließen des Tabs gelöscht)
  useEffect(() => {
    const saved = sessionStorage.getItem("adminPin");
    if (saved) {
      setChecking(true);
      checkPinMutation({ pin: saved })
        .then((res) => {
          if (res.ok) { setAdminSecret(saved); setAuthed(true); }
          else sessionStorage.removeItem("adminPin");
        })
        .catch(() => { sessionStorage.removeItem("adminPin"); })
        .finally(() => setChecking(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = async () => {
    if (!pin) return;
    setChecking(true); setPinError(null);
    try {
      const res = await checkPinMutation({ pin });
      if (!res.ok) { setPinError(res.error); setPin(""); return; }
      sessionStorage.setItem("adminPin", pin);
      setAdminSecret(pin);
      setAuthed(true);
    } catch (err: unknown) {
      setPinError(errMsg(err, "Fehler"));
      setPin("");
    } finally { setChecking(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("adminPin");
    setAdminSecret(""); setAuthed(false); setPin(""); setSelectedShopId(null); setActiveTab("overview");
  };

  const goTo = (tab: Tab, opts?: { createShop?: boolean }) => {
    setActiveTab(tab);
    setCreateShopOpen(!!opts?.createShop);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!authed && checking) {
    return (
      <div className="adm min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="adm min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xs rounded-[28px] border border-zinc-800 bg-zinc-900 p-7 space-y-5">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-hell.png" alt="LoyaltyCard" className="mx-auto w-60 h-auto -my-8" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mt-1">Admin · intern</p>
          </div>
          <input type="password" inputMode="numeric" value={pin} onChange={e => { setPin(e.target.value); setPinError(null); }}
            placeholder="PIN" onKeyDown={e => { if (e.key === "Enter") handleLogin(); }} autoFocus
            className={`w-full px-4 py-3.5 bg-zinc-950/60 border rounded-2xl text-zinc-100 placeholder-zinc-600 focus:outline-none text-center tracking-[0.4em] text-xl transition-colors ${pinError ? "border-red-500/60" : "border-zinc-800 focus:border-amber-400/50"}`} />
          {pinError && <p className="text-red-400 text-sm text-center -mt-2">{pinError}</p>}
          <button onClick={handleLogin} disabled={checking || !pin}
            className="w-full py-3.5 bg-amber-400 hover:brightness-105 disabled:opacity-40 text-zinc-900 font-semibold rounded-2xl transition">
            {checking ? "Prüfe…" : "Einloggen"}
          </button>
        </motion.div>
      </div>
    );
  }

  // Shop-Arbeitsbereich ersetzt die Hauptansicht
  if (selectedShopId && selectedShop) {
    return (
      <div className="adm min-h-screen">
        <ShopWorkspace shop={selectedShop as Doc<"shops">} adminSecret={adminSecret} onBack={() => setSelectedShopId(null)} />
      </div>
    );
  }

  const current = TABS.find(t => t.id === activeTab)!;
  const badgeFor = (id: Tab) => (id === "support" ? supportOpenCount : 0);

  return (
    <div className="adm min-h-screen">
      {/* ── Seitenleiste (PC) ── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-zinc-800 bg-zinc-900 px-4 py-6 z-20">
        <div className="px-1 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-hell.png" alt="LoyaltyCard" className="w-40 h-auto -my-5 -ml-3" />
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 pl-1">Admin</p>
        </div>
        <nav className="space-y-1 flex-1">
          {TABS.map(({ id, title, icon: Icon }) => {
            const active = activeTab === id;
            const badge = badgeFor(id);
            return (
              <button key={id} onClick={() => goTo(id)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"}`}>
                {active && <motion.div layoutId="side-active" className="absolute inset-0 rounded-xl nav-active" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                <Icon size={17} className={`relative ${active ? "text-amber-400" : ""}`} />
                <span className="relative flex-1 text-left">{title}</span>
                {badge > 0 && (
                  <span className="relative text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">{badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-red-300 hover:bg-red-500/10 transition-colors">
          <LogOut size={17} /> Abmelden
        </button>
      </aside>

      <div className="lg:pl-64">
        {/* ── Kopfzeile ── */}
        <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/40 backdrop-blur-xl"
          style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="mx-auto max-w-4xl px-5 py-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark-hell.png" alt="" className="lg:hidden w-8 h-auto shrink-0" />
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600 lg:hidden">Admin</p>
                <h1 className="text-lg font-semibold text-zinc-100 tracking-tight leading-tight">{current.title}</h1>
              </motion.div>
            </AnimatePresence>
            <button onClick={handleLogout} aria-label="Abmelden"
              className="lg:hidden ml-auto w-9 h-9 rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-red-300 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* ── Inhalt ── */}
        <main className="mx-auto max-w-4xl px-5 pt-5 pb-32 lg:pb-12">
          <AnimatePresence mode="wait">
            {activeTab === "overview"  && <OverviewTab key="overview" adminSecret={adminSecret} supportOpenCount={supportOpenCount} onNavigate={goTo} onSelectShop={id => setSelectedShopId(id)} />}
            {activeTab === "shops"     && <ShopsTab key="shops" shops={allShops} adminSecret={adminSecret} initialCreate={createShopOpen} onSelectShop={id => setSelectedShopId(id)} />}
            {activeTab === "analytics" && <AnalyticsTab key="analytics" adminSecret={adminSecret} />}
            {activeTab === "settings"  && <SettingsTab key="settings" adminSecret={adminSecret} />}
            {activeTab === "partner"   && <PartnerTab key="partner" adminSecret={adminSecret} />}
            {activeTab === "support"   && <SupportTab key="support" adminSecret={adminSecret} />}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Schwebende Navigation (Handy) ── */}
      <nav className="lg:hidden fixed inset-x-3 z-20 rounded-[26px] border border-zinc-800 bg-zinc-900 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)]"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
        <div className="flex p-1.5">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            const badge = badgeFor(id);
            return (
              <button key={id} onClick={() => goTo(id)}
                className={`relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-[20px] transition-colors ${active ? "text-zinc-100" : "text-zinc-500"}`}>
                {active && <motion.div layoutId="dock-active" className="absolute inset-0 rounded-[20px] nav-active" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
                <span className="relative">
                  <Icon size={19} className={active ? "text-amber-400" : ""} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-zinc-900" />
                  )}
                </span>
                <span className="relative text-[9.5px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
