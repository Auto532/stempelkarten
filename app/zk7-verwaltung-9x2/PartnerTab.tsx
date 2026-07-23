"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Users } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { errMsg } from "@/app/lib/errMsg";
import {
  affiliateQuery, affiliateMutation, AFFILIATE_URL, AFFILIATE_APP_URL,
  type AffiliateLead, type AffiliatePartner, type AffiliateDashboard,
} from "./lib/affiliate";

// ─── Partner Tab ─────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const EMPTY_PARTNER = {
  name: "", email: "", password: "", phone: "",
  company: "", dateOfBirth: "", taxId: "", vatId: "",
  address: "", zip: "", city: "", country: "Deutschland",
  bankIban: "", bankBic: "", bankName: "", notes: "",
};

function CreatePartnerForm({ adminSecret, onCreated }: { adminSecret: string; onCreated: () => void }) {
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState(EMPTY_PARTNER);
  const [saving, setSaving]   = useState(false);
  const [result, setResult]   = useState<{ referralCode: string; name: string } | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return;
    setSaving(true);
    try {
      const passwordHash = await sha256(form.password);
      const res = await affiliateMutation("admin:createAffiliate", {
        adminSecret,
        name:        form.name,
        email:       form.email,
        passwordHash,
        phone:       form.phone       || undefined,
        company:     form.company     || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        taxId:       form.taxId       || undefined,
        vatId:       form.vatId       || undefined,
        address:     form.address     || undefined,
        zip:         form.zip         || undefined,
        city:        form.city        || undefined,
        country:     form.country     || undefined,
        bankIban:    form.bankIban    || undefined,
        bankBic:     form.bankBic     || undefined,
        bankName:    form.bankName    || undefined,
        notes:       form.notes       || undefined,
      });
      setResult({ referralCode: (res as any).referralCode, name: form.name });
      setForm(EMPTY_PARTNER);
      onCreated();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setSaving(false); }
  };

  if (result) return (
    <div className="bg-zinc-900 border border-green-900/40 rounded-2xl p-4 space-y-2">
      <p className="text-sm font-semibold text-green-400">✓ Partner angelegt</p>
      <p className="text-xs text-zinc-400">{result.name} · Code: <span className="font-mono text-amber-400">{result.referralCode}</span></p>
      <p className="text-xs text-zinc-500">Login über die Partner-App mit der gesetzten E-Mail + Passwort.</p>
      <button onClick={() => { setResult(null); setOpen(false); }}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Schließen</button>
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors">
        <span className="text-sm font-medium text-zinc-200">+ Partner erstellen</span>
        <span className="ml-auto text-zinc-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-4">

          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Zugangsdaten</p>
          <div className="space-y-2">
            {[
              { k: "name",  label: "Vollständiger Name *", type: "text"  },
              { k: "email", label: "E-Mail (Login) *",     type: "email" },
              { k: "phone", label: "Telefon",              type: "tel"   },
            ].map(({ k, label, type }) => (
              <div key={k}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[k]} onChange={set(k)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
            ))}
            <div>
              <label className="block text-[10px] text-zinc-500 mb-1">Initial-Passwort *</label>
              <input type="text" value={form.password} onChange={set("password")}
                placeholder="Sichtbar, wird dem Partner mitgeteilt"
                className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40 font-mono" />
              <p className="text-[10px] text-zinc-600 mt-1">Partner kann es nach dem Login ändern</p>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold pt-1">Rechtliches</p>
          <div className="space-y-2">
            {[
              { k: "company",     label: "Firmenname (falls Gewerbe)",   type: "text" },
              { k: "dateOfBirth", label: "Geburtsdatum (TT.MM.JJJJ)",   type: "text", placeholder: "15.03.1990" },
              { k: "taxId",       label: "Steuernummer",                 type: "text", placeholder: "123/456/78901" },
              { k: "vatId",       label: "USt-IdNr. (falls vorhanden)",  type: "text", placeholder: "DE123456789" },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[k]} onChange={set(k)} placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
            ))}
          </div>

          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold pt-1">Adresse</p>
          <div className="space-y-2">
            {[
              { k: "address", label: "Straße + Hausnummer", type: "text" },
              { k: "zip",     label: "PLZ",                 type: "text" },
              { k: "city",    label: "Stadt",               type: "text" },
              { k: "country", label: "Land",                type: "text" },
            ].map(({ k, label, type }) => (
              <div key={k}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[k]} onChange={set(k)}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
            ))}
          </div>

          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold pt-1">Bankverbindung</p>
          <div className="space-y-2">
            {[
              { k: "bankIban", label: "IBAN",         type: "text", placeholder: "DE89 3704 0044 ..." },
              { k: "bankBic",  label: "BIC / SWIFT",  type: "text", placeholder: "COBADEFFXXX" },
              { k: "bankName", label: "Bankname",      type: "text" },
            ].map(({ k, label, type, placeholder }) => (
              <div key={k}>
                <label className="block text-[10px] text-zinc-500 mb-1">{label}</label>
                <input type={type} value={(form as any)[k]} onChange={set(k)} placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-[10px] text-zinc-500 mb-1">Interne Notiz</label>
            <textarea value={form.notes} onChange={set("notes")} rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/40 resize-none" />
          </div>

          <button onClick={handleCreate} disabled={saving || !form.name || !form.email || !form.password}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 transition-colors">
            {saving ? "Erstelle..." : "Partner anlegen & Konto erstellen"}
          </button>
        </div>
      )}
    </div>
  );
}

