"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, BarChart2, Check, ChevronRight, Link, Shield, Sliders, Trash2, User } from "lucide-react";
import { useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { affiliateQuery, affiliateMutation } from "./lib/affiliate";


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

export function SettingsTab({ adminSecret }: { adminSecret: string }) {
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
