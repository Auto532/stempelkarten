"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChevronRight, Palette, QrCode, Store, type LucideIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { makeConfigTheme, normalizeDecor, type ShopDesignConfig } from "@/app/me/themes/configTheme";
import { STAMP_ICONS, ICON_CATEGORIES } from "@/app/me/components";
import { errMsg } from "@/app/lib/errMsg";

// ─── DesignEditor (Config-Design, 99€-Produkt) ────────────────────────────────
// Baut das Kunden-Design aus DB-Daten zusammen: Farben, Hintergrund, Logo,
// Stempel-Icon, Kartenstil — mit Live-Vorschau. Kein Code/Deploy pro Shop.

// Farbpalette: gedeckte Töne quer durch alle Farbbereiche. Ein Klick leitet
// daraus ein komplettes, dezentes Farbschema ab (Karte, Hintergrund, Texte) —
// keine benannten Vorlagen mehr, nur Farbton wählen + Feinschliff darunter.
// Gedeckte, aber farbige Grundtöne ("Juwelentöne"): bunt, jedoch weder grell
// noch hell. Nach Farbspektrum sortiert (warm → grün → blau → lila → neutral).
const COLOR_PALETTE = [
  "#a94f3d", "#8c5a4a", "#b06a47", "#8c6239", "#a8862e", "#b5923a", "#99772f", "#6b7539",
  "#5d7a3a", "#4a7a52", "#3a7a63", "#357d75", "#3a6b7d", "#3f6b8c", "#4a5a8c", "#5f5088",
  "#6b4a7d", "#7d4a6b", "#8c4463", "#8f3f4e", "#9c4a4a", "#7a6b5f", "#5f6b6b", "#8a7d6b",
];

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const to = (t: number) => Math.round(hue2rgb(p, q, t) * 255).toString(16).padStart(2, "0");
  return `#${to(h + 1 / 3)}${to(h)}${to(h - 1 / 3)}`;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, max === 0 ? 0 : d / max, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h * 6) % 6;
    const c = v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

// Leitet aus einem Palettenton ein stimmiges, gedecktes Schema ab. Sättigung
// wird gedeckelt, damit auch kräftige Töne dezent bleiben; im Hell-Modus wird
// die Akzentfarbe bei Bedarf abgedunkelt (Kontrast auf hellem Grund).
function deriveScheme(base: string, mode: "dark" | "light") {
  const [h, s, l] = hexToHsl(base);
  const sat = Math.min(s, 0.45);
  if (mode === "dark") {
    return {
      accent:   base,
      text:     hslToHex(h, sat * 0.35, 0.92),
      textBody: hslToHex(h, sat * 0.3, 0.62),
      cardBg:   hslToHex(h, sat * 0.5, 0.09),
      bgColor:  hslToHex(h, sat * 0.5, 0.05),
      bgColor2: hslToHex(h, sat * 0.5, 0.11),
    };
  }
  return {
    accent:   l > 0.55 ? hslToHex(h, Math.min(s + 0.08, 0.5), 0.42) : base,
    text:     hslToHex(h, sat * 0.7, 0.16),
    textBody: hslToHex(h, sat * 0.45, 0.4),
    cardBg:   hslToHex(h, sat * 0.5, 0.975),
    bgColor:  hslToHex(h, sat * 0.55, 0.94),
    bgColor2: hslToHex(h, sat * 0.6, 0.88),
  };
}

// Gruppiert die Editor-Bereiche optisch (Übersichtlichkeit)
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-3 space-y-2">
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">{title}</p>
      {children}
    </div>
  );
}

