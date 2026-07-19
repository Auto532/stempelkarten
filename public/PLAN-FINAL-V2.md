# Stempelkarten-App — Finaler Plan V2 (Pilot-Launch-Härtung)

> Konsolidiert aus dem vollständigen Code-Audit vom 28.06.2026.
> Diese Datei ersetzt `PLAN-FINAL.md`. Stack: Next.js (App Router) + Convex + PWA.
> Stand: 28.06.2026

---

## 0. Zielbild — unverändert

Aus *einer* Codebasis entstehen **vier eigenständige, installierbare PWAs**: Kunde,
Mitarbeiter, Inhaber (jeweils pro Shop) und Admin (global, du). Trennung über
eigene Routen + eigenes Manifest (eigener `scope`) + serverseitige Token-Prüfung.
Kundenkarte (`/me`) ist datengetrieben und pro Shop themable. Backend ist
durchgehend rollen-gegated.

Architektur bleibt wie sie ist — dieser Plan korrigiert nur Schwachstellen,
er ändert keine Prinzipien.

---

## 1. Bereits erledigt — NICHT erneut bauen

**Backend-Fundament (Track 1 alt):**
- ✅ `owners`-Tabelle + `ownerId` auf Shop (optional)
- ✅ `mitarbeiterToken` auf Shop + Index `by_mitarbeiterToken`
- ✅ `convex/auth.ts` mit `requireShopRole`, `requireAdmin`, `sanitizeShop`
- ✅ `adminSetFeatures` (Admin-only Upsell-Flags)
- ✅ `updateShopConfig` (Inhaber-Content statt 6 Mini-Toggles)
- ✅ `createShop` admin-gegated, generiert beide Tokens
- ✅ `resolveLoginToken` matcht Inhaber- und Mitarbeiter-Token

**Design (Track 2 alt):**
- ✅ Theme-Registry mit 5 fertigen Themes (`bakery`, `asia-taste`, `barber`, `beates-grill`, `eiszauber`)
- ✅ `LoyaltyCard` ist datengetrieben (variable Stempelzahl, dynamische Spaltenzahl, Tier-Marker)
- ✅ Shop-Detail-Route `app/me/shop/[shopSlug]/page.tsx` mit Theme + LevelCard
- ✅ Wallet-Übersicht mit Global-Level + ShopCards
- ✅ Personal-Accent + Hintergrund + Stars persistieren via localStorage

**App-Trennung (Track 3 alt):**
- ✅ Vier Manifest-Routen: `/me`, `/betrieb/[slug]`, `/betrieb/[slug]/scan`, `/zk7-verwaltung-9x2`
- ✅ `buildManifest` Helper mit `scope` + `id`
- ✅ Login-Resolver setzt `adminRole` in localStorage und routet zu `/scan` bzw. Dashboard

**Sonstiges:**
- ✅ Pending-Redemption (Kunde markiert, Mitarbeiter bestätigt)
- ✅ Kartenwiederherstellung manuell über Inhaber-Dashboard via Telefonnummer

---

## 2. Ausführungsreihenfolge

- **Phase 1 — Security-Härtung & Show-Stopper:** vor erstem Pilotkunden Pflicht.
- **Phase 2 — Pilot-Qualität:** mit dem ersten Pilotkunden parallel.
- **Phase 3 — Skalierung:** wenn Volumen kommt.

---

## PHASE 1 — Security-Härtung & Show-Stopper (PFLICHT vor Pilot)

### K1. ADMIN_PIN nicht in localStorage persistieren

**Dateien:** `app/zk7-verwaltung-9x2/page.tsx:1668`, `app/stamp/[qrToken]/page.tsx:69`.

Aktuell: PIN wandert nach erstem Login per `localStorage.setItem("adminPin", pin)`
auf das Gerät — auch auf Kundengeräten, wenn der PIN-Notmodus auf der Stamp-Page
genutzt wurde. Damit hat jeder Folge-Nutzer dieses Geräts Vollzugriff (clearAllData,
createShop, alle Upsell-Flags).

**Fix:**
- Admin-Route `/zk7-verwaltung-9x2`: PIN nur in `sessionStorage` halten. Tab-Close
  = neu eingeben. Auto-Login-Block entsprechend von `localStorage` auf
  `sessionStorage` umstellen.
