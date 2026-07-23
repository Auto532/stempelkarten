"use client";

import React from "react";
import {
  Document, Page, View, Text, Image, Svg, Path, Circle, Rect, Line, StyleSheet,
} from "@react-pdf/renderer";

// ── Farben (Loyaltycard hell/gold — druck- und finanzamttauglich) ─────────────
// Weißer Grund statt schwarz: professioneller und tintenschonend beim Ausdruck.
export const C = {
  bg:      "#ffffff",  // Seite weiß
  card:    "#faf8f2",  // sehr helle Karte (leichter Creme-Ton)
  cardBd:  "#e7e1d3",  // heller goldstichiger Rand
  gold:    "#B58A2E",  // dunkleres Gold für Kontrast auf Weiß
  goldDim: "#9a7a34",  // gedämpftes Gold für Kleintext
  white:   "#1b1b1f",  // Haupttextfarbe (jetzt dunkel — Feldname bleibt aus Kompatibilität)
  gray:    "#6b6b73",  // Sekundärtext
  barBg:   "#ece7db",  // heller Balken-Hintergrund
  green:   "#1f8a4c",  // Positivwerte (Umsatz)
  red:     "#c0392b",  // Negativwerte (Provisionen/Abzüge)
  ink:     "#1b1b1f",  // dunkle Tinte für Icons auf Goldflächen
};

export type ReportData = {
  shopName: string;
  periodLabel: string;
  dateStr: string;
  stamps: number;
  redeems: number;
  customerCount: number;
  rewards: { text: string; count: number; value: string | null }[];
  customers: { name: string; stamps: number; redeems: number; currentStamps: number; required: number }[];
  progress: { cur: number; req: number; remaining: number };
  contract?: {
    plan: string;
    price: string;
    paid: boolean;
    statusLabel: string;
    firstPaidAt: string | null;
    nextRenewalAt: string | null;
  } | null;
  // Anbieter-Kontakt für die Fußzeile (Rückfragen des Kunden), aus dem Firmenprofil
  company?: {
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    website?: string | null;
  } | null;
};