// Aufklappbarer Editor-Abschnitt: bündelt mehrere Sektionen, damit nicht alles
// gleichzeitig offen ist (übersichtlicher, gerade für Einsteiger).
function EditorGroup({ title, icon: Icon, isOpen, onToggle, children }: {
  title: string; icon: LucideIcon; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div>
      <button type="button" onClick={onToggle}
        className="w-full px-1 py-2 flex items-center gap-2 text-left">
        <Icon size={14} className="text-amber-400 shrink-0" />
        <span className="text-xs font-bold text-zinc-200 uppercase tracking-wide">{title}</span>
        <ChevronRight size={14} className={`ml-auto text-zinc-600 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>
      {isOpen && <div className="space-y-3 pt-1">{children}</div>}
    </div>
  );
}

// Auswahlfarben für die Farbfelder: gedeckte Töne + Neutral-/Hell-/Dunkeltöne
// (für Text- und Flächenfarben), Stil wie die Akzentfarben-Auswahl in /me.
const FIELD_COLORS = [
  ...COLOR_PALETTE,
  "#f4f4f5", "#f0e9db", "#d4d4d8", "#a1a1aa", "#71717a", "#3f3f46", "#18181b", "#0b0b0d",
];

// Benutzerdefinierte Farbwahl: großes Sättigungs-/Helligkeitsfeld + Farbton-
// Leiste zum Tippen/Ziehen — ersetzt den nativen Browser-Picker.
function CustomColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(value));
  // Extern gesetzte Farbe (z.B. Swatch-Klick) übernehmen; eigene Updates
  // erzeugen denselben Hex und lösen dadurch kein Zurücksetzen aus.
  useEffect(() => {
    if (hsvToHex(hsv[0], hsv[1], hsv[2]).toLowerCase() !== value.toLowerCase()) setHsv(hexToHsv(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const [h, s, v] = hsv;
  const apply = (next: [number, number, number]) => { setHsv(next); onChange(hsvToHex(next[0], next[1], next[2])); };

  const pickSV = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    const y = Math.min(Math.max((e.clientY - r.top) / r.height, 0), 1);
    apply([h, x, 1 - y]);
  };
  const pickHue = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    apply([Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1), s, v]);
  };
  const drag = (fn: (e: React.PointerEvent<HTMLDivElement>) => void) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); fn(e); },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => { if (e.buttons) fn(e); },
  });

  return (
    <div className="space-y-2">
      <div className="relative h-28 rounded-xl border border-zinc-700 cursor-crosshair touch-none"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${Math.round(h * 360)},100%,50%))` }}
        {...drag(pickSV)}>
        <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: value }} />
      </div>
      <div className="relative h-3.5 rounded-full border border-zinc-700 cursor-pointer touch-none"
        style={{ background: `linear-gradient(90deg, ${[0, 60, 120, 180, 240, 300, 360].map(d => `hsl(${d},70%,55%)`).join(",")})` }}
        {...drag(pickHue)}>
        <div className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${h * 100}%`, background: `hsl(${Math.round(h * 360)},70%,55%)` }} />
      </div>
    </div>
  );
}

// Farbfeld wie im /me-Bereich: aufklappbares Swatch-Grid + Benutzerdefiniert.
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const sel = value.toLowerCase();
  return (
    <div className="bg-zinc-800/50 rounded-xl">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="min-w-0 text-left">
          <p className="text-[11px] text-zinc-400 truncate">{label}</p>
          <p className="text-[9px] font-mono text-zinc-600">{value}</p>
        </div>
        <span className="w-7 h-7 shrink-0 rounded-lg border"
          style={{ background: value, borderColor: open ? "#a1a1aa" : "#3f3f46" }} />
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          <div className="grid grid-cols-8 gap-1.5">
            {FIELD_COLORS.map(c => (
              <button key={c} type="button" onClick={() => onChange(c)}
                className="aspect-square rounded-lg transition-transform hover:scale-110"
                style={{
                  background: c,
                  border: sel === c ? "2px solid #fff" : "2px solid rgba(0,0,0,.35)",
                  boxShadow: sel === c ? "0 0 8px rgba(255,255,255,.25)" : undefined,
                }} />
            ))}
          </div>
          <button type="button" onClick={() => setCustom(c => !c)}
            className="w-full py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-[10px] font-semibold text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors">
            Benutzerdefiniert {custom ? "▴" : "▾"}
          </button>
          {custom && <CustomColorPicker value={value} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

// Hellen/weißen (auch karierten) Rand-Hintergrund eines Logos clientseitig
// entfernen: Flood-Fill von den Ecken, damit nur das zusammenhängende Emblem
// bleibt. Innen liegende Bildteile werden nicht angetastet. Gibt das Original
// zurück, wenn kein klarer heller Rand erkannt wird (z.B. schon transparent).
async function removeLogoBackground(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h || w * h > 6_000_000) return file; // zu groß → unverändert
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;

    const isBg = (x: number, y: number) => {
      const p = (y * w + x) * 4;
      if (d[p + 3] < 40) return true;                    // schon transparent
      const r = d[p], g = d[p + 1], b = d[p + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      return (mx - mn) < 36 && mn > 125;                 // hell + grau = Hintergrund
    };

    const corners: [number, number][] = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]];
    if (corners.filter(([x, y]) => isBg(x, y)).length < 3) return file; // kein heller Rand

    const visited = new Uint8Array(w * h);
    const stack: number[] = [];
    for (const [x, y] of corners) if (isBg(x, y)) stack.push(x, y);
    while (stack.length) {
      const y = stack.pop()!, x = stack.pop()!;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const vi = y * w + x;
      if (visited[vi] || !isBg(x, y)) continue;
      visited[vi] = 1;
      d[vi * 4 + 3] = 0;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    ctx.putImageData(image, 0, 0);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
    return blob ?? file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function DesignEditor({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const generateUploadUrl = useMutation(api.shops.adminGenerateUploadUrl);
  const setDesignConfig   = useMutation(api.shops.adminSetDesignConfig);

  const dc = shop.designConfig;
  const [open, setOpen] = useState(!!dc);

  // Farben
  const [accent, setAccent]     = useState(dc?.accent   ?? shop.accentColor ?? "#fbbf24");
  const [text, setText]         = useState(dc?.text     ?? "#f4f4f5");
  const [textBody, setTextBody] = useState(dc?.textBody ?? "#a1a1aa");
  const [cardBg, setCardBg]     = useState(dc?.cardBg   ?? "#18181b");
  // Hintergrund
  const [bgType, setBgType]     = useState<"color" | "gradient" | "image">(dc?.bgType ?? "color");
  const [bgColor, setBgColor]   = useState(dc?.bgColor  ?? "#09090b");
  const [bgColor2, setBgColor2] = useState(dc?.bgColor2 ?? "#1c1917");
  const [bgImageId, setBgImageId]     = useState<Id<"_storage"> | undefined>(dc?.bgImageId);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | undefined>(dc?.bgImageUrl);
  // Logo
  const [logoId, setLogoId]           = useState<Id<"_storage"> | undefined>(dc?.logoId);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | undefined>(dc?.logoUrl);
  const [logoShowName, setLogoShowName] = useState(dc?.logoShowName ?? false);
  const [logoWidth, setLogoWidth]     = useState(dc?.logoWidth ?? 80);
  const [tagline, setTagline]         = useState(dc?.tagline ?? "");
  const [qrStyle, setQrStyle]         = useState<"button" | "icon" | "both">(dc?.qrStyle ?? "button");
  // Aufklappbare Editor-Gruppen (Akkordeon: nur eine offen)
  const [openGroup, setOpenGroup]     = useState<"farben" | "logo" | "extras" | null>("farben");
  const toggleGroup = (g: "farben" | "logo" | "extras") => setOpenGroup(cur => (cur === g ? null : g));
  // Stempel & Stil
  const [icon, setIcon]           = useState(dc?.stampIcon ?? shop.stampIcon ?? "stamp");
  const [stampShape, setStampShape] = useState(dc?.stampShape ?? "circle");
  // Stempel-Umrandung: eigene Farbe (leer = Akzentfarbe) + Stärke
  const [stampBorderColor, setStampBorderColor] = useState<string>(dc?.stampBorderColor ?? "");
  const [stampBorderStyle, setStampBorderStyle] = useState<"thin" | "bold">(dc?.stampBorderStyle ?? "thin");
  const [decor, setDecor]         = useState<"none" | "thin" | "double" | "swirl" | "bracket" | "dots" | "ornate">(normalizeDecor(dc?.decor));
  // Farbpalette: gewählter Grundton + Hell/Dunkel für das abgeleitete Schema
  const [paletteSel, setPaletteSel]   = useState<string | null>(null);
  const [paletteMode, setPaletteMode] = useState<"dark" | "light">("dark");

  const applyPalette = (base: string, mode: "dark" | "light" = paletteMode) => {
    const s = deriveScheme(base, mode);
    setPaletteSel(base);
    setAccent(s.accent); setText(s.text); setTextBody(s.textBody); setCardBg(s.cardBg);
    setBgType("gradient"); setBgColor(s.bgColor); setBgColor2(s.bgColor2);
  };

  const [uploading, setUploading] = useState<"logo" | "bg" | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [err, setErr]             = useState("");

  const uploadFile = async (body: Blob, contentType: string): Promise<Id<"_storage">> => {
    const url = await generateUploadUrl({ adminSecret });
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": contentType }, body });
    if (!res.ok) throw new Error("Upload fehlgeschlagen");
    const { storageId } = await res.json();
    return storageId as Id<"_storage">;
  };

  const handleUpload = (kind: "logo" | "bg") => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(kind); setErr("");
    try {
      if (kind === "logo") {
        // Weißen/karierten Rand automatisch entfernen, dann als PNG hochladen
        const processed = await removeLogoBackground(file);
        const id = await uploadFile(processed, "image/png");
        setLogoId(id); setLogoPreviewUrl(URL.createObjectURL(processed));
      } else {
        const id = await uploadFile(file, file.type);
        setBgImageId(id); setBgPreviewUrl(URL.createObjectURL(file)); setBgType("image");
      }
    } catch (ex: unknown) {
      setErr(errMsg(ex, "Upload fehlgeschlagen"));
    } finally { setUploading(null); e.target.value = ""; }
  };

  // Live-Vorschau: dieselbe Komponente, die auch die Kunden sehen
  const previewCfg: ShopDesignConfig = useMemo(() => ({
    accent, text, textBody, cardBg, bgType, bgColor, bgColor2,
    bgImageUrl: bgPreviewUrl, logoUrl: logoPreviewUrl, logoShowName, logoWidth, tagline: tagline.trim() || undefined,
    qrStyle, stampIcon: icon, stampShape,
    stampBorderColor: stampBorderColor || undefined, stampBorderStyle, decor,
  }), [accent, text, textBody, cardBg, bgType, bgColor, bgColor2, bgPreviewUrl, logoPreviewUrl, logoShowName, logoWidth, tagline, qrStyle, icon, stampShape, stampBorderColor, stampBorderStyle, decor]);
  const previewTheme = useMemo(() => makeConfigTheme(previewCfg), [previewCfg]);

  const previewBg: React.CSSProperties = bgType === "image" && bgPreviewUrl
    ? { backgroundImage: `url('${bgPreviewUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }
    : bgType === "gradient"
      ? { background: `linear-gradient(180deg, ${bgColor} 0%, ${bgColor2} 100%)` }
      : { background: bgColor };

  const handleSave = async () => {
    setSaving(true); setErr(""); setSaved(false);
    try {
      await setDesignConfig({
        shopId: shop._id, adminSecret,
        config: {
          accent, text, textBody, cardBg, bgType,
          bgColor, bgColor2, bgImageId, logoId, logoShowName, logoWidth,
          tagline: tagline.trim() || undefined,
          qrStyle, stampIcon: icon, stampShape,
          stampBorderColor: stampBorderColor || undefined, stampBorderStyle, decor,
        },
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (ex: unknown) {
      setErr(errMsg(ex, "Fehler beim Speichern"));
    } finally { setSaving(false); }
  };

  const handleRemove = async () => {
    if (!window.confirm("Eigenes Design entfernen? Der Shop nutzt dann wieder den Standard-Look.")) return;
    setSaving(true); setErr("");
    try { await setDesignConfig({ shopId: shop._id, adminSecret, config: null }); }
    catch (ex: unknown) { setErr(errMsg(ex, "Fehler")); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left">
        <Palette size={14} className={dc ? "text-amber-400" : "text-zinc-500"} />
        <span className="text-sm font-semibold text-zinc-200">Design-Editor</span>
        {dc && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400">aktiv</span>}
        <ChevronRight size={14} className={`ml-auto text-zinc-600 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800 pt-4">
          {shop.theme && (
            <p className="text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/25 rounded-lg px-2.5 py-2">
              Signature-Theme „{shop.theme}" ist aktiv und überdeckt den Editor. Beim Speichern hier wird es automatisch ersetzt.
            </p>
          )}

          {/* Vorschau immer oben sichtbar, damit Änderungen sofort zu sehen sind */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Vorschau (so sieht es der Kunde)</p>
            <div className="rounded-2xl p-4 space-y-3 border border-zinc-800" style={previewBg}>
              <previewTheme.Card
                shopName={shop.name}
                stampsRequired={shop.stampsRequired}
                currentStamps={Math.min(4, shop.stampsRequired)}
                animateIndex={null}
                qrToken="preview"
                onShowQR={() => {}}
                rewardTiers={shop.bonusProgramEnabled ? shop.rewardTiers : undefined}
                stampValue={shop.stampValue}
                cardNumber={1}
              />
              <previewTheme.Banner
                rewardText={shop.rewardText}
                stampsRequired={shop.stampsRequired}
                rewardTiers={shop.bonusProgramEnabled ? shop.rewardTiers : undefined}
              />
            </div>
          </div>

          <EditorGroup title="Farben & Hintergrund" icon={Palette} isOpen={openGroup === "farben"} onToggle={() => toggleGroup("farben")}>
          {/* Farbpalette: Ton anklicken → komplettes dezentes Schema */}
          <Section title="Farbpalette (Ton wählen, setzt das ganze Schema)">
            <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
              {([
                { id: "dark",  label: "Dunkel" },
                { id: "light", label: "Hell"   },
              ] as const).map(m => (
                <button key={m.id} type="button"
                  onClick={() => { setPaletteMode(m.id); if (paletteSel) applyPalette(paletteSel, m.id); }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={paletteMode === m.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
                  {m.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {COLOR_PALETTE.map(c => (
                <button key={c} type="button" onClick={() => applyPalette(c)}
                  className="aspect-square rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    border: paletteSel === c ? "2px solid #fff" : "2px solid rgba(0,0,0,.35)",
                    boxShadow: paletteSel === c ? `0 0 8px ${c}88` : undefined,
                  }} />
              ))}
            </div>
          </Section>

          {/* Farben (Feinschliff) */}
          <Section title="Farben (Feinschliff)">
            <ColorField label="Akzentfarbe"  value={accent}   onChange={setAccent} />
            <ColorField label="Überschrift"  value={text}     onChange={setText} />
            <ColorField label="Text"         value={textBody} onChange={setTextBody} />
            <ColorField label="Kartenfläche" value={cardBg}   onChange={setCardBg} />
          </Section>

          {/* Hintergrund */}
          <Section title="Hintergrund">
            <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
              {([
                { id: "color",    label: "Farbe"   },
                { id: "gradient", label: "Verlauf" },
                { id: "image",    label: "Foto"    },
              ] as const).map(t => (
                <button key={t.id} type="button" onClick={() => setBgType(t.id)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={bgType === t.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
                  {t.label}
                </button>
              ))}
            </div>
            {bgType !== "image" && (
              <>
                <ColorField label={bgType === "gradient" ? "Farbe oben" : "Hintergrundfarbe"} value={bgColor} onChange={setBgColor} />
                {bgType === "gradient" && <ColorField label="Farbe unten" value={bgColor2} onChange={setBgColor2} />}
              </>
            )}
            {bgType === "image" && (
              <label className="block">
                <span className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-700 transition-colors">
                  {uploading === "bg" ? "Lädt hoch…" : bgPreviewUrl ? "Hintergrundfoto ändern" : "Hintergrundfoto hochladen"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload("bg")} disabled={uploading !== null} />
              </label>
            )}
          </Section>
          </EditorGroup>

          <EditorGroup title="Logo & Stempel-Symbol" icon={Store} isOpen={openGroup === "logo"} onToggle={() => toggleGroup("logo")}>
          {/* Logo, Zusatz-Text & Stempel-Symbol */}
          <Section title="Logo, Text & Symbol">
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer hover:bg-zinc-700 transition-colors">
                  {uploading === "logo" ? "Verarbeite…" : logoPreviewUrl ? "Logo ändern" : "Logo hochladen (statt Shopname)"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload("logo")} disabled={uploading !== null} />
              </label>
              {logoPreviewUrl && (
                <button type="button" onClick={() => { setLogoId(undefined); setLogoPreviewUrl(undefined); }}
                  className="px-2.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 text-xs transition-colors">✕</button>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 px-1">
              Weißer/karierter Hintergrund wird automatisch entfernt. Am besten trotzdem ein PNG mit transparentem Hintergrund verwenden.
            </p>
            {logoPreviewUrl && (
              <button type="button" onClick={() => setLogoShowName(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 transition-colors">
                <span className={`w-8 h-5 rounded-full shrink-0 flex items-center transition-colors ${logoShowName ? "bg-amber-400" : "bg-zinc-600"}`}>
                  <span className={`w-4 h-4 rounded-full bg-white transition-transform ${logoShowName ? "translate-x-3.5" : "translate-x-0.5"}`} />
                </span>
                Shopname zusätzlich unter dem Logo anzeigen
              </button>
            )}
            {logoPreviewUrl && (
              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-zinc-400">Logo-Größe (Breite)</label>
                  <span className="text-[11px] text-zinc-500 tabular-nums">{logoWidth}%</span>
                </div>
                <input type="range" min={40} max={100} step={5} value={logoWidth}
                  onChange={e => setLogoWidth(Number(e.target.value))}
                  className="w-full accent-amber-400" />
              </div>
            )}
            <input value={tagline} onChange={e => setTagline(e.target.value)} maxLength={60}
              placeholder="Kleiner Text unter Logo/Name (optional), z.B. Ladenname oder Slogan"
              className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600" />
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {ICON_CATEGORIES.map(cat => (
                <div key={cat.label}>
                  <p className="text-[9px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">{cat.label}</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {cat.keys.map(key => {
                      const IconComp = STAMP_ICONS[key];
                      if (!IconComp) return null;
                      return (
                        <button key={key} type="button" onClick={() => setIcon(key)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                          style={icon === key
                            ? { background: `${accent}22`, border: `1px solid ${accent}66` }
                            : { background: "#27272a", border: "1px solid #3f3f46" }}>
                          <IconComp size={15} style={{ color: icon === key ? accent : "#71717a" }} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>
          </EditorGroup>

          <EditorGroup title="Form & Extras" icon={QrCode} isOpen={openGroup === "extras"} onToggle={() => toggleGroup("extras")}>
          {/* QR-Code-Darstellung */}
          <Section title="QR-Code">
            <div className="flex gap-1.5 p-1 bg-zinc-800/60 rounded-xl">
              {([
                { id: "button", label: "Button unten" },
                { id: "icon",   label: "Klein oben"   },
                { id: "both",   label: "Beide"        },
              ] as const).map(s => (
                <button key={s.id} type="button" onClick={() => setQrStyle(s.id)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={qrStyle === s.id ? { background: "#fbbf24", color: "#18181b" } : { color: "#71717a" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Stempel-Form */}
          <Section title="Stempel-Form">
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { id: "circle",  label: "Kreis"   },
                { id: "square",  label: "Eckig"   },
                { id: "diamond", label: "Raute"   },
                { id: "hex",     label: "Wabe"    },
                { id: "octagon", label: "Achteck" },
                { id: "star",    label: "Stern"   },
                { id: "shield",  label: "Schild"  },
              ] as const).map(s => (
                <button key={s.id} type="button" onClick={() => setStampShape(s.id)}
                  className="py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={stampShape === s.id ? { background: "#fbbf24", color: "#18181b" } : { background: "#27272a", color: "#71717a" }}>
                  {s.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Stempel-Umrandung: Stärke + eigene Farbe */}
          <Section title="Stempel-Umrandung">
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {([
                { id: "thin", label: "Fein" },
                { id: "bold", label: "Fett" },
              ] as const).map(s => (
                <button key={s.id} type="button" onClick={() => setStampBorderStyle(s.id)}
                  className="py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={stampBorderStyle === s.id ? { background: "#fbbf24", color: "#18181b" } : { background: "#27272a", color: "#71717a" }}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => setStampBorderColor("")}
                className="py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={!stampBorderColor ? { background: "#fbbf24", color: "#18181b" } : { background: "#27272a", color: "#71717a" }}>
                Akzentfarbe
              </button>
              <button type="button" onClick={() => setStampBorderColor(c => c || accent)}
                className="py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={stampBorderColor ? { background: "#fbbf24", color: "#18181b" } : { background: "#27272a", color: "#71717a" }}>
                Eigene Farbe
              </button>
            </div>
            {stampBorderColor && (
              <div className="mt-1.5">
                <ColorField label="Umrandungsfarbe" value={stampBorderColor} onChange={setStampBorderColor} />
              </div>
            )}
          </Section>

          {/* Ecken-Verzierung in Akzentfarbe */}
          <Section title="Ecken">
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { id: "none",    label: "Ohne"        },
                { id: "thin",    label: "Fein"        },
                { id: "double",  label: "Doppelt"     },
                { id: "swirl",   label: "Geschwungen" },
                { id: "bracket", label: "Fläche"      },
                { id: "dots",    label: "Punkte"      },
                { id: "ornate",  label: "Verziert"    },
              ] as const).map(d => (
                <button key={d.id} type="button" onClick={() => setDecor(d.id)}
                  className="py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                  style={decor === d.id ? { background: "#fbbf24", color: "#18181b" } : { background: "#27272a", color: "#71717a" }}>
                  {d.label}
                </button>
              ))}
            </div>
          </Section>
          </EditorGroup>

          {err && <p className="text-red-400 text-xs">{err}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={handleSave} disabled={saving || uploading !== null}
              className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 text-sm font-semibold rounded-xl transition-colors">
              {saving ? "Speichert…" : saved ? "Gespeichert ✓" : "Design speichern"}
            </button>
            {dc && (
              <button type="button" onClick={handleRemove} disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-red-400 text-sm transition-colors disabled:opacity-50">
                Entfernen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