- Stamp-Page `/stamp/[qrToken]`: PIN gar nicht persistieren, weder Local- noch
  SessionStorage. Bei jeder Nutzung neu eingeben (passiert ohnehin selten — nur
  Notfall-Modus).
- `clearAllData`-Aufruf in der "Logout/Clear"-Action ebenfalls `adminPin` aus
  SessionStorage räumen, nicht localStorage.

### K2. Mitarbeiter-Token darf nicht ins Inhaber-Dashboard

**Backend (`convex/shops.ts`):**
- `listCustomersForShop` (Z. 412): `role: "mitarbeiter"` → `role: "inhaber"`.
- `getShopAnalyticsByPeriod` (Z. 325): `role: "mitarbeiter"` → `role: "inhaber"`.
- `getRedemptionsForShop` in memberships.ts (Z. 322): bleibt `"mitarbeiter"` —
  Mitarbeiter braucht das für die Scan-Sicht. Begründung dokumentieren.

**Frontend (`app/betrieb/[shopSlug]/page.tsx:95-101`):**
```ts
useEffect(() => {
  const token = localStorage.getItem("adminToken");
  const slug = localStorage.getItem("adminShopSlug");
  const role = localStorage.getItem("adminRole");
  if (!token || slug !== shopSlug) { router.replace("/"); return; }
  if (role === "mitarbeiter") { router.replace(`/betrieb/${shopSlug}/scan`); return; }
  setAdminToken(token);
  setAuthorized(true);
}, [router, shopSlug]);
```

### K3. `listAllShops` nicht mit Klartext-Tokens

**Datei:** `convex/shops.ts:196-202`.

Liefert aktuell alle `adminLoginToken` und `mitarbeiterToken` aller Shops an
den Admin-Client. Browser-DevTools, History, Backups dieser Antwort halten die
Tokens. Auch wenn Admin der höchste Trust-Level ist: keine Bulk-Token-Belichtung.

**Fix:**
- `listAllShops` durch `sanitizeShop` schicken.
- Neue Query `getLoginLinksForShop({ shopId, adminSecret })` die *nur* die zwei
  Tokens zurückgibt. Im Admin-UI on-demand abrufen (z.B. erst beim Klick auf
  "QR-Code zeigen" oder "Link teilen"), nicht beim Listing.
- Wo der Admin-Frontend aktuell `shop.adminLoginToken` für `updateLegalTexts`
  und `getShopAnalyticsByPeriod` durchreicht: das war ein Impersonation-Trick.
  Stattdessen neue Admin-Mutationen anlegen oder die existierenden so erweitern,
  dass `adminSecret` als Alternative zum `inhaberToken` akzeptiert wird:
  - `adminUpdateLegalTexts({ shopId, adminSecret, … })`
  - `getShopAnalyticsByPeriodAsAdmin({ shopId, adminSecret, since })`

### K4. Telefonnummern-Normalisierung

**Neue Datei `convex/lib/phone.ts`:**

```ts
export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (!hasPlus) {
    if (digits.startsWith("00")) digits = digits.slice(2);
    else if (digits.startsWith("0")) digits = "49" + digits.slice(1);
  }
  return "+" + digits;
}
```

**Anwenden in `convex/customers.ts`:**
- `registerCustomer`: `phone` vor allen Lookups normalisieren.
- `findCustomerByPhone`: eingehende `phone` normalisieren vor `withIndex("by_phone")`.

**Migration einmal:**
```ts
export const migratePhones = internalMutation({
  args: {},
  handler: async (ctx) => {
    const customers = await ctx.db.query("customers").collect();
    let migrated = 0, conflicts = 0;
    for (const c of customers) {
      const normalized = normalizePhone(c.phone);
      if (!normalized || normalized === c.phone) continue;
      const existing = await ctx.db.query("customers")
        .withIndex("by_phone", q => q.eq("phone", normalized)).first();
      if (existing && existing._id !== c._id) { conflicts++; continue; }
      await ctx.db.patch(c._id, { phone: normalized });
      migrated++;
    }
    return { migrated, conflicts, total: customers.length };
  },
});
```
Ausführen: `npx convex run customers:migratePhones`. Konflikte erst manuell prüfen.

