# Design-Vorlage — Neues Custom-Theme (Stand: 2026-06-22)

Sag Claude in einer neuen Session:
> „Lies DESIGN-VORLAGE.md und erstelle ein neues Theme für [Shop-Name]. Design: [Beschreibung / Bild]"

---

## 1. Was du Claude mitgibst

**Pflicht:**
- Shop-Name + Slug (muss bereits in der DB existieren)
- Design-Input: Bild / Screenshot / Moodboard **oder** Kurzbeschreibung (Stil, Farben)

**Optional:**
- Hauptfarbe als Hex (z. B. `#0066FF`) — sonst leitet Claude sie aus dem Design ab
- Basis-Theme als Referenz: „wie vintage, aber grün"

---

## 2. Schritt-für-Schritt was Claude ändert

### Schritt 1 — Shop in DB updaten

In `convex/seed.ts` oder via Admin-App:
```ts
theme: "modern",          // Name des neuen Themes (z. B. "modern", "neon", "clean")
accentColor: "#0066FF",   // Hauptfarbe
customDesignEnabled: true,
```

Danach: `npx convex deploy --yes`

### Schritt 2 — Theme-Datei erstellen

`app/me/themes/[theme].tsx` — Vorlage: `app/me/themes/vintage.tsx`

**Muss exportieren:**
```ts
export function [Theme]Background() { ... }
// → fixed inset-0 z-[-1] pointer-events-none (Hintergrundbild/-effekt)

export function [Theme]LoyaltyCard({
  shopName, stampsRequired, currentStamps, animateIndex,
  onShowQR, qrToken, hideQR,
  rewardTiers,   // Array<{stamps, text, enabled}> | undefined
  accentColor,   // Hex-String
}) { ... }
// → totalSlots = max(rewardTiers.stamps) wenn Tiers aktiv, sonst stampsRequired
// → Tier-Grenzen mit Trophy-Icon markieren

export function [Theme]RewardBanner({
  rewardText, stampsRequired, rewardTiers, accentColor,
}) { ... }

export function [Theme]MilestonesSection({   // nur wenn milestonesEnabled
  milestones, totalStampsEver,
}) { ... }
```

### Schritt 3 — 7 Seiten updaten

In **jeder** Seite (vor allen Early Returns, nach den useQuery-Hooks):

```ts
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";
useShopThemeSync(shop);

const is[Theme] = !!shop.customDesignEnabled && shop.theme === "[theme]";
```

**Seiten:**

| Datei | Was sich ändert |
|---|---|
| `app/me/shop/[shopSlug]/page.tsx` | Background, LoyaltyCard, RewardBanner |
| `app/stamp/[qrToken]/page.tsx` | Background, Card-Preview, rewardTiers-Prop |
| `app/betrieb/[shopSlug]/scan/page.tsx` | Background, Dashboard-Karten, Scanner |
| `app/betrieb/[shopSlug]/page.tsx` | Background, Inhaber-Dashboard |
| `app/join/[shopSlug]/page.tsx` | Background, Inputs, Buttons, Texte |
| `app/me/impressum/[shopSlug]/page.tsx` | Background, Textfarben |
| `app/me/datenschutz/[shopSlug]/page.tsx` | Background, Textfarben |

**Wrapper-Pattern (alle 7 Seiten):**
```tsx
<div className={`min-h-screen ... ${is[Theme] ? "relative z-[2]" : ""}`}>
  {is[Theme] && <[Theme]Background />}
  ...
</div>
```

**rewardTiers-Prop an LoyaltyCard (3 Call-Sites):**
```tsx
// app/me/shop/[shopSlug]/page.tsx
<[Theme]LoyaltyCard ... rewardTiers={shop.rewardTiers} accentColor={shop.accentColor} />

// app/stamp/[qrToken]/page.tsx
<[Theme]LoyaltyCard ... rewardTiers={shop.rewardTiers as ...} accentColor={shop.accentColor} />

// app/betrieb/[shopSlug]/scan/page.tsx
<[Theme]LoyaltyCard ... rewardTiers={shop.rewardTiers} accentColor={shop.accentColor} />
```

### Schritt 4 — Deploy + Push

```bash
git add .
git commit -m "feat: Theme [name] für [Shop]"
git push origin master
# Convex nur wenn convex/ geändert:
npx convex deploy --yes
```

---

## 3. Was automatisch funktioniert (kein Anpassen nötig)

- **No-Flash**: `app/layout.tsx` inline-script + `globals.css` → StarField versteckt sich sofort
- **useShopThemeSync**: generischer Hook, kein Anpassen
- **Toggle**: Admin-App → "Eigenes Design" EIN/AUS → sofort auf allen Seiten

---

## 4. Bestehende Themes

| Theme | Stil | accentColor default | Datei |
|---|---|---|---|
| `vintage` | Leder, Gold, Bronze-Münzen | `#C49A2A` | `app/me/themes/vintage.tsx` |

---

## 5. Verfügbare Stempel-Icons

`scissors` · `coffee` · `pizza` · `dumbbell` · `flower` · `shopping` · `car` · `utensils` · `book` · `flame` · `star` · `bike` · `shirt` · `stamp`

---

## 6. Checkliste für Claude

**Backend:**
- [ ] `theme` + `accentColor` in DB setzen
- [ ] `npx convex deploy --yes`

**Frontend:**
- [ ] `app/me/themes/[theme].tsx` erstellen (Background, LoyaltyCard, RewardBanner, MilestonesSection)
- [ ] `useShopThemeSync` + `is[Theme]` in alle 7 Seiten
- [ ] Wrapper `relative z-[2]` + Background in alle 7 Seiten
- [ ] `rewardTiers` + `accentColor` an LoyaltyCard in 3 Call-Sites
- [ ] Styling (Inputs, Buttons, Texte) in alle 7 Seiten

**Deploy:**
- [ ] `git push origin master`

**Test:**
- [ ] Toggle EIN → Theme auf allen Seiten, kein Flash beim Laden
- [ ] Toggle AUS → Default (Sternenhimmel), kein Design-Leak
- [ ] Bonus-Toggle AUS → nur Basis-Tier auf Karte
- [ ] `/join/[slug]` → Registrierung im Theme
- [ ] `/me/shop/[slug]` → Stempelkarte korrekt
- [ ] `/betrieb/[slug]/scan` → Scanner + Dashboard im Theme
- [ ] `/betrieb/[slug]` → Inhaber-App im Theme
