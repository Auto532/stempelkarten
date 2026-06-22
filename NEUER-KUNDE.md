# Neuen Kunden anlegen — Vorlage

Sag Claude in einer neuen Session:
> „Lies NEUER-KUNDE.md und leg einen neuen Kunden an. Name: X, Slug: x, Design: [Bild / Beschreibung]"

---

## 1. Was du Claude mitgibst

**Pflicht:**
- Shop-Name (z. B. „Café Mitte")
- Slug (URL-Teil, z. B. `cafe-mitte`) — nur a–z, 0–9, Bindestriche
- Stempel bis Belohnung (z. B. 8)
- Belohnungstext (z. B. „1 Kaffee gratis")

**Design-Input (eines davon reicht):**
- Bild / Screenshot / Moodboard → Claude programmiert das nach
- Kurzbeschreibung: Stil + Hauptfarbe(n), z. B. „modern, blau-schwarz, klare Linien"
- Vorhandenes Theme als Basis: „wie vintage, aber grün"

**Optional:**
- Bonus-Stufen (z. B. 5× = kleines Getränk, 10× = Kuchen)
- Meilensteine (z. B. ab 50 Stempel Gesamt = VIP-Status)
- Impressum-Text
- Datenschutz-Text
- Stempel-Icon: `scissors`, `coffee`, `star`, `heart`, `zap`, `flame`, `crown`

---

## 2. Was Claude dann macht

### Schritt 1 — Convex Seed / Patch
Claude schreibt eine Migration oder patcht direkt in `convex/seed.ts`:

```ts
// Felder die gesetzt werden:
{
  name: "Café Mitte",
  slug: "cafe-mitte",
  stampsRequired: 8,
  rewardText: "1 Kaffee gratis",
  stampIcon: "coffee",
  theme: "modern",          // Name des Themes
  accentColor: "#0066FF",   // Hauptfarbe (Hex)
  customDesignEnabled: true, // oder false → dann per Toggle aktivieren
  rewardTiers: [            // optional, nur wenn Bonus-Stufen gewünscht
    { stamps: 5, text: "Kleines Getränk", enabled: true },
    { stamps: 10, text: "Stück Kuchen", enabled: true },
  ],
  milestones: [             // optional
    { stamps: 50, text: "VIP-Karte", enabled: true },
  ],
  impressumText: "...",     // optional
  datenschutzText: "...",   // optional
  adminLoginToken: crypto.randomUUID(),
  mitarbeiterToken: crypto.randomUUID(),
  createdAt: Date.now(),
}
```

### Schritt 2 — Theme-Datei anlegen
`app/me/themes/modern.tsx` (oder was auch immer das Theme heißt)

Muss exportieren:
```ts
export function ModernBackground() { ... }        // fixed inset-0 z-[-1]
export function ModernLoyaltyCard({ shopName, stampsRequired, currentStamps,
  animateIndex, onShowQR, qrToken, hideQR, accentColor }) { ... }
export function ModernRewardBanner({ rewardText, stampsRequired,
  rewardTiers, accentColor }) { ... }
export function ModernMilestonesSection({ milestones, totalStampsEver,
  accentColor }) { ... }  // optional
```

**Wichtig:** `accentColor` als Prop übergeben — so funktioniert dasselbe Theme
mit verschiedenen Farben für verschiedene Kunden.

### Schritt 3 — 6 Seiten updaten
In jeder dieser Dateien kommt dasselbe Muster:

```ts
const isModern = !!shop.customDesignEnabled && shop.theme === "modern";
```

Dann überall wo `isVintage` steht ein entsprechendes `isModern` daneben.

**Dateien:**
| Datei | Was sich ändert |
|---|---|
| `app/me/shop/[shopSlug]/page.tsx` | Wrapper `z-[2]`, Card + Banner wechsel |
| `app/stamp/[qrToken]/page.tsx` | Background, Card-Preview, Bestätigung |
| `app/betrieb/[shopSlug]/scan/page.tsx` | Dashboard-Karten, Scanner, Bestätigung |
| `app/join/[shopSlug]/page.tsx` | Background, Inputs, Buttons |
| `app/me/impressum/[shopSlug]/page.tsx` | Background, Textfarben |
| `app/me/datenschutz/[shopSlug]/page.tsx` | Background, Textfarben |

### Schritt 4 — Deploy
```bash
git add . && git commit -m "feat: Theme [modern] für [Café Mitte]"
git push origin master
npx convex deploy --yes   # nur wenn convex/ Dateien geändert wurden
```

---

## 3. Toggle-Mechanismus

```
customDesignEnabled = false  →  alles Default (Sternenhimmel, Zinc)
customDesignEnabled = true   →  Theme aktiv auf ALLEN Seiten
```

Toggle befindet sich in der Admin-App (`/zk7-verwaltung-9x2`).
Wenn Toggle eingeschaltet wird und kein Theme gesetzt ist → automatisch `"vintage"`.

**Zahlt Kunde nicht mehr:** Toggle AUS → sofort alles Default. Theme bleibt gespeichert
für Reaktivierung.

---

## 4. Bestehende Themes

| Theme-Name | Beschreibung | accentColor default |
|---|---|---|
| `vintage` | Leder-Optik, Gold, Bronze-Münzen, dunkles Braun | `#C49A2A` |

---

## 5. accentColor — gleicher Theme, andere Farbe

Gleicher Theme-Name reicht für verschiedene Farben:

```
theme="modern", accentColor="#0066FF"   → modern blau-schwarz
theme="modern", accentColor="#00CC88"   → modern grün-schwarz
theme="modern", accentColor="#FF4444"   → modern rot-schwarz
```

Nur wenn der Kunde strukturell etwas anderes will (andere Layout-Sprache,
andere Animations-Stil) → neuer Theme-Name.

---

## 6. Checkliste für Claude

- [ ] Shop-Dokument in Convex anlegen / patchen
- [ ] `app/me/themes/[theme].tsx` erstellen
- [ ] 6 Seiten mit `is[Theme]` Check updaten
- [ ] Wrapper `relative z-[2]` auf allen 6 Seiten wenn Theme aktiv
- [ ] `convex deploy --yes` ausführen
- [ ] `git push` ausführen
- [ ] Testen: Toggle EIN → Design sichtbar, Toggle AUS → Default
