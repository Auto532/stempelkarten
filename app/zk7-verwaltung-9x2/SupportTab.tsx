"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { affiliateQuery, affiliateMutation } from "./lib/affiliate";

// ─── SupportTab (Tickets aus beiden Apps: Betrieb + Partner) ──────────────────

type TicketMsg = { from: "user" | "admin"; text: string; at: number };
type AdminTicket = {
  _id: string; number: number; source: "betrieb" | "partner"; name: string; sub?: string | null;
  senderRole?: string; contact?: string | null;
  status: "open" | "done"; createdAt: number; thread: TicketMsg[];
};

export function SupportTab({ adminSecret }: { adminSecret: string }) {
  const btTickets = useQuery(api.support.adminListTickets, { adminSecret });
  const answerBt  = useMutation(api.support.adminAnswerTicket);
  const [affTickets, setAffTickets] = useState<Record<string, unknown>[] | null>(null);
  const [filter, setFilter]     = useState<"open" | "done" | "all">("open");
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [busyId, setBusyId]     = useState<string | null>(null);
  // Geschlossene Tickets sind eingeklappt (nur "Ticket #001") — Klick öffnet
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadAff = async () => {
    try { setAffTickets((await affiliateQuery("support:adminListTickets", { adminSecret })) ?? []); }
    catch { setAffTickets([]); }
  };
  useEffect(() => { loadAff(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tickets: AdminTicket[] = [
    ...(btTickets ?? []).map(t => ({
      _id: t._id as string, number: t.number, source: "betrieb" as const, name: t.shopName,
      senderRole: t.senderRole === "inhaber" ? "Inhaber" : "Mitarbeiter",
      contact: t.contact ?? null, status: t.status,
      createdAt: t.createdAt, thread: t.thread as TicketMsg[],
    })),
    ...((affTickets ?? []) as any[]).map((t: any) => ({
      _id: t._id as string, number: (t.number as number) ?? 0, source: "partner" as const, name: t.partnerName as string,
      sub: (t.partnerEmail as string) ?? null,
      contact: (t.contact as string) ?? null, status: t.status as "open" | "done",
      createdAt: t.createdAt as number, thread: (t.thread ?? []) as TicketMsg[],
    })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const shown = tickets.filter(t => filter === "all" || t.status === filter);

  // Antworten hält das Ticket offen — geschlossen wird nur explizit.
  const act = async (t: AdminTicket, opts: { reply?: boolean; status?: "open" | "done" }) => {
    setBusyId(t._id);
    try {
      const reply = opts.reply ? (replyMap[t._id]?.trim() || undefined) : undefined;
      if (t.source === "betrieb") {
        await answerBt({ adminSecret, ticketId: t._id as Id<"supportTickets">, reply, status: opts.status });
      } else {
        await affiliateMutation("support:adminAnswerTicket", { adminSecret, ticketId: t._id, reply, status: opts.status });
        await loadAff();
      }
      if (opts.reply) setReplyMap(m => ({ ...m, [t._id]: "" }));
    } finally { setBusyId(null); }
  };

  return (
    <motion.div key="support" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Filter */}
      <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
        {([
          { id: "open", label: `Offen (${tickets.filter(t => t.status === "open").length})` },
          { id: "done", label: "Erledigt" },
          { id: "all",  label: "Alle" },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
            style={filter === f.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
            {f.label}
          </button>
        ))}
      </div>

      {btTickets === undefined || affTickets === null ? (
        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm text-center py-10">Laden...</motion.p>
      ) : shown.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-10">
          {filter === "open" ? "Keine offenen Anfragen, alles erledigt! 🎉" : "Keine Anfragen."}
        </p>
      ) : shown.map(t => {
        const isOpen = t.status === "open" || !!expanded[t._id];
        const num = `#${String(t.number).padStart(3, "0")}`;
        return (
        <div key={t._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <button type="button"
            onClick={() => { if (t.status === "done") setExpanded(e => ({ ...e, [t._id]: !e[t._id] })); }}
            className={`w-full px-4 py-3 flex items-center gap-2 flex-wrap text-left ${isOpen ? "border-b border-zinc-800" : ""} ${t.status === "done" ? "cursor-pointer hover:bg-zinc-800/40 transition-colors" : "cursor-default"}`}>
            <span className="text-[10px] font-bold font-mono text-zinc-500 shrink-0">Ticket {num}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
              style={t.source === "betrieb"
                ? { background: "rgba(96,165,250,.15)", color: "#60a5fa" }
                : { background: "rgba(167,139,250,.15)", color: "#a78bfa" }}>
              {t.source === "betrieb" ? "Betrieb" : "Partner"}
            </span>
            {isOpen && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-200 truncate">
                  {t.name}{t.senderRole ? <span className="text-zinc-500 font-normal"> · {t.senderRole}</span> : null}
                </p>
                {t.sub && <p className="text-[10px] text-zinc-600 truncate">{t.sub}</p>}
              </div>
            )}
            <div className="ml-auto text-right shrink-0 flex items-center gap-2">
              <div>
                <p className="text-[10px] text-zinc-600">
                  {new Date(t.createdAt).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${t.status === "open" ? "bg-yellow-400/15 text-yellow-400" : "bg-green-500/15 text-green-400"}`}>
                  {t.status === "open" ? "offen" : "erledigt"}
                </span>
              </div>
              {t.status === "done" && (
                <ChevronRight size={14} className={`text-zinc-600 transition-transform ${isOpen ? "rotate-90" : ""}`} />
              )}
            </div>
          </button>
          {isOpen && (
          <div className="p-4 space-y-3">
            {/* Verlauf als Chat */}
            <div className="space-y-2">
              {t.thread.map((m, i) => (
                <div key={i} className={`flex ${m.from === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 ${m.from === "admin"
                    ? "bg-amber-400/10 border border-amber-400/25"
                    : "bg-zinc-800 border border-zinc-700"}`}>
                    <p className={`text-[9px] font-semibold mb-0.5 ${m.from === "admin" ? "text-amber-400" : "text-zinc-500"}`}>
                      {m.from === "admin" ? "Du" : t.name} · {new Date(m.at).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-zinc-200 whitespace-pre-wrap">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
            {t.contact && <p className="text-xs text-zinc-500">📞 Kontakt: <span className="text-zinc-300">{t.contact}</span></p>}
            <textarea value={replyMap[t._id] ?? ""} onChange={e => setReplyMap(m => ({ ...m, [t._id]: e.target.value }))}
              rows={2} placeholder="Antwort schreiben…"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 resize-none" />
            <div className="flex gap-2">
              <button onClick={() => act(t, { reply: true })} disabled={busyId === t._id || !(replyMap[t._id] ?? "").trim()}
                className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 text-xs font-semibold disabled:opacity-40 transition-colors">
                Antwort senden
              </button>
              <button onClick={() => act(t, { status: t.status === "open" ? "done" : "open" })} disabled={busyId === t._id}
                className="px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-semibold hover:text-zinc-200 disabled:opacity-40 transition-colors">
                {t.status === "open" ? "Ticket schließen" : "Wieder öffnen"}
              </button>
            </div>
          </div>
          )}
        </div>
        );
      })}
    </motion.div>
  );
}