### K5. Icon-Pfade

Alle Referenzen zeigen auf `/Icon.png`, die Datei heißt `/icon.png`. Lokal egal
(macOS case-insensitive), Vercel/Linux = 404. Außerdem benutzen die Manifeste
für 192 und 512 dieselbe 688KB-Datei — `icon-192.png` und `icon-512.png` liegen
schon im public-Ordner und werden nicht genutzt.

**Sweep:**
```bash
find app lib public -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.json" \) \
  -exec sed -i 's|/Icon\.png|/icon-192.png|g' {} +
```

**Danach `lib/buildManifest.ts`:**
```ts
icons: [
  { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
],
```

Analog `public/manifest.json` anpassen. In den Layout-Metadata-`icons.icon`-
Einträgen reicht `/icon-192.png`.

### K6. `customerRedeemReward` löschen

**Datei:** `convex/memberships.ts:114-156`.

Toter Endpoint, der jedem mit gültigem `qrToken` erlaubt, eigene Stempel ohne
Belohnung zu verbrennen. Funktion komplett entfernen.

### K7. DSGVO-Pflichtfelder erzwingen

**Frontend:**
- `app/join/[shopSlug]/page.tsx`: wenn `shop.impressumText` oder
  `shop.datenschutzText` leer ist, Registrierung deaktivieren mit klarer
  Meldung "Dieser Shop ist noch nicht vollständig eingerichtet". Nicht "Links
  optional verstecken und trotzdem registrieren lassen" — das ist Verstoß.