function InvitePartnerButton({ adminSecret }: { adminSecret: string }) {
  const [link, setLink]       = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await affiliateMutation("admin:generateAffiliateInvite", { adminSecret });
      const token = (res as any).token;
      setLink(`${AFFILIATE_APP_URL}/invite/partner/${token}`);
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setLoading(false); }
  };

  const handleCopy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-200">Partner einladen</p>
          <p className="text-xs text-zinc-500">Link ist 7 Tage gültig</p>
        </div>
        <button onClick={handleGenerate} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 transition-colors"
          style={{ background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24" }}>
          {loading ? "..." : "Link generieren"}
        </button>
      </div>

      {link && (
        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: "#18181b", border: "1px solid #27272a" }}>
          <p className="flex-1 text-[10px] text-zinc-400 truncate font-mono">{link}</p>
          <button onClick={handleCopy}
            className="text-[10px] font-semibold flex-shrink-0 transition-colors"
            style={{ color: copied ? "#4ade80" : "#fbbf24" }}>
            {copied ? "✓ Kopiert" : "Kopieren"}
          </button>
        </div>
      )}
    </div>
  );
}

function nextCommissionPreview(planType: "annual" | "monthly", paymentNumber: number, firstYearDiscount?: number | null) {
  const phase =
    planType === "annual"
      ? paymentNumber === 1 ? "Jahr 1" : "Ab Jahr 2"
      : paymentNumber <= 12 ? "Jahr 1" : "Ab Jahr 2";
  // Modell seit 2026-07-20: Jahr 1 = 35%, ab Jahr 2 dauerhaft 15% (lifetime)
  const rates: Record<string, number> = { "Jahr 1": 0.35, "Ab Jahr 2": 0.15 };
  // Provision nur auf den GEZAHLTEN Abo-Anteil: Rabattcodes gibt es nur für das
  // Jahresabo und dort nur auf Zahlung #1
  const inPromo = !!firstYearDiscount && planType === "annual" && paymentNumber === 1;
  const base = (planType === "annual" ? 240 : 20) * (inPromo ? 1 - firstYearDiscount! : 1);
  const rate   = rates[phase];
  const amount = Math.round(base * rate * 100) / 100;
  return { phase, rate, amount };
}

const PARTNER_FIELD_LABELS: Record<string, string> = {
  name: "Name", company: "Firma", taxId: "Steuernr.", vatId: "USt-IdNr.",
  dateOfBirth: "Geburtsdatum", bankIban: "IBAN", bankBic: "BIC", bankName: "Bank",
  phone: "Telefon", address: "Adresse", zip: "PLZ", city: "Stadt", country: "Land",
  businessType: "Kontotyp",
};

function fmtPartnerVal(key: string, val: unknown): string {
  if (key === "businessType") {
    return val === "business" ? "Gewerbe" : val === "private" ? "Privat" : "—";
  }
  return val === undefined || val === null || val === "" ? "—" : String(val);
}

function PModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{title}</p>
      {children}
    </div>
  );
}

function PModalRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-zinc-500 flex-shrink-0">{label}</span>
      <span className={`text-zinc-300 text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

// Provisionsabrechnung (Gutschrift) als PDF im hellen Look erzeugen.
async function exportCommissionStatementPdf(
  adminSecret: string,
  affiliateId: string,
  company: Doc<"companyProfile"> | null | undefined,
) {
  const stmt = await affiliateQuery("admin:getPartnerCommissionStatement", { adminSecret, affiliateId }) as {
    partner: Record<string, unknown> & { referralCode: string };
    rows: { date: number; shopName: string; planType: "annual" | "monthly"; paymentNumber: number; baseAmount: number; rate: number; amount: number; status: string }[];
    totals: { count: number; pending: number; confirmed: number; paid: number; canceled: number; payableTotal: number };
  } | null;
  if (!stmt) throw new Error("Keine Daten für diesen Partner");

  const [{ pdf }, { CommissionStatement }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/app/components/commissionStatementPdf"),
  ]);

  const statusLabel = (s: string) =>
    s === "paid" ? "ausgezahlt" : s === "confirmed" ? "bestätigt" : s === "pending" ? "offen" : s;
  const rows = stmt.rows
    .filter(r => r.status !== "canceled")
    .map(r => ({
      date: new Date(r.date).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }),
      shopName: r.shopName,
      model: `${r.planType === "annual" ? "Jahresabo" : "Monatsabo"} #${r.paymentNumber}`,
      baseAmount: r.baseAmount, rate: r.rate, amount: r.amount, statusLabel: statusLabel(r.status),
    }));

  const now = new Date();
  const data = {
    company: company ?? null,
    partner: stmt.partner as never,
    statementNo: `PA-${now.getFullYear()}-${stmt.partner.referralCode}`,
    dateStr: now.toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" }),
    periodLabel: "Gesamter Zeitraum",
    rows,
    totals: stmt.totals,
  };

  const blob = await pdf(<CommissionStatement data={data} />).toBlob();
  const file = new File([blob], `provisionsabrechnung-${stmt.partner.referralCode}.pdf`, { type: "application/pdf" });
  const nav = navigator as Navigator & { share?: (d: object) => Promise<void> };
  if (typeof navigator !== "undefined" && nav.share) {
    try { await nav.share({ files: [file], title: "Provisionsabrechnung" }); return; } catch { /* Download-Fallback */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = file.name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function PartnerDetailModal({ adminSecret, affiliateId, onClose, onChanged }: {
  adminSecret: string; affiliateId: string; onClose: () => void; onChanged: () => void;
}) {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const [err, setErr]         = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const company = useQuery(api.company.getCompanyProfile, { adminSecret });

  const handleStatement = async () => {
    setPdfBusy(true); setErr("");
    try { await exportCommissionStatementPdf(adminSecret, affiliateId, company); }
    catch (e: any) { setErr(e?.message ?? "Fehler beim Erstellen"); }
    finally { setPdfBusy(false); }
  };

  const load = async () => {
    setLoading(true); setErr("");
    try { setData(await affiliateQuery("admin:getAffiliateDetail", { adminSecret, affiliateId })); }
    catch (e: any) { setErr(e?.message ?? "Fehler"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [affiliateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (approve: boolean) => {
    setBusy(true); setErr("");
    try {
      await affiliateMutation(approve ? "admin:approveProfileChange" : "admin:rejectProfileChange", { adminSecret, affiliateId });
      await load(); onChanged();
    } catch (e: any) { setErr(e?.message ?? "Fehler"); }
    finally { setBusy(false); }
  };

  const toggleDiscount = async (eligible: boolean) => {
    setBusy(true); setErr("");
    try {
      await affiliateMutation("admin:setDiscountEligible", { adminSecret, affiliateId, eligible });
      await load(); onChanged();
    } catch (e: any) { setErr(e?.message ?? "Fehler"); }
    finally { setBusy(false); }
  };

  const a = data?.affiliate;
  const pending = data?.pendingProfile as Record<string, any> | null | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between z-10">
          <p className="text-sm font-semibold text-zinc-100">Partner-Details</p>
          <div className="flex items-center gap-2">
            {a && (data?.commissions?.count ?? 0) > 0 && (
              <button onClick={handleStatement} disabled={pdfBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold hover:bg-amber-400/20 disabled:opacity-40 transition-colors">
                <FileText size={13} /> {pdfBusy ? "Erstelle…" : "Abrechnung"}
              </button>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 text-lg leading-none">✕</button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-zinc-500 text-sm py-12 animate-pulse">Laden...</p>
        ) : !a ? (
          <p className="text-center text-zinc-500 text-sm py-12">{err || "Nicht gefunden"}</p>
        ) : (
          <div className="p-4 space-y-4">
            <div>
              <p className="text-lg font-bold text-zinc-100">{a.name}</p>
              <p className="text-xs text-zinc-500">{a.email} · <span className="font-mono text-amber-400">{a.referralCode}</span></p>
            </div>

            {/* Neue Partner-Anfrage: nach Prüfung der Angaben direkt hier freigeben */}
            {a.status === "pending" && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.3)" }}>
                <p className="text-xs font-semibold text-yellow-400">Anfrage wartet auf Freigabe</p>
                <p className="text-[10px] text-zinc-400">Prüfe unten Stammdaten und Bankverbindung, dann freigeben.</p>
                <button
                  onClick={async () => {
                    setBusy(true); setErr("");
                    try { await affiliateMutation("admin:approveAffiliate", { adminSecret, affiliateId }); await load(); onChanged(); }
                    catch (e: any) { setErr(e?.message ?? "Fehler"); }
                    finally { setBusy(false); }
                  }}
                  disabled={busy}
                  className="w-full text-xs py-2 rounded-lg bg-green-900/30 border border-green-800/50 text-green-400 font-semibold disabled:opacity-50">
                  Partner freigeben
                </button>
              </div>
            )}

            {pending && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.3)" }}>
                <p className="text-xs font-semibold text-yellow-400">Änderungen warten auf Freigabe</p>
                {pending.businessType === "business" && a.businessType !== "business" && (
                  <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(249,115,22,.12)", border: "1px solid rgba(249,115,22,.4)" }}>
                    <p className="text-[11px] font-bold text-orange-400">⚠ Wechsel Privat → Gewerbe</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Firmenname und USt-IdNr./Steuernr. prüfen, steuerlich relevant (Provisions-Abrechnung).</p>
                  </div>
                )}
                {pending.businessType === "private" && a.businessType === "business" && (
                  <div className="rounded-lg px-2.5 py-2" style={{ background: "rgba(249,115,22,.12)", border: "1px solid rgba(249,115,22,.4)" }}>
                    <p className="text-[11px] font-bold text-orange-400">⚠ Wechsel Gewerbe → Privat</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Prüfen, ob das plausibel ist, steuerlich relevant (Provisions-Abrechnung).</p>
                  </div>
                )}
                <div className="space-y-1">
                  {Object.keys(pending).filter(k => k !== "submittedAt").map(k => (
                    <div key={k} className="text-[11px] flex flex-wrap items-center gap-1">
                      <span className="text-zinc-500">{PARTNER_FIELD_LABELS[k] ?? k}:</span>
                      <span className="text-zinc-500 line-through">{fmtPartnerVal(k, a[k])}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-green-400 font-medium">{fmtPartnerVal(k, pending[k])}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => decide(true)} disabled={busy}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-green-900/30 border border-green-800/50 text-green-400 disabled:opacity-50">Freigeben</button>
                  <button onClick={() => decide(false)} disabled={busy}
                    className="flex-1 text-xs py-1.5 rounded-lg bg-red-900/20 border border-red-900/40 text-red-400 disabled:opacity-50">Ablehnen</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Shops aktiv",       value: String(data.stats.leadsActive) },
                { label: "In Prüfung",        value: String(data.stats.leadsInReview) },
                { label: "Prov. ausstehend",  value: `€${data.commissions.pending.toFixed(2)}` },
                { label: "Prov. ausgezahlt",  value: `€${data.commissions.paid.toFixed(2)}` },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <p className="text-lg font-bold text-zinc-100">{s.value}</p>
                  <p className="text-[10px] text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Rabatt-Berechtigung (muss vor Nutzung eines Rabattcodes aktiviert sein) */}
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-3">
              <div className="min-w-0 pr-3">
                <p className="text-xs font-semibold text-zinc-200">Rabatt berechtigt</p>
                <p className="text-[10px] text-zinc-500">Erlaubt Rabattcodes (z.B. LOYAL50 · 50% aufs 1. Jahr) für die Shops dieses Partners</p>
              </div>
              <button onClick={() => toggleDiscount(!a.discountEligible)} disabled={busy}
                className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors disabled:opacity-50 ${a.discountEligible ? "bg-green-600" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${a.discountEligible ? "translate-x-5" : ""}`} />
              </button>
            </div>

            <PModalSection title="Stammdaten">
              <PModalRow label="Telefon" value={a.phone} />
              <PModalRow label="Firma" value={a.company} />
              <PModalRow label="Adresse" value={[a.address, [a.zip, a.city].filter(Boolean).join(" "), a.country].filter(Boolean).join(", ") || undefined} />
              <PModalRow label="Geburtsdatum" value={a.dateOfBirth} />
              <PModalRow label="Steuernr." value={a.taxId} />
              <PModalRow label="USt-IdNr." value={a.vatId} />
              <PModalRow label="Typ" value={a.businessType === "business" ? "Gewerbe" : a.businessType === "private" ? "Privat" : undefined} />
            </PModalSection>

            <PModalSection title="Bankverbindung">
              <PModalRow label="IBAN" value={a.bankIban} mono />
              <PModalRow label="BIC" value={a.bankBic} mono />
              <PModalRow label="Bank" value={a.bankName} />
            </PModalSection>

            <PModalSection title={`Shops (${data.leads.length})`}>
              {data.leads.length === 0 && <p className="text-xs text-zinc-600">Noch keine.</p>}
              {data.leads.map((l: any) => (
                <div key={l._id} className="flex items-center justify-between gap-2 text-xs py-0.5">
                  <span className="text-zinc-300 truncate">{l.shopName || "—"} <span className="text-zinc-600">· {l.ownerName}</span></span>
                  <span className="text-zinc-500 flex-shrink-0">{l.status}</span>
                </div>
              ))}
            </PModalSection>

            {err && <p className="text-red-400 text-xs text-center">{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function PartnerTab({ adminSecret }: { adminSecret: string }) {
  const [dashboard, setDashboard]     = useState<AffiliateDashboard | null>(null);
  const [leads, setLeads]             = useState<AffiliateLead[] | null>(null);
  const [partners, setPartners]       = useState<AffiliatePartner[] | null>(null);
  const [activeLeads, setActiveLeads] = useState<any[]>([]);
  const [contractMap, setContractMap] = useState<Record<string, any>>({});
  const [commissionsMap, setCommissionsMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [approving, setApproving]     = useState<string | null>(null);
  const [rejecting, setRejecting]     = useState<string | null>(null);
  const [recording, setRecording]     = useState<string | null>(null);
  const [confirming, setConfirming]   = useState<string | null>(null);
  const [planMap, setPlanMap]         = useState<Record<string, "annual" | "monthly">>({});
  const [reasonMap, setReasonMap]     = useState<Record<string, string>>({});
  const [section, setSection]         = useState<"leads" | "partners" | "provisionen">("leads");
  const [detailId, setDetailId]       = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const [dash, pendingLeads, allPartners, allLeads] = await Promise.all([
        affiliateQuery("admin:getAdminDashboard", { adminSecret }),
        affiliateQuery("admin:getAllLeads",         { adminSecret }),
        affiliateQuery("admin:listAffiliates",    { adminSecret }),
        affiliateQuery("admin:getAllLeads",        { adminSecret }),
      ]);
      setDashboard(dash);
      setLeads(pendingLeads);
      setPartners(allPartners);

      const active = (allLeads ?? []).filter((l: any) => l.status === "active");
      setActiveLeads(active);

      const contracts: Record<string, any>    = {};
      const commissions: Record<string, any[]> = {};
      await Promise.all(active.map(async (lead: any) => {
        const contract = await affiliateQuery("admin:getContractForLead", { adminSecret, leadId: lead._id });
        if (contract) {
          contracts[lead._id] = contract;
          const comms = await affiliateQuery("admin:getCommissionsForContract", { adminSecret, contractId: contract._id });
          commissions[lead._id] = comms ?? [];
        }
      }));
      setContractMap(contracts);
      setCommissionsMap(commissions);
    } catch (e: unknown) {
      setError(errMsg(e, "Verbindungsfehler zur Partner-App"));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApproveLead = async (leadId: string) => {
    setApproving(leadId);
    try {
      await affiliateMutation("admin:approveLead", {
        adminSecret, leadId, planType: planMap[leadId] ?? "annual", adminName: "Admin",
      });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setApproving(null); }
  };

  const handleRejectLead = async (leadId: string) => {
    if (!reasonMap[leadId]) return;
    setRejecting(leadId);
    try {
      await affiliateMutation("admin:rejectLead", { adminSecret, leadId, reason: reasonMap[leadId] });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setRejecting(null); }
  };

  const handleApprovePartner = async (affiliateId: string) => {
    try {
      await affiliateMutation("admin:approveAffiliate", { adminSecret, affiliateId });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    }
  };

  const handleDeletePartner = async (affiliateId: string, name: string) => {
    if (!window.confirm(`Partner „${name}" wirklich löschen? Alle Leads, Verträge und Provisionen werden unwiderruflich gelöscht.`)) return;
    try {
      await affiliateMutation("admin:deleteAffiliate", { adminSecret, affiliateId });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    }
  };

  const handleSuspendPartner = async (affiliateId: string) => {
    try {
      await affiliateMutation("admin:suspendAffiliate", { adminSecret, affiliateId });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    }
  };

  const handleRecordPayment = async (contractId: string) => {
    setRecording(contractId);
    try {
      const result = await affiliateMutation("admin:recordPayment", { adminSecret, shopContractId: contractId });
      alert(`✓ Provision erfasst: €${(result as any)?.amount?.toFixed(2)} (${(result as any)?.phase})`);
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setRecording(null); }
  };

  const handleConfirmCommission = async (commissionId: string) => {
    setConfirming(commissionId);
    try {
      await affiliateMutation("admin:confirmCommission", { adminSecret, commissionId });
      await load();
    } catch (e: unknown) {
      alert(errMsg(e, "Fehler"));
    } finally { setConfirming(null); }
  };

  if (!AFFILIATE_URL) return (
    <div className="py-10 text-center text-zinc-500 text-sm">
      NEXT_PUBLIC_AFFILIATE_CONVEX_URL nicht konfiguriert
    </div>
  );

  if (loading) return (
    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
      className="text-zinc-500 text-sm text-center py-10">Lade Partner-Daten...</motion.div>
  );

  if (error) return (
    <div className="py-8 text-center space-y-3">
      <p className="text-red-400 text-sm">{error}</p>
      <button onClick={load} className="text-xs text-zinc-400 hover:text-zinc-200">Erneut versuchen</button>
    </div>
  );

  const pendingPartners = partners?.filter(p => p.status === "pending") ?? [];

  return (
    <motion.div key="partner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Shops offen",    value: dashboard?.leads.submitted ?? 0,                                     color: "text-yellow-400" },
          { label: "Partner aktiv",  value: dashboard?.affiliates.active ?? 0,                                   color: "text-amber-400"  },
          { label: "Provision off.", value: `€${(dashboard?.commissions.pending ?? 0).toFixed(0)}`,              color: "text-orange-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 text-center">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending Partner-Anfragen */}
      {pendingPartners.length > 0 && (
        <div className="bg-zinc-900 border border-amber-900/30 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
            <Users size={13} className="text-amber-400" />
            <span className="text-sm font-medium text-zinc-200">Neue Partner-Anfragen</span>
            <span className="ml-auto text-[10px] text-amber-400 font-semibold">{pendingPartners.length}</span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {pendingPartners.map(p => (
              <div key={p._id} className="flex items-center gap-3 px-4 py-3">
                {/* Erst anschauen, dann freigeben: öffnet das Detail-Popup mit allen Angaben */}
                <button onClick={() => setDetailId(p._id)} className="flex-1 min-w-0 text-left group">
                  <p className="text-sm text-zinc-200 font-medium group-hover:text-amber-400 transition-colors">{p.name}</p>
                  <p className="text-xs text-zinc-500">{p.email} · {p.referralCode}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Antippen für alle Details (Adresse, Bank, Steuer)</p>
                </button>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => setDetailId(p._id)}
                    className="text-[10px] px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors">
                    Ansehen
                  </button>
                  <button onClick={() => handleApprovePartner(p._id)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                    style={{ background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24" }}>
                    Freigeben
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section-Toggle */}
      <div className="flex gap-1.5">
        {(["leads", "partners", "provisionen"] as const).map(s => (
          <button key={s} onClick={() => setSection(s)}
            className="flex-1 py-2 rounded-xl text-[11px] font-semibold transition-colors"
            style={section === s
              ? { background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.3)", color: "#fbbf24" }
              : { background: "#18181b", border: "1px solid #27272a", color: "#71717a" }}>
            {s === "leads" ? `Shops (${leads?.length ?? 0})` : s === "partners" ? `Partner (${partners?.length ?? 0})` : `Prov. (${activeLeads.length})`}
          </button>
        ))}
      </div>

      {/* Neue Shops (Info) */}
      {section === "leads" && (
        <div className="space-y-3">
          <div className="rounded-xl px-3 py-2.5 text-xs text-zinc-400"
            style={{ background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.15)" }}>
            Shops werden automatisch aktiviert. Hier siehst du neue Shops die in LoyaltyCard eingerichtet werden müssen.
          </div>
          {leads?.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-6">Keine neuen Shops</p>
          )}
          {leads?.map((lead: any) => (
            <div key={lead._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-100">{lead.shopName}</p>
                  <p className="text-xs text-zinc-500">{lead.ownerName} · {lead.ownerEmail}</p>
                  {lead.ownerPhone && <p className="text-xs text-zinc-600">{lead.ownerPhone}</p>}
                  {lead.city && <p className="text-xs text-zinc-600">{lead.businessType ?? ""}{lead.businessType && lead.city ? " · " : ""}{lead.city}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-amber-400">{lead.affiliateName}</p>
                  <p className="text-[10px] text-zinc-600">{lead.affiliateCode}</p>
                  <p className="text-[10px] text-green-400 mt-0.5">● Aktiv</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600 pt-1 border-t border-zinc-800">
                Eingereicht: {new Date(lead._creationTime).toLocaleDateString("de-DE")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Alle Partner */}
      {section === "partners" && (
        <div className="space-y-3">
          {/* Partner erstellen */}
          <CreatePartnerForm adminSecret={adminSecret} onCreated={load} />
          <InvitePartnerButton adminSecret={adminSecret} />

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {partners?.length === 0 && (
              <p className="text-center text-zinc-500 text-sm p-6">Noch keine Partner</p>
            )}
            <div className="divide-y divide-zinc-800/50">
              {partners?.map(p => (
                <div key={p._id} className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setDetailId(p._id)} className="flex-1 min-w-0 text-left group">
                    <p className="text-sm text-zinc-200 group-hover:text-amber-400 transition-colors flex items-center gap-2">
                      {p.name}
                      {p.pendingProfile && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/30 border border-yellow-800/50 text-yellow-400">Änderung offen</span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">{p.email}</p>
                    {p.company && <p className="text-xs text-zinc-600">{p.company}</p>}
                  </button>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-xs font-mono text-amber-400">{p.referralCode}</p>
                    <p className={`text-[10px] ${p.status === "active" ? "text-green-400" : p.status === "pending" ? "text-yellow-400" : "text-red-400"}`}>
                      {p.status === "active" ? "Aktiv" : p.status === "pending" ? "Ausstehend" : "Gesperrt"}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                      <button onClick={() => setDetailId(p._id)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-900/40 transition-colors">
                        Details
                      </button>
                      {p.status === "active" && (
                        <button onClick={() => handleSuspendPartner(p._id)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-red-900/20 border border-red-900/40 text-red-400 hover:bg-red-900/30 transition-colors">
                          Sperren
                        </button>
                      )}
                      {p.status === "suspended" && (
                        <button onClick={() => handleApprovePartner(p._id)}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-green-900/20 border border-green-900/40 text-green-400 hover:bg-green-900/30 transition-colors">
                          Reaktivieren
                        </button>
                      )}
                      <button onClick={() => handleDeletePartner(p._id, p.name)}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-900/40 transition-colors">
                        Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Partner-Detail-Popup */}
      {detailId && (
        <PartnerDetailModal
          adminSecret={adminSecret}
          affiliateId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}

      {/* Provisionen */}
      {section === "provisionen" && (
        <div className="space-y-3">
          {activeLeads.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-6">Keine aktiven Shops</p>
          )}
          {activeLeads.map(lead => {
            const contract = contractMap[lead._id];
            if (!contract) return null;
            const comms    = commissionsMap[lead._id] ?? [];
            const pending  = comms.filter((c: any) => c.status === "pending");
            const confirmed = comms.filter((c: any) => c.status === "confirmed");
            const preview  = nextCommissionPreview(contract.planType, contract.paymentCount + 1, contract.firstYearDiscount);
            return (
              <div key={lead._id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-100">{lead.shopName}</p>
                    <p className="text-xs text-zinc-500">{lead.affiliateName} · {lead.affiliateCode}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-amber-400">
                      {contract.planType === "annual" ? "Jahresabo" : "Monatsabo"}
                    </p>
                    <p className="text-[10px] text-zinc-600">{contract.paymentCount} Zahlungen</p>
                  </div>
                </div>

                {/* Nächste Provision */}
                <div className="rounded-lg px-3 py-2 bg-zinc-800/60 border border-zinc-700/50">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Zahlung #{contract.paymentCount + 1} → Provision</p>
                  <p className="text-sm font-bold text-amber-400">
                    €{preview.amount.toFixed(2)}
                    <span className="text-xs font-normal text-zinc-500 ml-1">
                      ({(preview.rate * 100).toFixed(0)}% · {preview.phase})
                    </span>
                  </p>
                </div>

                <button onClick={() => handleRecordPayment(contract._id)}
                  disabled={recording === contract._id}
                  className="w-full py-2 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 transition-colors">
                  {recording === contract._id ? "Erfasse..." : "Zahlung erfassen →"}
                </button>

                {/* Ausstehende Provisionen bestätigen */}
                {pending.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ausstehend (nach 14 Tagen bestätigen)</p>
                    {pending.map((c: any) => {
                      // 14 Tage Widerrufsfrist ab Zahlungsbestätigung (triggeredAt)
                      const payableAt = c.triggeredAt + 14 * 24 * 60 * 60 * 1000;
                      const payable = Date.now() >= payableAt;
                      return (
                      <div key={c._id} className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{ background: "rgba(249,115,22,.07)", border: "1px solid rgba(249,115,22,.2)" }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-200">€{c.amount.toFixed(2)}</p>
                          <p className="text-[10px] text-zinc-500">
                            {payable
                              ? new Date(c.triggeredAt).toLocaleDateString("de-DE")
                              : `auszahlbar ab ${new Date(payableAt).toLocaleDateString("de-DE")}`}
                          </p>
                        </div>
                        <button onClick={() => handleConfirmCommission(c._id)} disabled={confirming === c._id || !payable}
                          title={!payable ? "Erst nach 14 Tagen Widerrufsfrist auszahlbar" : undefined}
                          className="text-xs px-2.5 py-1 rounded-lg font-semibold text-green-400 disabled:opacity-40 transition-opacity"
                          style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.2)" }}>
                          {confirming === c._id ? "..." : "Bestätigen"}
                        </button>
                      </div>
                      );
                    })}
                  </div>
                )}

                {confirmed.length > 0 && (
                  <p className="text-[10px] text-green-400">
                    ✓ {confirmed.length}× bestätigt · €{confirmed.reduce((s: number, c: any) => s + c.amount, 0).toFixed(2)} bereit
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={load} className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
        ↻ Aktualisieren
      </button>
    </motion.div>
  );
}
