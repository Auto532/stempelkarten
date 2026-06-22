# Stempelkarten-App — Großes Update (finale Claude-Code-Vorlage)

> Konsolidiert aus allen Planungen. Stack: Next.js (App Router) + Convex + PWA.
> Diese Datei ist die maßgebliche Vorlage; ältere Notizen sind überholt.
> Stand: 21.06.2026

---

## 0. Zielbild in einem Absatz

Aus *einer* Codebasis entstehen **vier eigenständige, installierbare PWAs** —
drei pro Shop (**Kunde**, **Mitarbeiter**, **Inhaber**) + eine globale **Admin-App** (Betreiber).
Getrennt werden sie durch eigene Route + eigenes Manifest (eigener `scope`) + serverseitige
Token-Prüfung. Gemeinsam ist nur der Code, nicht das Erlebnis. Parallel wird die Kundenkarte
(`/me`) datengetrieben + pro Shop gestaltbar, und das Backend von Grund auf abgesichert.

**Rollen-Matrix**

| App | Geltung | Darf | Darf nicht |
| --- | --- | --- | --- |
| Kunde | eine Wallet (shop-übergreifend) | Karte ansehen, QR zeigen | — |
| Mitarbeiter | pro Shop | stempeln (mit Animation), Belohnungen ansehen | Belohnungen/Settings ändern, Kundendaten sehen |
| Inhaber | pro Shop | Inhalt konfigurieren (Belohnungen, Farben, Texte), Kundenliste, stempeln | Features *freischalten* (= Upsell) |
| Admin (du) | global | Shops + Owner anlegen, Features freischalten, globale Stats | — |

---

## 1. Heute bereits erledigt — NICHT erneut bauen

- ✅ Join „Willkommen-zurück"-Flow (`app/join/[shopSlug]/page.tsx`)
- ✅ Listen-Toggle „letzte 10 / alle" (`listCustomersForShop` nimmt `limit`)
- ✅ Neukunden-Signal `acquisitionType` (optional, pro Mitgliedschaft)
- ✅ `getBySlug` strippt `adminLoginToken`
- ✅ `addStamp` / `redeemReward` prüfen `adminToken` serverseitig
- ✅ `clearAllData` nutzt `process.env.ADMIN_PIN` statt Hardcoded-PIN
- ✅ Datenschutz-Route pro Shop (`app/me/datenschutz/[shopSlug]`)

**Schon angefangen (drauf aufbauen, nicht neu):**
`app/me/shop/[shopSlug]/page.tsx` (fokussierte Shop-Karte), `app/me/themes/vintage.tsx`
(erstes Theme), `app/me/components.tsx` (geteilte UI). Schema-Felder `stampIcon` + `theme`
existieren bereits.

---

## 2. Ausführungsreihenfolge

- **Track 1 — Backend-Fundament (A+B):** Pflicht. Ohne das sind Kundendaten + Settings offen.
- **Track 2 — Design (2.1+2.2):** unabhängig, kann parallel/dazwischen.
- **Track 3 — App-Trennung (C/D/E):** hängt an Track 1. Politur — darf zur Not nach Pilotstart.

---

## TRACK 1 — Backend-Fundament

### A. Token-Modell + Owner-Datensatz — `convex/schema.ts`, `convex/shops.ts`

1. **`adminLoginToken` NICHT umbenennen** (bricht `getByAdminToken`, Login-Route,
   Bestandsdaten). Er bleibt der **Inhaber-Token**.
2. Schema `shops`: Feld `mitarbeiterToken: v.string()` + Index `by_mitarbeiterToken`.
3. Neue Tabelle `owners` (= B2B-Kundendatensatz des Betreibers, für spätere Systeme/Abrechnung):
   `name: v.string()`, `email`/`phone` optional, `createdAt: v.number()`.
   **Minimal halten** — kein plan-/billing-Feld jetzt, nur stabile ID.
4. Schema `shops`: `ownerId: v.id("owners")`.
5. `createShop` (shops.ts:114): Owner wählen oder neu anlegen + verknüpfen; zusätzlich
   `mitarbeiterToken: crypto.randomUUID()` erzeugen. **Admin-only** (siehe B).
