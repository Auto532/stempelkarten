# Stempelkarten-App — Projektkontext

## Was ist das?
Digitale Stempelkarten-SaaS für lokale Betriebe (Friseure, Shops etc.). Kunden scannen QR-Code → digitale Karte als PWA. Betriebe verwalten alles über ihr eigenes Dashboard.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Convex (Backend/Datenbank)
- PWA mit Service Worker

## Hauptrouten
- `/me` → Kunden-App (QR-Anzeige, Stempelkarten)
- `/me/[qrToken]` → Persönliche Kunden-URL
- `/betrieb/[shopSlug]` → Betrieb-Dashboard
- `/betrieb/[shopSlug]/scan` → QR-Scanner
- `/betrieb/login/[token]` → Betrieb-Login
- `/zk7-verwaltung-9x2` → Super-Admin

## Aktuelle Features
- Stempelkarte mit konfigurierbarer Stempelanzahl
- Bonus-Programm (mehrere Reward-Tiers, Paid Feature)
- Meilensteine (Treue-Belohnungen basierend auf Gesamtstempeln, Paid Feature)
- Per-Shop Akzentfarbe + Custom Design (Paid Feature)
- Impressum & AGB pro Shop
- Kunden-PWA installierbar von /me
- **Betrieb-PWA:** Dynamischer Manifest pro Shop → start_url direkt auf /betrieb/[shopSlug]. Mehrere Mitarbeiter können App auf eigenem Handy installieren (selber Login-Link).

## Wichtige Logik
- **Scan-Flow:** QR scannen → Kundenkarte anzeigen → Stempel/Einlösen
- **Bei voller Karte + Bonus aktiv:** Gelber Button "Stempel hinzufügen (Stufe 2)" oben, grauer Button "Belohnung einlösen" unten
- **Bei voller Karte + Bonus inaktiv:** Nur gelber "Belohnung einlösen", kein Überziehen möglich
- **Carry-over:** Nach Einlösen werden Überschuss-Stempel übernommen (z.B. 13 Stempel bei Schwelle 10 → startet mit 3 ins nächste Feld)
- **Meilensteine:** Nur im Betrieb-Dashboard sichtbar wenn Admin-Toggle an

## Session / Auth
- Kunden: `qrToken` in localStorage (gesetzt via /me/[qrToken])
- Betrieb: `adminToken` + `adminShopSlug` in localStorage (gesetzt via /betrieb/login/[token])

## Pricing-Idee
- Basic: 15–25€/Monat
- Pro: 40–60€/Monat (Bonus, Design, Meilensteine)
- Premium: 80–120€/Monat
