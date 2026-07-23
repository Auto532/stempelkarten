"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronRight, Clock, FileText, TrendingUp, Trophy, LayoutGrid, X } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { errMsg } from "@/app/lib/errMsg";
import { affiliateQuery, affiliateMutation, AFFILIATE_APP_URL } from "./lib/affiliate";
import {
  GrowthCard, MiniBarChart, PeriodSelector, periodToSince, periodToPrevSince, groupPayments,
  GLOBAL_LEVELS, globalLevelIdx,
  type EarningsSummary, type PaymentRow, type Period,
} from "./shared";

// ─── PayLaterCard ─────────────────────────────────────────────────────────────
// Shops (Direktvertrieb), deren Inhaber auf der Zahlungsseite "Später zahlen"
// gewählt haben. Verschwinden automatisch nach Zahlungseingang; "Erledigt"
// entfernt die Vormerkung manuell.

export function PayLaterCard({ adminSecret }: { adminSecret: string }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => {
    affiliateQuery("admin:getPayLaterList", { adminSecret }).then(setRows).catch(() => {});
  };
  useEffect(() => { if (adminSecret) load(); }, [adminSecret]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rows || rows.length === 0) return null;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${AFFILIATE_APP_URL}/pay/${token}`);
      setCopied(token); setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const clear = async (contractId: string) => {
    setBusy(contractId);
    try { await affiliateMutation("admin:clearPayLater", { adminSecret, contractId }); load(); }
    catch (e: unknown) { alert(errMsg(e, "Fehler")); }
    finally { setBusy(null); }
  };

  return (
    <div className="bg-zinc-900 border border-amber-900/30 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
        <Clock size={13} className="text-amber-400" />
        <span className="text-sm font-medium text-zinc-200">Später zahlen</span>
        <span className="ml-auto text-[10px] text-amber-400 font-semibold">{rows.length}</span>
      </div>
      <div className="divide-y divide-zinc-800/50">
        {rows.map(r => (
          <div key={r.contractId} className="px-4 py-3 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-200 truncate">{r.shopName}</p>
                <p className="text-xs text-zinc-500">{r.ownerName}{r.ownerPhone ? ` · ${r.ownerPhone}` : ""}</p>
                {r.ownerEmail && <p className="text-xs text-zinc-600">{r.ownerEmail}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-amber-400">€{r.amount}</p>
                <p className="text-[10px] text-zinc-500">{r.planType === "annual" ? "Jahresabo" : "Monatsabo"}{r.rewardCount > 0 ? ` · ${r.rewardCount} Bonus` : ""}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[10px] text-zinc-600">
                Vorgemerkt: {new Date(r.payLaterAt).toLocaleDateString("de-DE")} {new Date(r.payLaterAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="flex gap-1.5">
                <button onClick={() => copyLink(r.paymentToken)}
                  className="text-[10px] px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors">
                  {copied === r.paymentToken ? "Kopiert ✓" : "Bezahllink"}
                </button>
                <button onClick={() => clear(r.contractId)} disabled={busy === r.contractId}
                  className="text-[10px] px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-green-400 transition-colors disabled:opacity-50">
                  {busy === r.contractId ? "..." : "Erledigt"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EarningsCard({ adminSecret }: { adminSecret: string }) {
  const [data, setData] = useState<null | EarningsSummary>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!adminSecret) return;
    // Einnahmen über die reguläre, secret-geschützte Query abrufen — mit dem
    // zur Laufzeit eingegebenen Admin-PIN. Kein Secret im Client-Bundle.
    affiliateQuery("admin:getEarningsSummary", { adminSecret })
      .then(setData).catch(() => {});
  }, [adminSecret]);

  if (!data) return null;

  return (
    <>
      <button type="button" onClick={() => setShowDetail(true)}
        className="w-full text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl overflow-hidden transition-colors">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <TrendingUp size={14} className="text-green-400" />
          <span className="text-sm font-semibold text-zinc-200">Finanzen</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-500">
            Details <ChevronRight size={12} />
          </span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Gesamtumsatz</p>
              <p className="text-2xl font-bold text-green-400">€{data.revenueTotal.toFixed(2)}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {(data.setupFeesTotal ?? 0) > 0
                  ? <>€{(data.aboRevenue ?? 0).toFixed(0)} Abo + €{(data.setupFeesTotal ?? 0).toFixed(0)} Einrichtung</>
                  : "alle eingegangenen Zahlungen"}
              </p>
            </div>
            <div className="bg-zinc-800/50 rounded-xl p-3">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Mein Anteil</p>
              <p className="text-2xl font-bold text-amber-400">€{data.netEarnings.toFixed(2)}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">nach Provisionen</p>
            </div>
          </div>

          {/* Verträge: nur wer gezahlt hat, zählt als wirklich aktiv */}
          {data.payingContracts !== undefined && (
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Verträge</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Zahlende Shops</span>
                <span className="text-sm font-semibold text-green-400">
                  {data.payingContracts}
                  <span className="text-[10px] text-zinc-600 font-normal">
                    {" "}({data.payingAnnual ?? 0}× Jahr, {data.payingMonthly ?? 0}× Monat)
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Warten auf Zahlung</span>
                <span className="text-sm font-semibold text-yellow-400">{data.awaitingPayment ?? 0}</span>
              </div>
              {(data.canceledContracts ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Gekündigt</span>
                  <span className="text-sm font-semibold text-zinc-400">{data.canceledContracts}</span>
                </div>
              )}
              {/* Laufender Abo-Umsatz getrennt nach Abo-Modell */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                <span className="text-xs text-zinc-400 font-semibold">Jährliche Zahlungen (Jahresabos)</span>
                <span className="text-sm font-bold text-green-400">€{(data.annualPlanRunRate ?? 0).toFixed(0)}/Jahr</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-semibold">Monatliche Zahlungen (Monatsabos)</span>
                <span className="text-sm font-bold text-green-400">€{(data.monthlyPlanRunRate ?? 0).toFixed(0)}/Monat</span>
              </div>
            </div>
          )}

          <div className="border-t border-zinc-800 pt-3 space-y-2">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Provisionen an Partner</p>
            {[
              { label: "Ausstehend",  value: data.commPending,   color: "text-yellow-400" },
              { label: "Bestätigt",   value: data.commConfirmed, color: "text-blue-400"   },
              { label: "Ausgezahlt",  value: data.commPaid,      color: "text-zinc-400"   },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">{r.label}</span>
                <span className={`text-sm font-semibold ${r.color}`}>€{r.value.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
              <span className="text-xs text-zinc-400 font-semibold">Gesamt Provisionen</span>
              <span className="text-sm font-bold text-red-400">– €{data.commTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {showDetail && (
          <FinanceDetailModal adminSecret={adminSecret} summary={data} onClose={() => setShowDetail(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Firmenprofil (Kopf des Finanzberichts, editierbar) ───────────────────────

function CompanyProfileEditor({ adminSecret, company }: {
  adminSecret: string; company: Doc<"companyProfile"> | null | undefined;
}) {
  const save = useMutation(api.company.setCompanyProfile);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    companyName: "", ownerName: "", street: "", zip: "", city: "", country: "",
    taxId: "", vatId: "", email: "", phone: "", website: "", smallBusiness: true,
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "err">("idle");
  const [err, setErr] = useState("");

  // Bestehendes Profil beim Laden in die Felder übernehmen
  useEffect(() => {
    if (company) {
      setF({
        companyName: company.companyName ?? "", ownerName: company.ownerName ?? "",
        street: company.street ?? "", zip: company.zip ?? "", city: company.city ?? "",
        country: company.country ?? "", taxId: company.taxId ?? "", vatId: company.vatId ?? "",
        email: company.email ?? "", phone: company.phone ?? "", website: company.website ?? "",
        smallBusiness: company.smallBusiness !== false,
      });
    }
  }, [company]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!f.companyName.trim()) { setErr("Firmenname ist Pflicht"); setStatus("err"); return; }
    setStatus("saving"); setErr("");
    try {
      const trim = (v: string) => v.trim() || undefined;
      await save({
        adminSecret,
        profile: {
          companyName: f.companyName.trim(),
          ownerName: trim(f.ownerName), street: trim(f.street), zip: trim(f.zip),
          city: trim(f.city), country: trim(f.country), taxId: trim(f.taxId),
          vatId: trim(f.vatId), email: trim(f.email), phone: trim(f.phone),
          website: trim(f.website), smallBusiness: f.smallBusiness,
        },
      });
      setStatus("saved"); setTimeout(() => setStatus("idle"), 2500);
    } catch (ex: unknown) { setErr(errMsg(ex, "Fehler beim Speichern")); setStatus("err"); }
  };

  const fields: { k: keyof typeof f; label: string; ph?: string; col?: string }[] = [
    { k: "companyName", label: "Firmenname / Name *", ph: "Mustermann Digital" },
    { k: "ownerName",   label: "Inhaber (falls abweichend)" },
    { k: "street",      label: "Straße & Hausnr." },
    { k: "zip",         label: "PLZ",  col: "w-24" },
    { k: "city",        label: "Ort" },
    { k: "country",     label: "Land" },
    { k: "taxId",       label: "Steuernummer", ph: "123/456/78901" },
    { k: "vatId",       label: "USt-IdNr. (falls vorhanden)", ph: "DE123456789" },
    { k: "email",       label: "E-Mail" },
    { k: "phone",       label: "Telefon" },
    { k: "website",     label: "Website" },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left">
        <Building2 size={14} className={company ? "text-amber-400" : "text-zinc-500"} />
        <span className="text-sm font-semibold text-zinc-200">Firmenprofil (PDF-Kopf)</span>
        {!company && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-400/15 text-red-400">fehlt</span>}
        <ChevronRight size={14} className={`ml-auto text-zinc-600 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-zinc-800 pt-3">
          <p className="text-[10px] text-zinc-500">
            Diese Angaben stehen im Kopf des Finanzberichts (für dich / das Finanzamt). Steuerlich relevant, bitte korrekt ausfüllen.
          </p>
          {fields.map(fd => (
            <div key={fd.k}>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider">{fd.label}</label>
              <input value={String(f[fd.k])} onChange={set(fd.k)} placeholder={fd.ph}
                className="w-full mt-0.5 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-sm text-zinc-100 placeholder-zinc-600 focus:border-amber-400/50 outline-none" />
            </div>
          ))}
          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input type="checkbox" checked={f.smallBusiness}
              onChange={e => setF(prev => ({ ...prev, smallBusiness: e.target.checked }))}
              className="accent-amber-400" />
            <span className="text-xs text-zinc-300">Kleinunternehmer §19 UStG (keine Umsatzsteuer ausweisen)</span>
          </label>
          {err && <p className="text-red-400 text-xs">{err}</p>}
          <button type="button" onClick={handleSave} disabled={status === "saving"}
            className="w-full mt-1 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 text-sm font-semibold rounded-xl transition-colors">
            {status === "saving" ? "Speichert…" : status === "saved" ? "Gespeichert ✓" : "Firmenprofil speichern"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Finanzen-Detailansicht (Monate / Jahre / Zahlungen + PDF-Export) ─────────

function FinanceDetailModal({ adminSecret, summary, onClose }: {
  adminSecret: string; summary: EarningsSummary; onClose: () => void;
}) {
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [err, setErr]           = useState("");
  const [view, setView]         = useState<"month" | "year" | "list">("month");
  const [exporting, setExporting] = useState(false);
  const company = useQuery(api.company.getCompanyProfile, { adminSecret });

  useEffect(() => {
    affiliateQuery("admin:getEarningsDetail", { adminSecret })
      .then(setPayments)
      .catch((e: unknown) => setErr(errMsg(e, "Fehler beim Laden")));
  }, [adminSecret]);

  const handlePdf = async () => {
    if (!payments) return;
    setExporting(true);
    try { await exportFinancePdf(summary, payments, company); }
    finally { setExporting(false); }
  };

  const groups = payments ? groupPayments(payments, view === "year" ? "year" : "month") : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-2 z-10">
          <TrendingUp size={16} className="text-green-400" />
          <h2 className="font-semibold text-zinc-100">Finanzen</h2>
          <button type="button" onClick={handlePdf} disabled={!payments || exporting}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 disabled:opacity-40 transition-colors">
            <FileText size={13} /> {exporting ? "Erstelle…" : "PDF"}
          </button>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-300 p-1"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Firmenprofil für den PDF-Kopf */}
          <CompanyProfileEditor adminSecret={adminSecret} company={company} />

          {/* Zusammenfassung */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Umsatz",      value: summary.revenueTotal, color: "text-green-400" },
              { label: "Provisionen", value: summary.commTotal,    color: "text-red-400"   },
              { label: "Mein Anteil", value: summary.netEarnings,  color: "text-amber-400" },
            ].map(s => (
              <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <p className={`text-base font-bold ${s.color}`}>€{s.value.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 -mt-2">
            {summary.payingContracts ?? summary.activeContracts} zahlende Shops
            {(summary.awaitingPayment ?? 0) > 0 && ` · ${summary.awaitingPayment} warten auf Zahlung`}
            {" "}· {payments ? `${payments.length} Zahlungen` : "…"}
            {(summary.setupFeesTotal ?? 0) > 0 && ` · davon €${(summary.setupFeesTotal ?? 0).toFixed(0)} Einrichtungsgebühren (einmalig)`}
          </p>

          {/* Ansicht wählen */}
          <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
            {([
              { id: "month", label: "Monatlich" },
              { id: "year",  label: "Jährlich"  },
              { id: "list",  label: "Zahlungen" },
            ] as const).map(t => (
              <button key={t.id} type="button" onClick={() => setView(t.id)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={view === t.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
                {t.label}
              </button>
            ))}
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}
          {!payments && !err && (
            <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="text-zinc-500 text-sm text-center py-8">Laden...</motion.p>
          )}
          {payments && payments.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-8">Noch keine Zahlungen.</p>
          )}

          {/* Monats-/Jahresübersicht */}
          {payments && payments.length > 0 && view !== "list" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
                <span>{view === "year" ? "Jahr" : "Monat"}</span>
                <span className="text-right w-14">Umsatz</span>
                <span className="text-right w-14">Prov.</span>
                <span className="text-right w-14">Netto</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {groups.map(g => (
                  <div key={g.label} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-4 py-2.5 items-center">
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{g.label}</p>
                      <p className="text-[10px] text-zinc-600">{g.count} Zahlung{g.count !== 1 ? "en" : ""}</p>
                    </div>
                    <span className="text-xs font-semibold text-green-400 text-right w-14">€{g.revenue.toFixed(0)}</span>
                    <span className="text-xs font-semibold text-red-400 text-right w-14">€{g.commission.toFixed(0)}</span>
                    <span className="text-xs font-bold text-amber-400 text-right w-14">€{(g.revenue - g.commission).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Einzelne Zahlungen */}
          {payments && payments.length > 0 && view === "list" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/50">
              {payments.map((p, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-200 truncate">{p.shopName}</p>
                    <p className="text-[10px] text-zinc-600">
                      {new Date(p.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      {" · "}{p.planType === "annual" ? "Jahresabo" : "Monatsabo"} · #{p.paymentNumber}
                      {p.direct && <span className="text-blue-400"> · Direkt</span>}
                      {p.discountCode && <span className="text-purple-400"> · {p.discountCode}</span>}
                    </p>
                    {(p.setupFeePaid ?? 0) > 0 && (
                      <p className="text-[10px] text-amber-400/80">
                        inkl. €{(p.setupFeePaid ?? 0).toFixed(2)} Einrichtung
                        {(p.setupFeeList ?? 0) === 45 ? " (45 € Bonus-Preis)" : ""}
                        {p.discountCode && (p.setupFeePaid ?? 0) < (p.setupFeeList ?? 0) ? ` (statt €${p.setupFeeList})` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-green-400">€{p.paidAmount.toFixed(2)}</p>
                    <p className="text-[10px] text-zinc-600">{p.commission > 0 ? `– €${p.commission.toFixed(2)} Prov.` : "keine Prov."}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Finanzbericht als PDF ────────────────────────────────────────────────────

async function exportFinancePdf(
  summary: EarningsSummary,
  payments: PaymentRow[],
  company: Doc<"companyProfile"> | null | undefined,
) {
  const [{ pdf }, { FinanceReport }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/app/components/financePdf"),
  ]);

  const months = groupPayments(payments, "month").map(g => ({
    label: g.label, count: g.count, revenue: g.revenue,
    commission: g.commission, net: g.revenue - g.commission,
  }));

  const rows = payments.map(p => ({
    date: new Date(p.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
    shopName: p.shopName,
    model: `${p.planType === "annual" ? "Jahresabo" : "Monatsabo"} #${p.paymentNumber}`
      + (p.discountCode ? ` · ${p.discountCode}` : "") + (p.direct ? " · Direkt" : ""),
    gross: p.paidAmount,
    commission: p.commission,
    net: p.paidAmount - p.commission,
  }));

  const data = {
    company: company ?? null,
    periodLabel: "Gesamter Zeitraum",
    dateStr: new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }),
    totals: {
      revenue:    summary.revenueTotal,
      commission: summary.commTotal,
      net:        summary.netEarnings,
      setupFees:  summary.setupFeesTotal ?? 0,
      aboRevenue: summary.aboRevenue ?? (summary.revenueTotal - (summary.setupFeesTotal ?? 0)),
      payingContracts: summary.payingContracts ?? summary.activeContracts,
      paymentCount:    payments.length,
      commPending:   summary.commPending,
      commConfirmed: summary.commConfirmed,
      commPaid:      summary.commPaid,
    },
    months,
    payments: rows,
  };

  const stamp = new Date().toISOString().slice(0, 10);
  const blob = await pdf(<FinanceReport data={data} />).toBlob();
  const file = new File([blob], `finanzbericht-${stamp}.pdf`, { type: "application/pdf" });
  const nav = navigator as Navigator & { share?: (d: object) => Promise<void> };
  if (typeof navigator !== "undefined" && nav.share) {
    try { await nav.share({ files: [file], title: "Finanzbericht" }); return; } catch { /* Download-Fallback */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function AnalyticsTab({ adminSecret }: { adminSecret: string }) {
  const [period, setPeriod] = useState<Period>("all");
  const data = useQuery(api.shops.getGlobalAnalyticsByPeriod, {
    adminSecret,
    since: periodToSince(period),
    prevSince: periodToPrevSince(period),
  });
  const appStats = useQuery(api.shops.getAppUsageStats, { adminSecret });

  return (
    <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Sektion 1: Finanzen (Zahlungen, Provisionen) */}
      <div className="flex items-center gap-2 pt-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Finanzen</p>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      <EarningsCard adminSecret={adminSecret} />

      {/* Sektion 2: Nutzung (Stempel-Aktivität, unabhängig von den Finanzen) */}
      <div className="flex items-center gap-2 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Nutzung & Aktivität</p>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>
      <p className="text-[11px] text-zinc-600 -mt-2">
        Stempel und Kunden im gewählten Zeitraum. Hat nichts mit den Finanzen oben zu tun.
      </p>

      <PeriodSelector value={period} onChange={setPeriod} />

      {data === undefined ? (
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm text-center py-10">Laden...</motion.div>
      ) : (
        <>
          {/* Gesamt-Stats mit Wachstum */}
          <div className="grid grid-cols-2 gap-3">
            <GrowthCard label="Stempel"      value={data.stamps}         prev={data.prevStamps}  color="text-amber-400"  period={period} />
            <GrowthCard label="Einlösungen"  value={data.redeems}        prev={data.prevRedeems} color="text-purple-400" period={period} />
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-3xl font-bold text-green-400">{data.activeShops}</p>
              <p className="text-xs text-zinc-500 mt-1">Shops mit Stempeln</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">im Zeitraum, nicht Vertragsstatus</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-1">
                <p className="text-3xl font-bold text-blue-400">{data.newCustomers}</p>
                {period !== "all" && (
                  <span className="text-[10px] text-zinc-600 mt-1.5">Neu</span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Neue Kunden</p>
            </div>
          </div>

          {/* Tages-Chart */}
          {data.dailyBreakdown.length > 1 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-xs font-semibold text-zinc-400 mb-3">Stempel pro Tag</p>
              <MiniBarChart data={data.dailyBreakdown} />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-zinc-600">
                  {new Date(data.dailyBreakdown[0].dayStart).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </span>
                <span className="text-[10px] text-zinc-600">
                  {new Date(data.dailyBreakdown[data.dailyBreakdown.length - 1].dayStart).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                </span>
              </div>
            </div>
          )}

          {/* Top Kunden */}
          {data.topCustomers.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-sm font-medium text-zinc-200">Top Kunden</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {data.topCustomers.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-[11px] font-bold w-4 shrink-0"
                      style={{ color: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#b45309" : "#52525b" }}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{c.name}</p>
                      <p className="text-[10px] text-zinc-600 truncate">{c.shopName}</p>
                    </div>
                    <p className="text-sm font-bold text-amber-400 shrink-0">{c.stamps}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pro-Shop-Ranking */}
          {data.shops.some(s => s.stamps > 0) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <TrendingUp size={14} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">Shops im Zeitraum</span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {data.shops.map((shop, i) => (
                  <div key={shop._id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[11px] font-bold text-zinc-600 w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 font-medium truncate">{shop.name}</p>
                      <p className="text-[11px] text-zinc-500">{shop.activeCustomers} Kunden · {shop.redeems}× eingelöst</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-400">{shop.stamps}</p>
                      <p className="text-[10px] text-zinc-600">Stempel</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!data.stamps && !data.redeems && (
            <p className="text-center text-zinc-600 text-sm py-4">Keine Aktivität im gewählten Zeitraum.</p>
          )}

          {/* App Details: Kunden mit 2+ Shops */}
          {appStats && appStats.filter(c => c.shopCount >= 2).length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
                <LayoutGrid size={14} className="text-amber-400" />
                <span className="text-sm font-medium text-zinc-200">App Details</span>
                <span className="ml-auto text-[10px] text-zinc-500">
                  {appStats.filter(c => c.shopCount >= 2).length} freigeschaltet
                </span>
              </div>
              <div className="divide-y divide-zinc-800/50">
                {appStats.filter(c => c.shopCount >= 2).map((c, i) => {
                  const lvlIdx = globalLevelIdx(c.shopCount);
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                        {c.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{c.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {c.shopCount} {c.shopCount === 1 ? "Laden" : "Läden"} · {c.totalStamps} Stempel
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: "#fbbf2420", color: "#fbbf24" }}>
                          LVL {lvlIdx + 1}
                        </span>
                        <p className="text-[9px] text-zinc-600 mt-0.5">{GLOBAL_LEVELS[lvlIdx].label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
