"use client";

import React from "react";
import {
  Document, Page, View, Text, Image, StyleSheet,
} from "@react-pdf/renderer";
import { C, Icon, Brand } from "./reportPdf";
import type { CompanyInfo } from "./financePdf";

// ── Datenformen ───────────────────────────────────────────────────────────────
export type PartnerInfo = {
  name: string;
  company?: string | null;
  referralCode: string;
  businessType?: "private" | "business" | null;
  address?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  taxId?: string | null;
  vatId?: string | null;
  bankIban?: string | null;
  bankBic?: string | null;
  bankName?: string | null;
};

export type CommissionStatementData = {
  company:    CompanyInfo | null;   // Aussteller (Gutschrift)
  partner:    PartnerInfo;          // Empfänger
  statementNo: string;
  dateStr:    string;
  periodLabel: string;
  rows: {
    date: string; shopName: string; model: string;
    baseAmount: number; rate: number; amount: number; statusLabel: string;
  }[];
  totals: { count: number; pending: number; confirmed: number; paid: number; payableTotal: number };
};

const euro = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, paddingTop: 30, paddingBottom: 46, paddingHorizontal: 30, fontFamily: "Helvetica", color: C.white },
  frame: { position: "absolute", top: 16, left: 16, right: 16, bottom: 16, borderWidth: 1, borderColor: C.gold, borderRadius: 10 },
  headRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  headerRule: { height: 1, backgroundColor: C.gold, opacity: 0.85, marginTop: 10, marginBottom: 2 },
  info: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoTxt: { fontSize: 11, color: C.gray },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  titleBar: { width: 3, height: 15, backgroundColor: C.gold, borderRadius: 2 },
  title: { fontSize: 12.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.4 },
  subtitle: { fontSize: 8.5, color: C.gray, marginTop: 3 },
  partnerName: { fontSize: 8.5, color: C.gold, fontFamily: "Helvetica-Bold" },
  // Parteien-Block
  parties: { flexDirection: "row", gap: 10, marginTop: 13 },
  partyCard: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 11 },
  partyLabel: { fontSize: 6.5, color: C.goldDim, fontFamily: "Helvetica-Bold", letterSpacing: 0.4 },
  partyName: { fontSize: 10, color: C.white, fontFamily: "Helvetica-Bold", marginTop: 4 },
  partyLine: { fontSize: 8, color: C.gray, marginTop: 2, lineHeight: 1.5 },
  metaRow: { flexDirection: "row", gap: 18, marginTop: 10 },
  metaLabel: { fontSize: 6.5, color: C.goldDim, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  metaVal: { fontSize: 9, color: C.white, fontFamily: "Helvetica-Bold", marginTop: 1 },
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
  // Tabelle
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.cardBd, paddingBottom: 5 },
  thTxt: { fontSize: 7.5, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.cardBd, paddingVertical: 4 },
  trSum: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.goldDim, paddingTop: 5, marginTop: 1 },
  td: { fontSize: 8.5, color: C.gray },
  tdName: { fontSize: 8.5, color: C.white },
  tdGold: { fontSize: 8.5, color: C.gold, fontFamily: "Helvetica-Bold", textAlign: "right" },
  // USt / Summenblock
  sumCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 12, marginTop: 12, alignSelf: "flex-end", width: 240 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  sumLabel: { fontSize: 9, color: C.gray },
  sumVal: { fontSize: 9.5, color: C.white, fontFamily: "Helvetica-Bold" },
  sumTotal: { flexDirection: "row", justifyContent: "space-between", paddingTop: 6, marginTop: 3, borderTopWidth: 1, borderTopColor: C.goldDim },
  sumTotalL: { fontSize: 9.5, color: C.gold, fontFamily: "Helvetica-Bold" },
  sumTotalV: { fontSize: 12, color: C.gold, fontFamily: "Helvetica-Bold" },
  note: { fontSize: 7.5, color: C.gray, marginTop: 10, lineHeight: 1.5 },
  // Bank
  bankCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 11, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  // Kontakt (Rückfragen des Partners)
  contactCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 11, marginTop: 10, flexDirection: "row", alignItems: "flex-start", gap: 9 },
  contactText: { fontSize: 8, color: C.gray, marginTop: 3, marginBottom: 3, lineHeight: 1.5 },
  contactName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.white, marginTop: 2 },
  // Footer
  footBar: { position: "absolute", bottom: 26, left: 30, right: 30, borderTopWidth: 1, borderTopColor: C.gold, paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footBarTxt: { fontSize: 8, color: C.gray },
});

