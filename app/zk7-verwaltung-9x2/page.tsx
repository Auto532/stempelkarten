"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Store, TrendingUp, Users, MessageSquare, Settings, Shield, type LucideIcon } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { errMsg } from "@/app/lib/errMsg";
import { affiliateQuery } from "./lib/affiliate";
import { PartnerTab } from "./PartnerTab";
import { SupportTab } from "./SupportTab";
import { AnalyticsTab } from "./AnalyticsTab";
import { SettingsTab } from "./SettingsTab";
import { ShopWorkspace } from "./shop";
import { OverviewTab, ShopsTab } from "./overview";

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