6. Migration: `internalMutation` (Muster `seed.ts`), die Bestandsshops um
   `mitarbeiterToken` + `ownerId` (Dummy-Owner) nachrüstet.

### B. Zentrale Auth — neue Datei `convex/auth.ts`

Drei Helfer, von allen Endpoints genutzt (statt verstreuter `if (token !== …) throw`):
- `requireShopRole(ctx, { shopId, token, role })`
  - `inhaber` → `token === shop.adminLoginToken`
  - `mitarbeiter` → `token === shop.mitarbeiterToken` **oder** `=== shop.adminLoginToken`
- `requireAdmin(ctx, { secret })` → `secret === process.env.ADMIN_PIN`
- Hilfsfunktion `sanitizeShop(shop)` → entfernt `adminLoginToken` + `mitarbeiterToken`
  aus jedem Shop-Objekt, das an einen Client geht.

**Upsell-sicheres Rechte-Modell (wichtig):**
- **Freischalt-Flags** (= das Upsell, „nicht mehr basic") setzt **nur der Admin**:
  `customDesignEnabled`, `bonusProgramEnabled`, `milestonesEnabled`, `showLeads`.
- **Inhalt** der freigeschalteten Features konfiguriert der **Inhaber**:
  `accentColor`, `stampIcon`, `theme`, `rewardTiers`, `milestones`, Texte.

**Funktionen statt 6 Einzel-Toggles → 2 saubere Mutations:**
- `adminSetFeatures(shopId, adminSecret, { customDesignEnabled?, bonusProgramEnabled?, milestonesEnabled?, showLeads? })` → `requireAdmin`
- `updateShopConfig(shopId, inhaberToken, patch)` → `requireShopRole inhaber`
  (ersetzt `setShopColor`, `toggleCustomDesign`-Inhalt etc.; `updateSettings`,
  `updateMilestones`, `updateLegalTexts` darauf migrieren oder mit Guard versehen)

**Vollständiger Auth-Audit (jede Funktion → Rolle):**

| Funktion | Datei | aktuell | Soll |
| --- | --- | --- | --- |
| `addStamp` | memberships.ts:56 | nur `adminLoginToken` | **mitarbeiter\|inhaber** (Mitarbeiter-Token zulassen!) |
| `redeemReward` | memberships.ts:86 | nur `adminLoginToken` | **mitarbeiter\|inhaber** |
| `getRedemptionsForShop` | memberships.ts:113 | ❌ keine | inhaber |
| `listCustomersForShop` | shops.ts:157 | ❌ keine (PII!) | inhaber |
| `updateSettings` | shops.ts:35 | ✅ adminToken | inhaber (auf Guard) |
| `updateMilestones` | shops.ts:89 | ✅ adminToken | inhaber |
| `updateLegalTexts` | shops.ts:102 | ❌ keine | inhaber |
| `setShopColor` | shops.ts:68 | ❌ keine | inhaber |
| `toggleShowLeads` | shops.ts:54 | ❌ keine | **admin** (Freischaltung) |
| `toggleBonusProgram` | shops.ts:61 | ❌ keine | **admin** (Freischaltung) |
| `toggleCustomDesign` | shops.ts:75 | ❌ keine | **admin** (Freischaltung) |
| `toggleMilestones` | shops.ts:82 | ❌ keine | **admin** (Freischaltung) |
| `createShop` | shops.ts:114 | ❌ keine | **admin** |
| `listAllShops` | shops.ts:132 | ❌ keine + Token-Leak | **admin** + `sanitizeShop` |
| `getGlobalStats` | shops.ts:139 | ❌ keine + Token-Leak (`{ ...shop }`) | **admin** + `sanitizeShop` |

Öffentlich lassen (Kundenseite): `getBySlug` (✅ strippt), `getByAdminToken` (Login),
`getByQrToken`, `getMembershipsForCustomer`, `getForCustomerAndShop`, `registerCustomer`,
`createMembershipForExistingCustomer`.
→ **Prüfen:** `getById` (shops.ts:28) — falls es den Token zurückgibt, `sanitizeShop` anwenden.

**Akzeptanz Track 1:**
- [ ] Kein Endpoint gibt `adminLoginToken`/`mitarbeiterToken` an Clients.
- [ ] Mit Mitarbeiter-Token: stempeln ✅, Kundenliste/Settings → Fehler.
- [ ] Mit Inhaber-Token: alles am eigenen Shop ✅, Freischalt-Flags → Fehler.
- [ ] Ohne Admin-Secret: `createShop`/`listAllShops`/`getGlobalStats` → Fehler.

---

## TRACK 2 — Design / Kundenkarte

### 2.1 `/me` Übersicht → Detail
- **1 Karte** → direkt auf die Karte, keine Übersicht.
- **2+ Karten** → schlanke Übersicht: QR global oben, pro Shop eine Zeile
  (Logo/Monogramm · Mini-Fortschritt z.B. „7/10" · „Belohnung bereit"-Badge) → Tap → Detail.
- Detail-Ansicht auf bestehendem `app/me/shop/[shopSlug]/page.tsx` aufbauen.

### 2.2 Custom-Design pro Shop (datengetriebene `StampCard`)
**Eine geteilte Komponente `StampCard`**, genutzt in `/me` (Kunde) **und** im
Stempel-Screen (Mitarbeiter) → garantiert identisches Design. Der Stempel-Screen ist
praktisch die `/me`-Karte mit Tap-zum-Stempeln.

Anforderungen an `StampCard`:
- **Datengetrieben**: rendert *N* Slots aus der Config (10, 20, beliebig) — nicht hart auf 10.
  Bei 20 → z.B. 5 pro Reihe, 4 Reihen.
- **Bonus-Felder an Tier-Positionen**: Belohnungen aus `rewardTiers`/`milestones` (sind
  Arrays — kein Schema-Change nötig) als optisch abgesetzte Slots inline, z.B. bei 10 und 20.
- **Theme/Design pro Shop**: `accentColor`, `stampIcon` (Default `Scissors`, pro Shop wählbar),
  `theme` (auf `themes/vintage.tsx` aufbauen). Hintergrund: kuratierte Presets statt
  Freibild (damit nichts unleserlich wird).
- Design-Wirkung im **Detail** voll, in der **Übersicht** nur gebundene Slots
  (Logo + Akzentfarbe), damit die Liste nicht zum Flickenteppich wird.

**Free vs. Premium** (greift über die Admin-Freischalt-Flags aus B):
- Free: Default-Karte, Default-Akzent, Monogramm.
- Premium (`customDesignEnabled`): Logo + Farbe + Icon + Theme.

---

## TRACK 3 — App-Trennung (4 PWAs)

### C. Apps trennen — OHNE großes Route-Renaming
Trennung kommt aus Manifest + Token-Gate auf den **bestehenden** Routen (spart Churn):
- **Mitarbeiter-App** = vorhandene `/betrieb/[shopSlug]/scan` + eigenes Manifest +
  `mitarbeiterToken`-Gate. Nur stempeln + Belohnungen ansehen.
- **Inhaber-App** = vorhandenes `/betrieb/[shopSlug]` (Dashboard) + eigenes Manifest +
  `inhaberToken`-Gate.
- **Admin-App** = `/zk7-verwaltung-9x2` bleibt (Obscurity egal, da echte Auth) + eigenes Manifest.
- Überlappende Scopes (`/scan` unter `/betrieb/[slug]`) sind ok — eigenes Manifest = eigenes Icon/Install.
- Umbenennen auf `/team`/`/chef`/`/admin` = rein kosmetisch, **später**.
- Geteilte UI (`app/components/*`, `app/me/components.tsx`, `StampCard`) importieren, nicht duplizieren.

### D. Manifest-Fabrik — `lib/buildManifest.ts`
- Bestehende Route `app/betrieb/[shopSlug]/manifest.webmanifest/route.ts` als Vorlage in
  Helper `buildManifest({ name, shortName, startUrl, scope, theme, icon })` ziehen.
- **Aktuelles Manifest hat kein `scope`** → pro Rolle ergänzen (sonst kollidieren Installs).
- Je Rolle eine Route, eigene Config + Scope (`/me`, `/betrieb/[slug]`, `/betrieb/[slug]/scan`, `/zk7…`).
- Naming: zum Testen KUNDE / MITARBEITER / INHABER / ADMIN; Prod → „Stempelkarte" (nur `name`-String).

### E. Login — EIN Resolver
- Bestehende `app/betrieb/login/[token]/page.tsx` erweitern: eine Query `resolveLoginToken(token)`
  schlägt nach → matcht `adminLoginToken` ⇒ Rolle `inhaber` (→ Dashboard); matcht
  `mitarbeiterToken` ⇒ Rolle `mitarbeiter` (→ `/scan`). `{ role, token, shopSlug }` ablegen.
- Admin-Login: PIN → `admin.checkPin`, Secret in Session.
- **Mitarbeiter-Link teilbar** (WhatsApp, alle Mitarbeiter stempeln), Inhaber-/Admin-Zugang nicht.

---

## 3. Weitere Punkte

- **Karten-Wiederherstellung** (Gerätewechsel/Daten gelöscht): für den Pilot **manuell**
  über das Inhaber-Dashboard (Kundenliste, neu zuordnen). Self-Service mit OTP = später.
- **DSGVO:** Datenschutz-Route ✅. Pro-Shop-Consent im Join bleibt erhalten.

---

## 4. Code-Optimierungen (ehrlich, aus dem Bestand)

- **Auth-Copy-Paste → `requireRole`** — erledigt durch B. ✔ jetzt
- **6 Mini-Toggles → `adminSetFeatures` + `updateShopConfig`** — weniger Code, korrekt gegated. ✔ jetzt
- **Betrieb-Dashboard = 1 Datei mit ~730 Z. + komplettem State** (`betrieb/[shopSlug]/page.tsx`)
  → beim Inhaber-App-Umbau in Sektions-Komponenten zerlegen (Einstellungen / Belohnungen /
  Meilensteine / Kunden / Einlösungen). ✔ jetzt (wird eh angefasst)
- **`getGlobalStats` scannt ganze Tabellen** (`.collect()` + Schleife) → Pilot ok, skaliert
  nicht. ⏳ später (Zähler aggregieren)
- **`localStorage`-Token-Lesen wiederholt sich** → kleiner `useShopAuth()`-Hook. ⏳ später
- **N+1 in `listCustomersForShop`** (`.collect()` + `get` je Membership) → minor. ⏳ später

---

## 5. Backlog (nicht jetzt)

- **Inhaber-Account + Login** (E-Mail/Passwort, Owner-Dashboard über mehrere Shops) — `ownerId` liegt schon bereit
- **Multi-Shop / Standorte** (ein Inhaber, mehrere Läden, Umschalter)
- **Push / Re-Engagement** (höchster Hebel)
- **Undo-Stempel**, **Geburtstags-Belohnung**, **Statistiken fürs Dashboard**,
  **Zeit-Aktionen**, **Freunde werben**, **Geo-Fokus** (nur Foreground),
  **Produkt-/Shampoo-Verkauf** (bewusst spät)
- **Admin: Neukunden-Auswertung** (aus `acquisitionType` aggregieren)
- **Abrechnung/Stripe** (hängt an `owners`)

---

## 6. Definition of Done (Pilot-Launch-fähig)

- [ ] Track 1 komplett: kein Token-Leak, alle Endpoints gegated (Audit-Tabelle abgehakt).
- [ ] Kunde kann Karte sehen/installieren; Mitarbeiter kann per geteiltem Link stempeln
      (mit Animation, im `/me`-Design); Inhaber kann konfigurieren; Admin gesichert.
- [ ] `StampCard` rendert variable Stempelzahl + Bonus-Felder korrekt.
- [ ] Karten-Wiederherstellung manuell möglich.
