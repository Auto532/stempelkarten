"use client";

import React from "react";
import {
  Document, Page, View, Text, Image, StyleSheet,
} from "@react-pdf/renderer";
import { C, Icon, Brand } from "./reportPdf";

// ── Datenformen ───────────────────────────────────────────────────────────────
export type CompanyInfo = {
  companyName: string;
  ownerName?: string | null;
  street?:    string | null;
  zip?:       string | null;
  city?:      string | null;
  country?:   string | null;
  taxId?:     string | null;
  vatId?:     string | null;
  email?:     string | null;
  phone?:     string | null;
  website?:   string | null;
  smallBusiness?: boolean | null;
};

export type FinanceReportData = {
  company:     CompanyInfo | null;
  periodLabel: string;
  dateStr:     string;
  totals: {
    revenue: number; commission: number; net: number;
    setupFees: number; aboRevenue: number;
    payingContracts: number; paymentCount: number;
    commPending: number; commConfirmed: number; commPaid: number;
  };
  months:   { label: string; count: number; revenue: number; commission: number; net: number }[];
  payments: { date: string; shopName: string; model: string; gross: number; commission: number; net: number }[];
};

const euro = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const s = StyleSheet.create({
  // Seite + goldener Rahmen (wie LoyaltyReport, aber auf jeder Seite via fixed)
  page: { backgroundColor: C.bg, paddingTop: 30, paddingBottom: 46, paddingHorizontal: 30, fontFamily: "Helvetica", color: C.white },
  frame: { position: "absolute", top: 16, left: 16, right: 16, bottom: 16, borderWidth: 1, borderColor: C.gold, borderRadius: 10 },
  // Header (identisch zum anderen PDF)
  headRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  info: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoTxt: { fontSize: 11, color: C.gray },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  titleBar: { width: 3, height: 15, backgroundColor: C.gold, borderRadius: 2 },
  title: { fontSize: 12.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.4 },
  subtitle: { fontSize: 8.5, color: C.gray, marginTop: 3 },
  shopName: { fontSize: 8.5, color: C.gold, fontFamily: "Helvetica-Bold" },
  kleinBadge: { alignSelf: "flex-start", marginTop: 7, fontSize: 7.5, color: C.goldDim, backgroundColor: "#f7edcf", borderWidth: 1, borderColor: C.goldDim, borderRadius: 5, paddingVertical: 3, paddingHorizontal: 7 },
  // Stat-Karten
  statRow: { flexDirection: "row", gap: 8, marginTop: 13 },
  statCard: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 11 },
  statTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  statLabel: { fontSize: 6.5, color: C.gray, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  statVal: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 7 },
  statSub: { fontSize: 6.5, color: C.goldDim, marginTop: 2 },
  // Section
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 15, marginBottom: 7 },
  sectionIcon: { width: 18, height: 18, borderRadius: 4, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.gold, letterSpacing: 0.4 },
  // Aufschlüsselung
  breakCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 12 },
  bRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3.5 },
  bLabel: { fontSize: 9, color: C.gray },
  bVal: { fontSize: 9.5, color: C.white, fontFamily: "Helvetica-Bold" },
  bDiv: { height: 0.6, backgroundColor: C.cardBd, marginVertical: 4 },
  bRowSum: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 6, marginTop: 3, borderTopWidth: 1, borderTopColor: C.goldDim },
  bSumLabel: { fontSize: 9.5, color: C.gold, fontFamily: "Helvetica-Bold" },
  bSumVal: { fontSize: 12, color: C.gold, fontFamily: "Helvetica-Bold" },
  note: { fontSize: 7.5, color: C.gray, marginTop: 8, lineHeight: 1.5 },
  // Tabellen
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.cardBd, paddingBottom: 5 },
  thTxt: { fontSize: 7.5, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.cardBd, paddingVertical: 4 },
  trSum: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.goldDim, paddingTop: 5, marginTop: 1 },
  td: { fontSize: 8.5, color: C.gray },
  tdName: { fontSize: 8.5, color: C.white },
  tdGreen: { fontSize: 8.5, color: C.green, textAlign: "right" },
  tdRed: { fontSize: 8.5, color: C.red, textAlign: "right" },
  tdGold: { fontSize: 8.5, color: C.gold, fontFamily: "Helvetica-Bold", textAlign: "right" },
  // Aussteller-Infoblock (wie footInfo im anderen PDF)
  footInfo: { flexDirection: "row", gap: 26, marginTop: 14 },
  footCol: { flexDirection: "row", alignItems: "flex-start", gap: 7, maxWidth: 175 },
  footLabel: { fontSize: 7, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  footVal: { fontSize: 8, color: C.gray, marginTop: 2, lineHeight: 1.5 },
  // Fuß-Bar (identisch zum anderen PDF, auf jeder Seite via fixed)
  footBar: { position: "absolute", bottom: 26, left: 30, right: 30, borderTopWidth: 1, borderTopColor: C.gold, paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footBarTxt: { fontSize: 8, color: C.gray },
});