function StatCard({ icon, label, value, sub, color = C.white }: { icon: string; label: string; value: string; sub: string; color?: string }) {
  return (
    <View style={s.statCard}>
      <View style={s.statTop}><Icon name={icon} size={12} /><Text style={s.statLabel}>{label}</Text></View>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statSub}>{sub}</Text>
    </View>
  );
}

const T = { date: 46, model: 120, base: 58, rate: 40, amount: 62 };

export function CommissionStatement({ data, logoSrc = "/logo-dunkel.png", markSrc = "/logo-mark.png" }: { data: CommissionStatementData; logoSrc?: string; markSrc?: string }) {
  const co = data.company;
  const p = data.partner;
  // USt nur bei Gewerbe-Partnern mit USt-IdNr. (Gutschrift mit USt-Ausweis).
  const withVat = p.businessType === "business" && !!p.vatId;
  const net = data.totals.payableTotal;
  const vat = withVat ? Math.round(net * 0.19 * 100) / 100 : 0;
  const gross = Math.round((net + vat) * 100) / 100;

  const partyAddr = (name: string, company: string | null | undefined, lines: (string | null | undefined)[]) =>
    [company && company !== name ? company : null, ...lines].filter(Boolean).join("\n");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.frame} fixed />

        {/* Header */}
        <View style={s.headRow}>
          <Brand markSrc={markSrc} />
        </View>
        <View style={s.headerRule} />

        <View style={s.titleRow}>
          <View style={s.titleBar} />
          <Text style={s.title}>PROVISIONSABRECHNUNG (GUTSCHRIFT)</Text>
        </View>
        <Text style={s.subtitle}>
          <Text style={s.partnerName}>{p.company || p.name}</Text>
          <Text>{`  ·  Partner ${p.referralCode}  ·  Zeitraum: ${data.periodLabel}`}</Text>
        </Text>

        {/* Aussteller / Empfänger */}
        <View style={s.parties}>
          <View style={s.partyCard}>
            <Text style={s.partyLabel}>AUSSTELLER (GUTSCHRIFT)</Text>
            <Text style={s.partyName}>{co?.companyName || "Firmenprofil im Admin hinterlegen"}</Text>
            <Text style={s.partyLine}>
              {partyAddr(co?.companyName ?? "", null, [
                co?.ownerName, co?.street, [co?.zip, co?.city].filter(Boolean).join(" ") || null, co?.country,
                co?.taxId ? `Steuernr.: ${co.taxId}` : null,
                co?.vatId ? `USt-IdNr.: ${co.vatId}` : null,
              ])}
            </Text>
          </View>
          <View style={s.partyCard}>
            <Text style={s.partyLabel}>EMPFÄNGER (PARTNER)</Text>
            <Text style={s.partyName}>{p.name}</Text>
            <Text style={s.partyLine}>
              {partyAddr(p.name, p.company, [
                p.address, [p.zip, p.city].filter(Boolean).join(" ") || null, p.country,
                p.taxId ? `Steuernr.: ${p.taxId}` : null,
                p.vatId ? `USt-IdNr.: ${p.vatId}` : null,
              ])}
            </Text>
          </View>
        </View>

        <View style={s.metaRow}>
          <View><Text style={s.metaLabel}>ABRECHNUNGS-NR.</Text><Text style={s.metaVal}>{data.statementNo}</Text></View>
          <View><Text style={s.metaLabel}>DATUM</Text><Text style={s.metaVal}>{data.dateStr}</Text></View>
          <View><Text style={s.metaLabel}>PROVISIONEN</Text><Text style={s.metaVal}>{data.totals.count}</Text></View>
        </View>

        {/* Kennzahlen */}
        <View style={s.statRow}>
          <StatCard icon="coins"      label="ABRECHENBAR" value={euro(net)}                 sub="offen + ausgezahlt" color={C.gold} />
          <StatCard icon="wallet"     label="AUSGEZAHLT"  value={euro(data.totals.paid)}    sub="bereits überwiesen" color={C.green} />
          <StatCard icon="creditcard" label="OFFEN"       value={euro(data.totals.pending + data.totals.confirmed)} sub="ausstehend + bestätigt" color={C.white} />
        </View>

        {/* Provisions-Tabelle */}
        <View style={s.sectionHead}>
          <View style={s.sectionIcon}><Icon name="percent" size={11} color={C.ink} /></View>
          <Text style={s.sectionTitle}>PROVISIONEN IM ZEITRAUM</Text>
        </View>
        <View style={s.th}>
          <Text style={[s.thTxt, { width: T.date }]}>DATUM</Text>
          <Text style={[s.thTxt, { flex: 1 }]}>SHOP</Text>
          <Text style={[s.thTxt, { width: T.model }]}>MODELL</Text>
          <Text style={[s.thTxt, { width: T.base, textAlign: "right" }]}>BASIS</Text>
          <Text style={[s.thTxt, { width: T.rate, textAlign: "right" }]}>SATZ</Text>
          <Text style={[s.thTxt, { width: T.amount, textAlign: "right" }]}>PROV.</Text>
        </View>
        {data.rows.map((r, i) => (
          <View style={s.tr} key={i} wrap={false}>
            <Text style={[s.td, { width: T.date }]}>{r.date}</Text>
            <Text style={[s.tdName, { flex: 1 }]}>{r.shopName}</Text>
            <Text style={[s.td, { width: T.model }]}>{r.model}</Text>
            <Text style={[s.td, { width: T.base, textAlign: "right" }]}>{euro(r.baseAmount)}</Text>
            <Text style={[s.td, { width: T.rate, textAlign: "right" }]}>{Math.round(r.rate * 100)}%</Text>
            <Text style={[s.tdGold, { width: T.amount }]}>{euro(r.amount)}</Text>
          </View>
        ))}

        {/* Summen / USt */}
        <View style={s.sumCard}>
          {withVat ? (
            <>
              <View style={s.sumRow}><Text style={s.sumLabel}>Zwischensumme (netto)</Text><Text style={s.sumVal}>{euro(net)}</Text></View>
              <View style={s.sumRow}><Text style={s.sumLabel}>zzgl. 19% USt</Text><Text style={s.sumVal}>{euro(vat)}</Text></View>
              <View style={s.sumTotal}><Text style={s.sumTotalL}>Gesamt (brutto)</Text><Text style={s.sumTotalV}>{euro(gross)}</Text></View>
            </>
          ) : (
            <>
              <View style={s.sumRow}><Text style={s.sumLabel}>Provisionen gesamt</Text><Text style={s.sumVal}>{euro(net)}</Text></View>
              <View style={s.sumTotal}><Text style={s.sumTotalL}>Auszahlungsbetrag</Text><Text style={s.sumTotalV}>{euro(net)}</Text></View>
            </>
          )}
        </View>

        {/* Bank */}
        {(p.bankIban || p.bankName) && (
          <View style={s.bankCard}>
            <Icon name="creditcard" size={16} sw={1.7} />
            <View>
              <Text style={s.partyLabel}>AUSZAHLUNG AN</Text>
              <Text style={s.partyLine}>
                {[p.bankName, p.bankIban ? `IBAN: ${p.bankIban}` : null, p.bankBic ? `BIC: ${p.bankBic}` : null].filter(Boolean).join("   ·   ")}
              </Text>
            </View>
          </View>
        )}

        <Text style={s.note}>
          {withVat
            ? "Gutschrift mit USt-Ausweis: Die Provisionsbeträge verstehen sich netto zzgl. 19% Umsatzsteuer. Diese Abrechnung gilt als Gutschrift i.S.d. §14 Abs. 2 UStG; ein Widerspruch ist innerhalb der gesetzlichen Frist möglich."
            : "Kein Ausweis von Umsatzsteuer (Empfänger ohne USt-Pflicht / Kleinunternehmer gem. §19 UStG). Diese Abrechnung gilt als Gutschrift über die vereinbarte Vermittlungsprovision."}
        </Text>

        {/* Kontakt bei Rückfragen zur Abrechnung */}
        {co && (co.email || co.phone) && (
          <View style={s.contactCard}>
            <View style={s.sectionIcon}><Icon name="info" size={11} color={C.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.partyLabel}>FRAGEN ODER UNKLARHEITEN?</Text>
              <Text style={s.contactText}>
                Sollten Sie Fragen zu dieser Abrechnung haben, schreiben oder rufen Sie uns gerne an.
                Wir helfen Ihnen jederzeit weiter.
              </Text>
              {co.companyName ? <Text style={s.contactName}>{co.companyName}</Text> : null}
              <Text style={s.partyLine}>
                {[
                  co.email ? `E-Mail: ${co.email}` : null,
                  co.phone ? `Telefon: ${co.phone}` : null,
                  co.website || null,
                ].filter(Boolean).join("      ·      ")}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
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