// ── Lucide-Icons als SVG (stroke-basiert wie im Web) ──────────────────────────
export function Icon({ name, size = 14, color = C.gold, sw = 2 }: { name: string; size?: number; color?: string; sw?: number }) {
  const common = { stroke: color, strokeWidth: sw, fill: "none" as const };
  const parts: Record<string, React.ReactNode> = {
    gift: (<>
      <Rect x="3" y="8" width="18" height="4" rx="1" {...common} />
      <Path d="M12 8v13" {...common} />
      <Path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" {...common} />
      <Path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" {...common} />
    </>),
    award: (<>
      <Path d="M15.477 12.89 16.99 21.4a.5.5 0 0 1-.81.47l-3.58-2.68a1 1 0 0 0-1.2 0l-3.58 2.68a.5.5 0 0 1-.81-.47l1.51-8.52" {...common} />
      <Circle cx="12" cy="8" r="6" {...common} />
    </>),
    users: (<>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...common} />
      <Circle cx="9" cy="7" r="4" {...common} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" {...common} />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" {...common} />
    </>),
    trophy: (<>
      <Path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" {...common} />
      <Path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" {...common} />
      <Path d="M4 22h16" {...common} />
      <Path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" {...common} />
      <Path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" {...common} />
      <Path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" {...common} />
    </>),
    star: (<Path d="M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.68a2 2 0 0 0 1.6 1.16l5.16.75a.5.5 0 0 1 .3.9l-3.73 3.64a2 2 0 0 0-.61 1.88l.88 5.14a.5.5 0 0 1-.77.56l-4.62-2.43a2 2 0 0 0-1.97 0L6.4 21.01a.5.5 0 0 1-.77-.56l.88-5.14a2 2 0 0 0-.61-1.88L2.16 9.8a.5.5 0 0 1 .3-.9l5.16-.76a2 2 0 0 0 1.6-1.16z" {...common} />),
    globe: (<>
      <Circle cx="12" cy="12" r="10" {...common} />
      <Path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" {...common} />
      <Line x1="2" y1="12" x2="22" y2="12" {...common} />
    </>),
    calendar: (<>
      <Path d="M8 2v4" {...common} />
      <Path d="M16 2v4" {...common} />
      <Rect x="3" y="4" width="18" height="18" rx="2" {...common} />
      <Line x1="3" y1="10" x2="21" y2="10" {...common} />
    </>),
    info: (<>
      <Circle cx="12" cy="12" r="10" {...common} />
      <Line x1="12" y1="16" x2="12" y2="12" {...common} />
      <Line x1="12" y1="8" x2="12.01" y2="8" {...common} />
    </>),
    creditcard: (<>
      <Rect x="2" y="5" width="20" height="14" rx="2" {...common} />
      <Line x1="2" y1="10" x2="22" y2="10" {...common} />
    </>),
    wallet: (<>
      <Path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" {...common} />
      <Path d="M16 12h.01" {...common} />
    </>),
    building: (<>
      <Rect x="4" y="2" width="16" height="20" rx="2" {...common} />
      <Path d="M9 22v-4h6v4" {...common} />
      <Line x1="8" y1="6" x2="8" y2="6.01" {...common} />
      <Line x1="16" y1="6" x2="16" y2="6.01" {...common} />
      <Line x1="8" y1="10" x2="8" y2="10.01" {...common} />
      <Line x1="16" y1="10" x2="16" y2="10.01" {...common} />
      <Line x1="8" y1="14" x2="8" y2="14.01" {...common} />
      <Line x1="16" y1="14" x2="16" y2="14.01" {...common} />
    </>),
    receipt: (<>
      <Path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" {...common} />
      <Path d="M8 7h8" {...common} />
      <Path d="M8 11h8" {...common} />
      <Path d="M8 15h5" {...common} />
    </>),
    coins: (<>
      <Circle cx="8" cy="8" r="6" {...common} />
      <Path d="M18.09 10.37A6 6 0 1 1 10.34 18" {...common} />
      <Path d="M7 6h1v4" {...common} />
      <Path d="m16.71 13.88.7.71-2.82 2.82" {...common} />
    </>),
    percent: (<>
      <Line x1="19" y1="5" x2="5" y2="19" {...common} />
      <Circle cx="6.5" cy="6.5" r="2.5" {...common} />
      <Circle cx="17.5" cy="17.5" r="2.5" {...common} />
    </>),
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24">{parts[name]}</Svg>;
}

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, padding: 18, fontFamily: "Helvetica", color: C.white },
  frame: { flex: 1, borderWidth: 1, borderColor: C.gold, borderRadius: 10, padding: 18 },
  // Header
  headRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 7 },
  brandTxt: { fontSize: 17, fontFamily: "Helvetica-Bold" },
  info: { flexDirection: "row", alignItems: "center", gap: 5 },
  infoTxt: { fontSize: 11, color: C.gray },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14 },
  titleBar: { width: 3, height: 15, backgroundColor: C.gold, borderRadius: 2 },
  title: { fontSize: 12.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.4 },
  subtitle: { fontSize: 8.5, color: C.gray, marginTop: 3 },
  shopName: { fontSize: 8.5, color: C.gold, fontFamily: "Helvetica-Bold" },
  // Stat cards
  statRow: { flexDirection: "row", gap: 8, marginTop: 13 },
  statCard: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  statCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.4, borderColor: C.gold, alignItems: "center", justifyContent: "center" },
  statVal: { fontSize: 22, fontFamily: "Helvetica-Bold" },
  statL1: { fontSize: 6.5, color: C.gray, fontFamily: "Helvetica-Bold", marginTop: 4, letterSpacing: 0.3 },
  statL2: { fontSize: 6, color: C.goldDim, marginTop: 1 },
  underline: { width: 20, height: 2, backgroundColor: C.gold, borderRadius: 1, marginTop: 4 },
  // Section
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 13, marginBottom: 6 },
  sectionIcon: { width: 18, height: 18, borderRadius: 4, backgroundColor: C.gold, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.gold, letterSpacing: 0.4 },
  // Table
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.cardBd, paddingBottom: 5 },
  thTxt: { fontSize: 8, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: C.cardBd, paddingVertical: 4.5 },
  tdName: { fontSize: 9.5, color: C.white, flex: 1 },
  td: { fontSize: 9.5, color: C.gray, textAlign: "right" },
  tdGold: { fontSize: 9.5, color: C.gold, textAlign: "right" },
  // Progress
  progCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 12, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  progMid: { flex: 1 },
  progVal: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.gold, marginBottom: 4 },
  bar: { height: 4, backgroundColor: C.barBg, borderRadius: 2 },
  barFill: { height: 4, backgroundColor: C.gold, borderRadius: 2 },
  progRight: { flexDirection: "row", alignItems: "center", gap: 6, width: 150, justifyContent: "flex-end" },
  // Vertrag
  contractCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 12, flexDirection: "row", alignItems: "flex-start" },
  badge: { fontSize: 8, fontFamily: "Helvetica-Bold", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  // Info-Box (Erklärung für den Kunden)
  infoBox: { flexDirection: "row", gap: 9, alignItems: "flex-start", backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 11, marginTop: 14 },
  infoBadge: { width: 18, height: 18, borderRadius: 4, backgroundColor: C.gold, alignItems: "center", justifyContent: "center", marginTop: 1 },
  infoTitle: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: C.white },
  infoText: { fontSize: 8, color: C.gray, marginTop: 3, lineHeight: 1.5 },
  // Kontakt-Karte
  contactCard: { flexDirection: "row", gap: 9, alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBd, borderRadius: 8, padding: 11, marginTop: 8 },
  contactName: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.white },
  contactLine: { fontSize: 8, color: C.gray, marginTop: 2 },
  // Footer
  footInfo: { flexDirection: "row", gap: 30, marginTop: 12 },
  footCol: { flexDirection: "row", alignItems: "center", gap: 7 },
  footLabel: { fontSize: 7, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 0.3 },
  footVal: { fontSize: 8, color: C.gray, marginTop: 2 },
  footBar: { marginTop: "auto", borderTopWidth: 1, borderTopColor: C.gold, paddingTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});