- Consent-Text: Datenschutz-Link inline ins Consent-Label setzen ("…
  gespeichert und gemäß <a>Datenschutzerklärung</a> genutzt werden").

**Backend (`convex/schema.ts` — `memberships`):**
- Optional-Feld ergänzen: `consentedAt: v.optional(v.number())`.

**Backend (`registerCustomer` und `createMembershipForExistingCustomer`):**
- `consentedAt: Date.now()` beim Insert mitgeben.

### K8. Service Worker

`public/sw.js` registriert sich, hat `fetch`-Handler ohne sinnvolle Funktion
(Cache wird nie befüllt). Entweder echtes Pre-Caching der Shell, oder ganz weg.

**Empfehlung Pilot:** weg. SW-Datei löschen, Registrierung aus
`app/layout.tsx:55-57` entfernen. PWA-Installierbarkeit funktioniert auch ohne
SW über das Manifest. Wenn iOS Add-to-Home-Screen funktioniert, ist Phase 1 OK.

---

## PHASE 1 — Akzeptanz

- [ ] ADMIN_PIN nicht in localStorage. Nach Tab-Close auf Admin-Route neu
      einloggen müssen. Stamp-Page fragt PIN bei jeder Nutzung neu.
- [ ] Mitarbeiter-Login-Link öffnet immer `/scan`, nie Dashboard. Backend
      verweigert `listCustomersForShop` und `getShopAnalyticsByPeriod` mit
      Mitarbeiter-Token.
- [ ] `listAllShops`-Response enthält keine Tokens mehr. Login-Links werden
      on-demand per `getLoginLinksForShop` geladen.
- [ ] `0170 12345`, `+49 170 12345`, `+491701234500` → konsistent eine Karte
      pro Person, `findCustomerByPhone` findet auch nach Migration alle.
- [ ] PWA installiert sich auf Android+iOS, Icon erscheint (kein Standard-Browser-
      Symbol), 192- und 512-Slots laden unterschiedliche Dateien.
- [ ] `customerRedeemReward` ist nicht mehr im Convex-API.
- [ ] Shop ohne Impressum/Datenschutz blockt die Join-Registrierung im UI.
      `memberships.consentedAt` ist nach Test-Registrierung gesetzt.
- [ ] Kein SW oder ein nicht-trivialer SW. Offline-Verhalten wie erwartet.

---

## PHASE 2 — Pilot-Qualität (mit erstem Pilotkunden parallel)

### P1. Inhaber editiert eigene Rechtstexte

`updateLegalTexts` existiert backend-seitig mit `role: "inhaber"`. UI im
Inhaber-Dashboard fehlt — derzeit nur über Admin-Panel. Skaliert nicht.

**Neue Sektion** im `app/betrieb/[shopSlug]/page.tsx` Dashboard:
View "rechtstexte" mit Editoren für `impressumText`, `agbText`,
`datenschutzText`. Speichert über die bestehende Mutation.

### P2. `updateShopConfig` patch-sicher

`convex/shops.ts:105-117`. Aktuell:
```ts
await ctx.db.patch(shopId, { accentColor, stampIcon, theme });
```
Wenn `theme` nicht übergeben wird, setzt das `theme` auf `undefined` —
gespeichertes Theme weg. Nur explizit übergebene Felder patchen:
```ts
const patch: Record<string, unknown> = {};
if (accentColor !== undefined) patch.accentColor = accentColor;
if (stampIcon !== undefined) patch.stampIcon = stampIcon;
if (theme !== undefined) patch.theme = theme;
await ctx.db.patch(shopId, patch);
```

Wenn Felder gezielt leeren auch möglich sein soll: `clearTheme: v.optional(v.boolean())`-Pattern aus
`adminSetFeatures` übernehmen.

### P3. `clearAllData` / `clearCustomerData` räumen `messages` mit

`convex/admin.ts:20, 55`. `messages` fehlt in beiden Listen → orphan-Records.
Tabelle in beide Cleanup-Funktionen aufnehmen.

### P4. `seed.ts` referenziert nicht existierendes Theme

`theme: "vintage"` → nicht in der Registry. Auf `"barber"` setzen (passender Look).

### P5. Print-Vorschau XSS-Surface entschärfen

`app/betrieb/[shopSlug]/page.tsx:25-37` und
`app/betrieb/[shopSlug]/scan/page.tsx:27-40`: Shop-Name via `document.write` in
Raw-HTML. Nur self-injectable, aber schlechte Praxis. Per
`document.createElement` + `textContent` aufbauen statt String-Konkatenation.

### P6. `getMessagesForShop`-Modell klären

`convex/messages.ts:35`: Aktuell `admin`-only. Soll der Inhaber Kundennachrichten
sehen können? Wenn ja → `requireShopRole inhaber` + UI im Dashboard. Wenn nein
(= Feedback an dich) → so lassen, aber an einer Stelle in der Doku festhalten.

---

## PHASE 2 — Akzeptanz

- [ ] Inhaber kann Impressum/AGB/Datenschutz im eigenen Dashboard editieren
      und speichern, Mutation gegated über `inhaberToken`.
- [ ] `updateShopConfig({ shopId, inhaberToken, accentColor: "#abc" })` lässt
      `theme` und `stampIcon` unverändert.
- [ ] `clearAllData`/`clearCustomerData` hinterlassen keine Orphan-Records in
      `messages`.
- [ ] Seed lässt sich ausführen, der Shop bekommt ein gültiges Theme.
- [ ] Print-Vorschau funktioniert mit Sonderzeichen im Shop-Namen, ohne dass
      HTML kaputt geht.
- [ ] Messages-Modell ist dokumentiert: wer liest, warum.

---

## PHASE 3 — Skalierung (nach Pilot, wenn Volumen kommt)

### S1. `showLeads` als echte Paywall

Aktuell: Backend liefert immer `phone`, Frontend versteckt es. Wenn das echt
Geld bringen soll, im Backend stripen — `listCustomersForShop` muss `phone:
shop.showLeads ? customer.phone : ""` zurückgeben. Damit DevTools-Inhaber nicht
am Paywall vorbei kommen.

### S2. `findCustomerByPhone` nutzt Index

`convex/customers.ts:8`: aktuell `.filter` über `adminLoginToken`. Mit
`withIndex("by_adminLoginToken", q => q.eq("adminLoginToken", adminToken))`
ersetzen. Ab ~100 Shops merkt man's.

### S3. `getGlobalStats` / `getGlobalAnalyticsByPeriod` aggregieren

Beide scannen aktuell ganze Tabellen via `.collect()`. Skaliert nicht ab ~50
Shops bzw. ~50k Stempel. Inkrementelle Aggregate-Tabelle einführen, in
`addStamp`/`redeemReward` mitschreiben.

### S4. Rate-Limits

Keine Limits auf `sendMessage`, `registerCustomer`,
`createMembershipForExistingCustomer`. Ein Kunde mit `qrToken` kann theoretisch
spammen. Convex hat kein eingebautes Rate-Limiting — entweder per Zeit-Stamp
auf Customer-Record (`lastActionAt`) oder eigene `rateLimits`-Tabelle.

### S5. `customers.phone` Unique-Constraint

Convex hat keinen nativen Unique-Index. Nach `K4`-Migration nochmal `customers`
nach doppelten normalisierten Nummern durchsuchen und Konflikte manuell mergen.

### S6. OTP-basierte Karten-Wiederherstellung

Aktuell: Inhaber sucht Kunde per Telefon, teilt `/me/<qrToken>`-Link.
Empfänger des Links ist Karteninhaber — keine zweite Verifikation. Für
in-person OK, für Remote nicht ideal.

Backlog-Idee: Self-Service-Flow `/recover` → Telefonnummer eingeben → SMS-OTP
→ qrToken setzen. Kostet einen SMS-Provider (~3-5 Cent/SMS), lohnt sich erst
ab N Shops.

---

## 4. Was unverändert bleibt (bewusste Designentscheidungen)

- **Kein E-Mail-Feld bei Registrierung.** Datensparsamkeit nach DSGVO Art. 5(1)c.
- **Telefonnummer als Identität, shop-übergreifend dedupliziert.** Eine Person =
  eine Wallet, mehrere Karten pro Shop unterstützt.
- **Recovery via Telefonnummer-Suche durch Inhaber.** Kein Self-Service mit OTP
  im Pilot — siehe S6.
- **`adminLoginToken` heißt nicht um.** Bricht `getByAdminToken` und
  Bestandsdaten.
- **Mitarbeiter-Link teilbar (WhatsApp), Inhaber-Link nicht.** Beide gehen
  durch denselben Resolver, unterscheiden sich nur am Token.
- **Admin steuert Upsell-Flags (`customDesignEnabled`, `bonusProgramEnabled`,
  `milestonesEnabled`, `showLeads`), Inhaber steuert Inhalt** (`accentColor`,
  `stampIcon`, `theme`, `rewardTiers`, `milestones`, Rechtstexte).
- **Übersicht zeigt Personal-Akzentfarbe, Detail-Ansicht zeigt Shop-Theme.**
  Damit die Liste nicht zum Flickenteppich wird.
- **Pending-Redemption ist zwei-stufig.** Kunde markiert, Mitarbeiter bestätigt
  am Tresen. Verhindert Self-Redeem.
- **Owner-Datensatz minimal.** Nur `name`, optional `email`/`phone`, kein
  Billing-Schema jetzt.

---

## 5. Backlog (nicht im Pilot)

- **Inhaber-Account + Login** (E-Mail/Passwort, Owner-Dashboard über mehrere
  Shops) — `ownerId` liegt schon bereit
- **Multi-Shop / Standorte** (ein Owner, mehrere Läden, Umschalter)
- **Push / Re-Engagement** (höchster Hebel)
- **Undo-Stempel**, **Geburtstags-Belohnung**, **Statistik im Inhaber-Dashboard**,
  **Zeit-Aktionen**, **Freunde werben**, **Geo-Fokus**, **Produkt-Verkauf**
- **Admin: Neukunden-Auswertung** aus `acquisitionType` aggregieren
- **Abrechnung / Stripe** (hängt an `owners`)
- **OTP-basiertes Self-Service-Recovery** (siehe S6)

---

## 6. Definition of Done — Pilot-Launch

- [ ] Alle K-Punkte aus Phase 1 abgehakt
- [ ] PWA installiert sich auf Android und iOS, Icon korrekt
- [ ] Ein Pilotkunde hat erfolgreich registriert, gestempelt, eingelöst und
      Karte wiederhergestellt
- [ ] Inhaber kann seine Rechtstexte selbst editieren
- [ ] DSGVO-Pflichten erfüllt: Impressum + Datenschutz vor Registrierung
      verlinkt, Consent + Timestamp gespeichert
- [ ] Mitarbeiter-Link in WhatsApp geteilt → funktioniert, gibt nur
      Scan-Berechtigung
- [ ] Admin kann neuen Shop anlegen ohne Tokens im Listing zu leaken