function StatCard({ icon, label, value, sub, color = C.white }: { icon: string; label: string; value: string; sub: string; color?: string }) {
  return (
    <View style={s.statCard}>
      <View style={s.statTop}>
        <Icon name={icon} size={12} />
        <Text style={s.statLabel}>{label}</Text>
      </View>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

// Spaltenbreiten Journal
const J = { date: 46, model: 128, gross: 62, comm: 62 };

export function FinanceReport({ data, logoSrc = "/logo-dunkel.png", markSrc = "/logo-mark.png" }: { data: FinanceReportData; logoSrc?: string; markSrc?: string }) {
  const co = data.company;
  const klein = co?.smallBusiness !== false; // Default: Kleinunternehmer §19
  const t = data.totals;

  const addrLines = [
    co?.ownerName || null,
    co?.street || null,
    [co?.zip, co?.city].filter(Boolean).join(" ") || null,
    co?.country || null,
  ].filter(Boolean).join("\n");
  const steuerLines = [
    co?.taxId ? `Steuernr.: ${co.taxId}` : null,
    co?.vatId ? `USt-IdNr.: ${co.vatId}` : null,
    co?.email || null,
    co?.phone || null,
  ].filter(Boolean).join("\n");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Goldener Rahmen auf jeder Seite */}
        <View style={s.frame} fixed />

        {/* ── Header (wie LoyaltyReport) ── */}
        <View style={s.headRow}>
          <Brand markSrc={markSrc} />
        </View>

        <View style={s.titleRow}>
          <View style={s.titleBar} />
          <Text style={s.title}>FINANZBERICHT / EINNAHMENÜBERSICHT</Text>
        </View>
        <Text style={s.subtitle}>
          <Text style={s.shopName}>{co?.companyName || "Firmenname im Admin hinterlegen"}</Text>
          <Text>{`  ·  Einnahmenübersicht · Berichtszeitraum: ${data.periodLabel}`}</Text>
        </Text>
        {klein && (
          <Text style={s.kleinBadge}>Kein Ausweis von Umsatzsteuer gemäß §19 UStG (Kleinunternehmer)</Text>
        )}

        {/* ── Kennzahlen ── */}
        <View style={s.statRow}>
          <StatCard icon="wallet"  label="GESAMTUMSATZ"  value={euro(t.revenue)}    sub={klein ? "brutto = netto (§19)" : "Bruttoeinnahmen"} color={C.green} />
          <StatCard icon="percent" label="PROVISIONEN"   value={euro(t.commission)} sub="Betriebsausgabe an Partner" color={C.red} />
          <StatCard icon="coins"   label="ERGEBNIS"      value={euro(t.net)}        sub="Umsatz abzgl. Provisionen" color={C.gold} />
        </View>

        {/* ── Umsatz-Aufschlüsselung ── */}
        <View style={s.sectionHead}>
          <View style={s.sectionIcon}><Icon name="receipt" size={11} color={C.ink} /></View>
          <Text style={s.sectionTitle}>AUFSCHLÜSSELUNG</Text>
        </View>
        <View style={s.breakCard}>
          <View style={s.bRow}><Text style={s.bLabel}>Abo-Umsatz (laufend)</Text><Text style={s.bVal}>{euro(t.aboRevenue)}</Text></View>
          <View style={s.bRow}><Text style={s.bLabel}>Einrichtungsgebühren (einmalig)</Text><Text style={s.bVal}>{euro(t.setupFees)}</Text></View>
          <View style={s.bDiv} />
          <View style={s.bRow}><Text style={s.bLabel}>Gesamtumsatz</Text><Text style={s.bVal}>{euro(t.revenue)}</Text></View>
          <View style={s.bRow}><Text style={s.bLabel}>abzgl. Provisionen an Partner</Text><Text style={[s.bVal, { color: C.red }]}>- {euro(t.commission)}</Text></View>
          <View style={s.bRowSum}><Text style={s.bSumLabel}>Ergebnis (vor Steuern)</Text><Text style={s.bSumVal}>{euro(t.net)}</Text></View>
          <Text style={s.note}>
            {t.payingContracts} zahlende Shops · {t.paymentCount} Zahlungen im Zeitraum.{"\n"}
            Provisionsstatus: {euro(t.commPending)} ausstehend · {euro(t.commConfirmed)} bestätigt · {euro(t.commPaid)} ausgezahlt.
          </Text>
        </View>

        {/* ── Monatsübersicht ── */}
        {data.months.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <View style={s.sectionIcon}><Icon name="calendar" size={11} color={C.ink} /></View>
              <Text style={s.sectionTitle}>MONATSÜBERSICHT</Text>
            </View>
            <View style={s.th}>
              <Text style={[s.thTxt, { flex: 1 }]}>MONAT</Text>
              <Text style={[s.thTxt, { width: 50, textAlign: "right" }]}>ZAHL.</Text>
              <Text style={[s.thTxt, { width: 70, textAlign: "right" }]}>UMSATZ</Text>
              <Text style={[s.thTxt, { width: 70, textAlign: "right" }]}>PROV.</Text>
              <Text style={[s.thTxt, { width: 70, textAlign: "right" }]}>ERGEBNIS</Text>
            </View>
            {data.months.map((m, i) => (
              <View style={s.tr} key={i} wrap={false}>
                <Text style={[s.tdName, { flex: 1 }]}>{m.label}</Text>
                <Text style={[s.td, { width: 50, textAlign: "right" }]}>{m.count}</Text>
                <Text style={[s.tdGreen, { width: 70 }]}>{euro(m.revenue)}</Text>
                <Text style={[s.tdRed, { width: 70 }]}>{m.commission > 0 ? `- ${euro(m.commission)}` : "–"}</Text>
                <Text style={[s.tdGold, { width: 70 }]}>{euro(m.net)}</Text>
              </View>
            ))}
            <View style={s.trSum} wrap={false}>
              <Text style={[s.tdName, { flex: 1, fontFamily: "Helvetica-Bold", color: C.gold }]}>Summe</Text>
              <Text style={[s.td, { width: 50, textAlign: "right", color: C.gold }]}>{t.paymentCount}</Text>
              <Text style={[s.tdGold, { width: 70 }]}>{euro(t.revenue)}</Text>
              <Text style={[s.tdGold, { width: 70 }]}>- {euro(t.commission)}</Text>
              <Text style={[s.tdGold, { width: 70 }]}>{euro(t.net)}</Text>
            </View>
          </>
        )}

        {/* ── Zahlungs-Journal (mehrseitig) ── */}
        {data.payments.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <View style={s.sectionIcon}><Icon name="creditcard" size={11} color={C.ink} /></View>
              <Text style={s.sectionTitle}>ZAHLUNGS-JOURNAL</Text>
            </View>
            <View style={s.th}>
              <Text style={[s.thTxt, { width: J.date }]}>DATUM</Text>
              <Text style={[s.thTxt, { flex: 1 }]}>SHOP</Text>
              <Text style={[s.thTxt, { width: J.model }]}>MODELL</Text>
              <Text style={[s.thTxt, { width: J.gross, textAlign: "right" }]}>BETRAG</Text>
              <Text style={[s.thTxt, { width: J.comm, textAlign: "right" }]}>PROV.</Text>
            </View>
            {data.payments.map((p, i) => (
              <View style={s.tr} key={i} wrap={false}>
                <Text style={[s.td, { width: J.date }]}>{p.date}</Text>
                <Text style={[s.tdName, { flex: 1 }]}>{p.shopName}</Text>
                <Text style={[s.td, { width: J.model }]}>{p.model}</Text>
                <Text style={[s.tdGreen, { width: J.gross }]}>{euro(p.gross)}</Text>
                <Text style={[s.tdRed, { width: J.comm }]}>{p.commission > 0 ? `- ${euro(p.commission)}` : "–"}</Text>
              </View>
            ))}
            <View style={s.trSum} wrap={false}>
              <Text style={[s.tdName, { width: J.date, fontFamily: "Helvetica-Bold", color: C.gold }]}>Summe</Text>
              <Text style={[s.td, { flex: 1 }]} />
              <Text style={[s.td, { width: J.model }]} />
              <Text style={[s.tdGold, { width: J.gross }]}>{euro(t.revenue)}</Text>
              <Text style={[s.tdGold, { width: J.comm }]}>- {euro(t.commission)}</Text>
            </View>
          </>
        )}

        {/* ── Aussteller-Infoblock (wie footInfo im anderen PDF) ── */}
        <View style={s.footInfo}>
          {addrLines ? (
            <View style={s.footCol}>
              <Icon name="building" size={16} sw={1.7} />
              <View><Text style={s.footLabel}>AUSSTELLER</Text><Text style={s.footVal}>{addrLines}</Text></View>
            </View>
          ) : null}
          {steuerLines ? (
            <View style={s.footCol}>
              <Icon name="receipt" size={16} sw={1.7} />
              <View><Text style={s.footLabel}>STEUER / KONTAKT</Text><Text style={s.footVal}>{steuerLines}</Text></View>
            </View>
          ) : null}
          <View style={s.footCol}>
            <Icon name="calendar" size={16} sw={1.7} />
            <View><Text style={s.footLabel}>ERSTELLT</Text><Text style={s.footVal}>{data.dateStr}</Text></View>
          </View>
        </View>

        {/* ── Fuß-Bar (jede Seite, wie LoyaltyReport) ── */}
        <View style={s.footBar} fixed>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <Image src={logoSrc} style={{ width: 30, height: 22 }} />
            <Text style={s.footBarTxt}>loyaltycard.info</Text>
          </View>
          <Text style={s.footBarTxt} render={({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