// Marken-Kopf: LC-Zeichen (freigestellt) + Schriftzug "Loyalty"(dunkel)"card"(gold)
// als echter Text daneben, vertikal mittig. Wird in allen PDF-Köpfen genutzt.
const MARK_RATIO = 515 / 473; // Seitenverhältnis von logo-mark.png
export function Brand({ markSrc = "/logo-mark.png", height = 40 }: { markSrc?: string; height?: number }) {
  // Zeichen links verankert, Schriftzug über die volle Breite mittig.
  return (
    <View style={{ position: "relative", width: "100%", height, justifyContent: "center", alignItems: "center" }}>
      <Image src={markSrc} style={{ position: "absolute", left: 0, top: 0, width: height * MARK_RATIO, height }} />
      <Text style={{ fontSize: height * 0.56, fontFamily: "Helvetica-Bold" }}>
        <Text style={{ color: C.white }}>Loyalty</Text>
        <Text style={{ color: C.gold }}>card</Text>
      </Text>
    </View>
  );
}

function StatCard({ icon, value, l1, l2 }: { icon: string; value: string; l1: string; l2: string }) {
  return (
    <View style={s.statCard}>
      <View style={s.statCircle}><Icon name={icon} size={15} /></View>
      <View>
        <Text style={s.statVal}>{value}</Text>
        <Text style={s.statL1}>{l1}</Text>
        <Text style={s.statL2}>{l2}</Text>
        <View style={s.underline} />
      </View>
    </View>
  );
}

