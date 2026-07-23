"use client";

// Geteilte Primitive, Typen und Helfer der Admin-Page (ausgelagert).
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { affiliateQuery } from "./lib/affiliate";

export type PayStatus = { paid: boolean; payLater: boolean; amountDue: number; paymentToken: string };

export function usePayStatus(adminSecret: string): Record<string, PayStatus> {
  const [map, setMap] = useState<Record<string, PayStatus>>({});
  useEffect(() => {
    if (!adminSecret) return;
    affiliateQuery("admin:getPayStatusForShops", { adminSecret })
      .then((rows: any[]) => {
        const m: Record<string, PayStatus> = {};
        (rows ?? []).forEach((r: any) => { m[r.loatycardShopId] = r; });
        setMap(m);
      })
      .catch(() => {});
  }, [adminSecret]);
  return map;
}

export function PayBadge({ status }: { status?: PayStatus }) {
  if (!status) return null;
  if (status.paid) return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-green-900/25 border border-green-800/40 text-green-400 shrink-0">
      Bezahlt
    </span>
  );
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-yellow-900/25 border border-yellow-700/40 text-yellow-400 shrink-0">
      {status.payLater ? "Später zahlen" : "Zahlung offen"} · €{status.amountDue}
    </span>
  );
}

export function ToggleSwitch({ active, onToggle, disabled }: { active: boolean; onToggle: () => void; disabled: boolean }) {
  return (
    <button onClick={onToggle} disabled={disabled}
      style={{ minWidth: "2.5rem", height: "1.375rem" }}
      className={`relative rounded-full transition-colors flex items-center px-0.5 disabled:opacity-50 ${active ? "bg-amber-400" : "bg-zinc-700"}`}>
      <motion.div animate={{ x: active ? 18 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="w-4 h-4 rounded-full bg-white shadow-sm" />
    </button>
  );
}

export type Tier = { stamps: number; text: string; enabled: boolean };

export type Period = "7d" | "30d" | "90d" | "365d" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "7d",   label: "7T"  },
  { id: "30d",  label: "1M"  },
  { id: "90d",  label: "3M"  },
  { id: "365d", label: "1J"  },
  { id: "all",  label: "Alle" },
];

export function periodDays(p: Period): number | undefined {
  if (p === "all") return undefined;
  return p === "7d" ? 7 : p === "30d" ? 30 : p === "90d" ? 90 : 365;
}
export function periodToSince(p: Period): number | undefined {
  const d = periodDays(p);
  return d !== undefined ? Date.now() - d * 86400000 : undefined;
}
export function periodToPrevSince(p: Period): number | undefined {
  const d = periodDays(p);
  return d !== undefined ? Date.now() - 2 * d * 86400000 : undefined;
}
export function growthBadge(current: number, prev: number): { label: string; up: boolean | null } {
  if (prev === 0 && current === 0) return { label: "—", up: null };
  if (prev === 0) return { label: "Neu", up: true };
  const pct = Math.round(((current - prev) / prev) * 100);
  return { label: `${pct >= 0 ? "+" : ""}${pct}%`, up: pct >= 0 };
}

export function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
      {PERIODS.map(p => (
        <button key={p.id} onClick={() => onChange(p.id)}
          className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
          style={value === p.id
            ? { background: "#fbbf24", color: "#18181b" }
            : { color: "#71717a" }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ─── AnalyticsTab (globale Gesamt-Auswertung) ─────────────────────────────────

export function MiniBarChart({ data }: { data: { dayStart: number; stamps: number }[] }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.stamps), 1);
  const W = 300; const H = 48; const gap = 2;
  const barW = Math.max(2, Math.floor((W - gap * (data.length - 1)) / data.length));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 48 }}>
      {data.map((d, i) => {
        const h = Math.max(2, Math.round((d.stamps / max) * (H - 4)));
        return (
          <rect key={i}
            x={i * (barW + gap)} y={H - h} width={barW} height={h}
            rx={1} fill="#fbbf24" opacity={0.75}
          />
        );
      })}
    </svg>
  );
}

export function GrowthCard({ label, value, prev, color, period }: {
  label: string; value: number; prev: number; color: string; period: Period;
}) {
  const badge = period !== "all" ? growthBadge(value, prev) : null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-start justify-between gap-1">
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {badge && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 ${
            badge.up === true ? "bg-green-500/15 text-green-400" :
            badge.up === false ? "bg-red-500/15 text-red-400" : "text-zinc-600"}`}>
            {badge.label}
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export type EarningsSummary = {
  revenueTotal: number; commTotal: number; commPaid: number;
  // Einrichtungsgebühren-Anteil (einmalig, in Zahlung #1) und Abo-Anteil des Umsatzes
  setupFeesTotal?: number; aboRevenue?: number;
  commConfirmed: number; commPending: number; netEarnings: number; activeContracts: number;
  // Vertrags-Aufschlüsselung (ältere Server-Version liefert die Felder noch nicht)
  payingContracts?: number; payingMonthly?: number; payingAnnual?: number;
  awaitingPayment?: number; canceledContracts?: number;
  monthlyRunRate?: number; yearlyRunRate?: number;
  // Laufender Abo-Umsatz getrennt nach Abo-Modell
  monthlyPlanRunRate?: number; annualPlanRunRate?: number;
};

export type PaymentRow = {
  date: number; shopName: string; planType: "annual" | "monthly"; paymentNumber: number;
  paidAmount: number; commission: number; commissionStatus: string; direct: boolean;
  discountCode: string | null;
  // Einrichtungsanteil dieser Zahlung (nur #1): gezahlt und Listenpreis (45/99 €)
  setupFeePaid?: number; setupFeeList?: number;
};

export function groupPayments(payments: PaymentRow[], mode: "month" | "year") {
  const map = new Map<string, { label: string; sort: number; count: number; revenue: number; commission: number }>();
  for (const p of payments) {
    const d = new Date(p.date);
    const key = mode === "month"
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      : String(d.getFullYear());
    const g = map.get(key) ?? {
      label: mode === "month"
        ? d.toLocaleDateString("de-DE", { month: "long", year: "numeric" })
        : String(d.getFullYear()),
      sort:  mode === "month" ? d.getFullYear() * 12 + d.getMonth() : d.getFullYear(),
      count: 0, revenue: 0, commission: 0,
    };
    g.count++; g.revenue += p.paidAmount; g.commission += p.commission;
    map.set(key, g);
  }
  return Array.from(map.values()).sort((a, b) => b.sort - a.sort);
}

export const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Letzte 7 Tage", "30d": "Letzter Monat", "90d": "Letzte 3 Monate", "365d": "Letztes Jahr", "all": "Gesamt",
};

