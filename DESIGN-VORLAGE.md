# Design-Vorlage — Neues Theme erstellen

So rufst du eine Design-Session auf:

> „Lies DESIGN-VORLAGE.md und erstelle ein neues Theme `<key>` für [Shop-Name].
> Design: [Bild / Screenshot / Beschreibung]. Hauptfarbe: [#Hex optional]."

## 0. Was ein Theme darf — und was nicht

Ein Theme **stylt nur Bestehendes um**: Hintergrund, Kartenfläche, Stempel-Look,
Belohnungs-Banner, Meilensteine. **Keine neuen Bereiche, keine neuen Felder.**
Struktur bleibt, nur die Optik wechselt. (Gleicher Körper, anderes Outfit — die
Stempelkarte ist der Körper.)

## 1. So läuft es (Registry)

- `app/me/themes/registry.tsx` → `THEMES`-Record + `getShopTheme(shop)`.
- Jedes Theme = eine Datei `app/me/themes/<key>.tsx` mit 4 Exports.
- Seiten: `const theme = getShopTheme(shop)` → `theme ? <theme.Card…/> : <Default…/>`.
- **Referenz: `app/me/themes/beatesGrill.tsx`** (NICHT vintage — existiert nicht).
- Keine `is[Theme]`-Booleans, keine 7 Seiten einzeln.

## 2. Drei Schritte

### Schritt 1 — Theme-Datei `app/me/themes/<key>.tsx`

`beatesGrill.tsx` als Vorlage. Oben Palette als Consts (dort `A/AD/AF/T/TB/BG/C/D`) —
**hier lebt die sichtbare Optik.** Dann vier Exports, Props aus `./registry`:

```ts
import type { ThemeCardProps, ThemeBannerProps, ThemeMilestonesProps } from "./registry";

export function <Key>Background() { /* fixed inset-0 z-[-1] pointer-events-none */ }
export function <Key>LoyaltyCard(p: ThemeCardProps) { /* Raster + Fortschritt + optional QR */ }
export function <Key>RewardBanner(p: ThemeBannerProps) { /* Belohnungs-Tiers */ }
export function <Key>MilestonesSection(p: ThemeMilestonesProps) { /* nur wenn milestonesEnabled */ }
```

Props (exakt aus `registry.tsx`):
- ThemeCardProps: `shopName, stampsRequired, currentStamps, animateIndex, onShowQR?, qrToken, hideQR?, rewardTiers?, accentColor?`
- ThemeBannerProps: `rewardText, stampsRequired, rewardTiers?`
- ThemeMilestonesProps: `milestones, totalStampsEver`

Karten-Logik **aus beatesGrill übernehmen, nicht neu erfinden:**
- aktive Tiers = `rewardTiers.filter(t => t.enabled)` sortiert, sonst `[{ stamps: stampsRequired, text: rewardText }]`
- `maxStamps` = höchstes aktives Tier
- Slot `i` gefüllt wenn `i < currentStamps`; Tier-Grenzen markieren

### Schritt 2 — In `registry.tsx` registrieren

```ts
import { <Key>Background, <Key>LoyaltyCard, <Key>RewardBanner, <Key>MilestonesSection } from "./<key>";

const THEMES: Record<string, ThemeConfig> = {
  // … bestehende
  "<key>": {
    colors: { /* Palette spiegeln — Hinweis unten */ },
    Background: <Key>Background,
    Card:       <Key>LoyaltyCard,
    Banner:     <Key>RewardBanner,
    Milestones: <Key>MilestonesSection,
  },
};
```

> Hinweis `colors`: Pflichtfeld für den Typ `ThemeConfig`, wird aber aktuell **nicht
> gerendert** (kein Code liest `theme.colors`). Optik kommt aus den Consts in der
> Theme-Datei. Trotzdem passend ausfüllen → bereit für später.

### Schritt 3 — Shop auf das Theme stellen

Admin-App oder `convex/seed.ts`:

```ts
theme: "<key>",
accentColor: "#……",
customDesignEnabled: true,
```

Bei seed: danach `npx convex deploy --yes`.

## 3. NICHT mehr nötig

- ❌ `is[Theme]`-Booleans · ❌ 7 Seiten einzeln · ❌ „3 Call-Sites" · ❌ `vintage.tsx`

## 4. Automatisch

- `getShopTheme` → `null` wenn Toggle aus → Default (Sternenhimmel + generische `LoyaltyCard`).
- No-Flash über `app/layout.tsx` + `globals.css`.

## 5. Theme-Abdeckung (wichtig fürs Testen)

| Seite | Theme? |
|---|---|
| `/me/shop/[slug]` (Kunde Detail) | ✅ |
| `/stamp/[qrToken]` | ✅ |
| `/betrieb/[slug]/scan` (Mitarbeiter) | ✅ |
| `/me/impressum/[slug]`, `/me/datenschutz/[slug]` | ✅ |
| `/join/[slug]` (Registrierung) | ❌ noch nicht |
| `/betrieb/[slug]` (Inhaber-Dashboard) | ❌ noch nicht |
| `/me` (Wallet-Übersicht) | ➖ bewusst Default (persönlich) |

## 6. Stempel-Icons

`scissors · coffee · pizza · dumbbell · flower · shopping · car · utensils · book · flame · star · bike · shirt · stamp`

## 7. Bestehende Themes

| Key | Stil | Datei |
|---|---|---|
| `beates-grill` | Grill, Glüh-Münzen, Flamme | `app/me/themes/beatesGrill.tsx` |

## 8. Checkliste

- [ ] `app/me/themes/<key>.tsx` — Consts oben, 4 Exports, Props aus registry, Logik aus beatesGrill
- [ ] `registry.tsx` — Import + `THEMES`-Eintrag (inkl. `colors`-Pflichtfeld)
- [ ] Shop: `theme` + `accentColor` + `customDesignEnabled`
- [ ] seed → `npx convex deploy --yes`
- [ ] Toggle an → Theme auf `/me/shop` + `/stamp` + `/scan`; Toggle aus → Default, kein Leak
- [ ] `git push origin master`