export function LoyaltyReport({ data, logoSrc = "/logo-dunkel.png" }: { data: ReportData; logoSrc?: string }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.frame}>
          {/* Header */}
          <View style={s.headRow}>
            <Brand />
          </View>

          <View style={s.titleRow}>
            <View style={s.titleBar} />
            <Text style={s.title}>KUNDENÜBERSICHT / LOYALTY-BERICHT</Text>
          </View>
          <Text style={s.subtitle}>
            <Text style={s.shopName}>{data.shopName}</Text>
            <Text>{"  ·  Professionelle Übersicht für Ihre digitale Kundenbindung."}</Text>
          </Text>

          {/* Stat-Karten */}
          <View style={s.statRow}>
            <StatCard icon="gift"  value={String(data.stamps)}        l1="VERGEBENE PUNKTE" l2="/ Treuepunkte" />
            <StatCard icon="award" value={String(data.redeems)}       l1="BELOHNUNGEN"      l2="eingelöst" />
            <StatCard icon="users" value={String(data.customerCount)} l1="AKTIVE"           l2="Kunden" />
          </View>

          {/* Belohnungen */}
          {data.rewards.length > 0 && (
            <>
              <View style={s.sectionHead}>
                <View style={s.sectionIcon}><Icon name="gift" size={11} color={C.ink} /></View>
                <Text style={s.sectionTitle}>BELOHNUNGEN</Text>
              </View>
              <View style={s.th}>
                <Text style={[s.thTxt, { flex: 1 }]}>BELOHNUNG</Text>
                <Text style={[s.thTxt, { width: 70, textAlign: "right" }]}>ANZAHL</Text>
                {data.rewards.some(r => r.value) && <Text style={[s.thTxt, { width: 70, textAlign: "right" }]}>WERT</Text>}
              </View>
              {data.rewards.map((r, i) => (
                <View style={s.tr} key={i}>
                  <Text style={s.tdName}>{r.text}</Text>
                  <Text style={[s.td, { width: 70 }]}>{r.count}</Text>
                  {data.rewards.some(x => x.value) && <Text style={[s.tdGold, { width: 70 }]}>{r.value ?? "–"}</Text>}
                </View>
              ))}
            </>
          )}

          {/* Kunden */}
          <View style={s.sectionHead}>
            <View style={s.sectionIcon}><Icon name="users" size={11} color={C.ink} /></View>
            <Text style={s.sectionTitle}>KUNDEN IM ZEITRAUM</Text>
          </View>
          <View style={s.th}>
            <Text style={[s.thTxt, { flex: 1 }]}>NAME</Text>
            <Text style={[s.thTxt, { width: 90, textAlign: "right" }]}>PUNKTE</Text>
            <Text style={[s.thTxt, { width: 90, textAlign: "right" }]}>EINGELÖST</Text>
          </View>
          {data.customers.map((c, i) => (
            <View style={s.tr} key={i}>
              <Text style={s.tdName}>{c.name}</Text>
              <Text style={[s.td, { width: 90 }]}>{c.stamps}</Text>
              <Text style={[s.td, { width: 90 }]}>{c.redeems > 0 ? c.redeems : "–"}</Text>
            </View>
          ))}

          {/* Vertrag & Zahlung */}
          {data.contract && (
            <>
              <View style={s.sectionHead}>
                <View style={s.sectionIcon}><Icon name="creditcard" size={11} color={C.ink} /></View>
                <Text style={s.sectionTitle}>VERTRAG & ZAHLUNG</Text>
              </View>
              <View style={s.contractCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold" }}>{data.contract.plan}</Text>
                  <Text style={{ fontSize: 8.5, color: C.gray, marginTop: 3 }}>{data.contract.price}</Text>
                  {data.contract.firstPaidAt && (
                    <Text style={{ fontSize: 8, color: C.gray, marginTop: 6 }}>Abgeschlossen am {data.contract.firstPaidAt}</Text>
                  )}
                  {data.contract.nextRenewalAt && (
                    <Text style={{ fontSize: 8, color: C.gray, marginTop: 2 }}>Verlängerung: {data.contract.nextRenewalAt}</Text>
                  )}
                </View>
                <Text style={[s.badge, data.contract.paid
                  ? { backgroundColor: "#e4f5ea", color: C.green }
                  : { backgroundColor: "#f7edcf", color: C.goldDim }]}>
                  {data.contract.statusLabel}
                </Text>
              </View>
            </>
          )}

          {/* Info-Box: kurze Erklärung für den Kunden */}
          <View style={s.infoBox}>
            <View style={s.infoBadge}><Icon name="gift" size={11} color={C.ink} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.infoTitle}>Ihre digitale Stempelkarte</Text>
              <Text style={s.infoText}>
                Bei jedem Besuch sammeln Sie Stempel und sichern sich Ihre Belohnungen. Diese Übersicht fasst Ihren
                aktuellen Punktestand und Ihre eingelösten Prämien zusammen und wird laufend aktualisiert.
              </Text>
            </View>
          </View>

          {/* Berichtszeitraum */}
          <View style={s.footInfo}>
            <View style={s.footCol}>
              <Icon name="calendar" size={16} sw={1.7} />
              <View>
                <Text style={s.footLabel}>BERICHTSZEITRAUM</Text>
                <Text style={s.footVal}>{data.periodLabel}  ·  {data.dateStr}</Text>
              </View>
            </View>
          </View>

          {/* Kontakt-Karte (Anbieter, für Rückfragen) */}
          {data.company && (data.company.email || data.company.phone) && (
            <View style={s.contactCard}>
              <View style={s.infoBadge}><Icon name="info" size={11} color={C.ink} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.footLabel}>FRAGEN? WIR HELFEN GERN</Text>
                {data.company.companyName ? <Text style={s.contactName}>{data.company.companyName}</Text> : null}
                <Text style={s.contactLine}>
                  {[data.company.email, data.company.phone].filter(Boolean).join("      ·      ")}
                </Text>
              </View>
            </View>
          )}

          {/* Footer-Bar */}
          <View style={s.footBar}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
              <Image src={logoSrc} style={{ width: 30, height: 22 }} />
              <Text style={{ fontSize: 8, color: C.gray }}>
                loyaltycard.info{data.company?.website ? `  ·  ${data.company.website}` : ""}
              </Text>
            </View>
            <Text style={{ fontSize: 8, color: C.gray }}>Seite 1 / 1</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
