"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronRight, Eye, Image as ImageIcon, Moon, Palette, Stamp, Store, Sun, Upload, X, type LucideIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  makeConfigTheme, normalizeDecor, resolveColorMode, CornerOrnament, CLIP_SHAPES,
  type ShopDesignConfig,
} from "@/app/me/themes/configTheme";
import { STAMP_ICONS, ICON_CATEGORIES } from "@/app/me/components";
import { errMsg } from "@/app/lib/errMsg";

// ─── DesignEditor (Config-Design, im Abo enthalten) ────────────────────────────────
// Baut das Kunden-Design aus DB-Daten zusammen: Hell/Dunkel, vier Farben,
// Hintergrund (Farbe/Verlauf/Foto), Logo, Stempel-Symbol und Details — mit
// Live-Vorschau. Kein Code/Deploy pro Shop.

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

// Hell/Dunkel-Schema aus einer Akzentfarbe: Farbton bleibt, Sättigung wird
// gedeckelt (nichts knallt), Karte und Hintergrund nur leicht getönt.
// Wiederholtes Umschalten verändert den Farbton nicht.
function deriveScheme(base: string, mode: "dark" | "light") {
  const [h, s] = hexToHsl(base);
  if (mode === "dark") {
    return {
      accent:   hslToHex(h, Math.min(s, 0.32), 0.66),
      text:     hslToHex(h, 0.06, 0.93),
      textBody: hslToHex(h, 0.06, 0.68),
      cardBg:   hslToHex(h, 0.08, 0.11),
      bgColor:  hslToHex(h, 0.08, 0.06),
      bgColor2: hslToHex(h, 0.10, 0.12),
    };
  }
  return {
    accent:   hslToHex(h, Math.min(s, 0.38), 0.40),
    text:     hslToHex(h, 0.10, 0.14),
    textBody: hslToHex(h, 0.06, 0.40),
    cardBg:   hslToHex(h, 0.12, 0.985),
    bgColor:  hslToHex(h, 0.12, 0.95),
    bgColor2: hslToHex(h, 0.14, 0.90),
  };
}

// Auswahlfarben für die Farbfelder (8 pro Reihe): 16 Farbrichtungen in je
// zwei gedeckten Abstufungen, dazu warme und kühle Grautöne von fast Weiß
// bis fast Schwarz (für Texte und Flächen).
const GREY_STEPS = [0.97, 0.9, 0.8, 0.65, 0.5, 0.35, 0.2, 0.09];
const FIELD_COLORS = [
  ...Array.from({ length: 16 }, (_, i) => hslToHex(i / 16, 0.3, 0.58)),
  ...Array.from({ length: 16 }, (_, i) => hslToHex(i / 16, 0.26, 0.4)),
  ...GREY_STEPS.map(l => hslToHex(0.08, 0.08, l)),
  ...GREY_STEPS.map(l => hslToHex(0.6, 0.06, l)),
];

// Einstellungs-Block mit Titel (und optionalem Hinweis)
function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-2.5">
      <div className="px-0.5">
        <p className="text-xs font-semibold text-zinc-200">{title}</p>
        {hint && <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

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
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.07]">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full min-h-12 flex items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0 text-left">
          <p className="text-xs text-zinc-300 truncate">{label}</p>
          <p className="text-[10px] font-mono text-zinc-600">{value}</p>
        </div>
        <span className="w-8 h-8 shrink-0 rounded-lg border"
          style={{ background: value, borderColor: open ? "#a1a1aa" : "rgba(255,255,255,.12)" }} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
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
            className="w-full min-h-9 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
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

// ─── Bildoptimierung (clientseitig, vor dem Upload) ───────────────────────────
// Ziel: kleine WebP-Dateien für schnelle mobile Ladezeiten und wenig Convex-
// Bandbreite. Serverseitig wird NICHTS umgerechnet (kein Sharp o.ä.).

// Nur echte Rasterformate zulassen (kein SVG/GIF).
const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

type OptimizeOpts = {
  maxEdge: number;          // längste Kante, nie hochskaliert
  qualitySteps: number[];   // WebP-Qualität, absteigend bis Zielgröße erreicht
  targetBytes: number;      // angestrebte Maximalgröße
};

// Hintergrund: max 1280px, Ziel ≤ 300 KB, Qualität 0.82 → 0.65
const BG_OPTIMIZE: OptimizeOpts = {
  maxEdge: 1280,
  qualitySteps: [0.82, 0.78, 0.74, 0.70, 0.65],
  targetBytes: 300 * 1024,
};
const BG_HARD_LIMIT = 1024 * 1024; // 1 MB

// Logo: max 512px, Ziel ≤ 150 KB, Qualität 0.90 → 0.75, Transparenz erhalten
const LOGO_OPTIMIZE: OptimizeOpts = {
  maxEdge: 512,
  qualitySteps: [0.90, 0.85, 0.80, 0.75],
  targetBytes: 150 * 1024,
};
const LOGO_HARD_LIMIT = 500 * 1024; // 500 KB

function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Bild konnte nicht gelesen werden")); };
    img.src = url;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((res) => canvas.toBlob((b) => res(b), "image/webp", quality));
}

// Skaliert das Bild (nie größer als das Original) auf maxEdge und kodiert es als
// WebP. Reduziert die Qualität schrittweise (feste Stufen, keine Endlosschleife),
// bis targetBytes erreicht ist; gibt sonst das kleinste erzeugte Ergebnis zurück.
// Der Canvas wird NICHT mit Farbe gefüllt → Transparenz (Alpha) bleibt erhalten.
async function optimizeToWebp(source: Blob, opts: OptimizeOpts): Promise<Blob> {
  const img = await loadImageFromBlob(source);
  const w0 = img.naturalWidth, h0 = img.naturalHeight;
  if (!w0 || !h0) throw new Error("Bild konnte nicht gelesen werden");

  const scale = Math.min(1, opts.maxEdge / Math.max(w0, h0)); // ≤ 1 → kein Hochskalieren
  const w = Math.max(1, Math.round(w0 * scale));
  const h = Math.max(1, Math.round(h0 * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas nicht verfügbar");
  ctx.clearRect(0, 0, w, h);      // transparent lassen, NICHT mit Weiß/Schwarz füllen
  ctx.drawImage(img, 0, 0, w, h);

  let best: Blob | null = null;
  for (const q of opts.qualitySteps) {
    const blob = await canvasToWebp(canvas, q);
    if (!blob) continue;
    if (!best || blob.size < best.size) best = blob;
    if (blob.size <= opts.targetBytes) break; // Ziel erreicht → fertig
  }
  if (!best) throw new Error("Bild konnte nicht optimiert werden");
  return best;
}

type EditorTab = "farben" | "hintergrund" | "logo" | "stempel";

const TABS: { id: EditorTab; label: string; icon: LucideIcon }[] = [
  { id: "farben",      label: "Farben",     icon: Palette   },
  { id: "hintergrund", label: "Hintergrund", icon: ImageIcon },
  { id: "logo",        label: "Logo & Text", icon: Store     },
  { id: "stempel",     label: "Stempel",    icon: Stamp     },
];

const STAMP_SHAPES = [
  { id: "circle",  label: "Kreis"   },
  { id: "square",  label: "Eckig"   },
  { id: "diamond", label: "Raute"   },
  { id: "hex",     label: "Wabe"    },
  { id: "octagon", label: "Achteck" },
  { id: "star",    label: "Stern"   },
  { id: "shield",  label: "Schild"  },
] as const;

const DECORS = [
  { id: "none",    label: "Ohne"        },
  { id: "thin",    label: "Fein"        },
  { id: "double",  label: "Doppelt"     },
  { id: "swirl",   label: "Geschwungen" },
  { id: "bracket", label: "Fläche"      },
  { id: "dots",    label: "Punkte"      },
  { id: "ornate",  label: "Verziert"    },
] as const;

// Kleine Form-Vorschau für die Stempel-Form-Kacheln
function ShapePreview({ shape, color }: { shape: string; color: string }) {
  if (CLIP_SHAPES[shape]) {
    return <span className="block w-6 h-6" style={{ clipPath: CLIP_SHAPES[shape], background: color }} />;
  }
  if (shape === "diamond") {
    return <span className="block w-4 h-4 rotate-45 rounded-[3px]" style={{ background: color }} />;
  }
  return <span className="block w-6 h-6" style={{ background: color, borderRadius: shape === "square" ? 6 : 9999 }} />;
}

export function DesignEditor({ shop, adminSecret }: { shop: Doc<"shops">; adminSecret: string }) {
  const generateUploadUrl = useMutation(api.shops.adminGenerateUploadUrl);
  const setDesignConfig   = useMutation(api.shops.adminSetDesignConfig);

  const dc = shop.designConfig;
  const [open, setOpen] = useState(!!dc);

  // Ohne gespeichertes Design: dezentes dunkles Schema aus der Shop-Akzentfarbe
  const start = useMemo(() => deriveScheme(shop.accentColor ?? "#5f8a83", "dark"), [shop.accentColor]);

  // Farben
  const [colorMode, setColorMode] = useState<"dark" | "light">(dc ? resolveColorMode(dc) : "dark");
  const [accent, setAccent]     = useState(dc?.accent   ?? start.accent);
  const [text, setText]         = useState(dc?.text     ?? start.text);
  const [textBody, setTextBody] = useState(dc?.textBody ?? start.textBody);
  const [cardBg, setCardBg]     = useState(dc?.cardBg   ?? start.cardBg);
  // Hintergrund
  const [bgType, setBgType]     = useState<"color" | "gradient" | "image">(dc?.bgType ?? "gradient");
  const [bgColor, setBgColor]   = useState(dc?.bgColor  ?? start.bgColor);
  const [bgColor2, setBgColor2] = useState(dc?.bgColor2 ?? start.bgColor2);
  const [bgImageId, setBgImageId]     = useState<Id<"_storage"> | undefined>(dc?.bgImageId);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | undefined>(dc?.bgImageUrl);
  // Logo
  const [logoId, setLogoId]           = useState<Id<"_storage"> | undefined>(dc?.logoId);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | undefined>(dc?.logoUrl);
  const [logoShowName, setLogoShowName] = useState(dc?.logoShowName ?? false);
  const [logoWidth, setLogoWidth]     = useState(dc?.logoWidth ?? 80);
  const [tagline, setTagline]         = useState(dc?.tagline ?? "");
  const [qrStyle, setQrStyle]         = useState<"button" | "icon" | "both">(dc?.qrStyle ?? "button");
  // Stempel & Details
  const [icon, setIcon]           = useState(dc?.stampIcon ?? shop.stampIcon ?? "stamp");
  const [stampShape, setStampShape] = useState(dc?.stampShape ?? "circle");
  // Stempel-Umrandung: eigene Farbe (leer = Akzentfarbe) + Stärke
  const [stampBorderColor, setStampBorderColor] = useState<string>(dc?.stampBorderColor ?? "");
  const [stampBorderStyle, setStampBorderStyle] = useState<"thin" | "bold">(dc?.stampBorderStyle ?? "thin");
  const [decor, setDecor]         = useState<"none" | "thin" | "double" | "swirl" | "bracket" | "dots" | "ornate">(normalizeDecor(dc?.decor));

  const [tab, setTab]             = useState<EditorTab>("farben");
  const previewRef                = useRef<HTMLDivElement>(null);

  // Hell/Dunkel: leitet aus der aktuellen Akzentfarbe ein ruhiges Schema ab
  // (Karte, Texte, Hintergrundfarben). Ein Hintergrundfoto bleibt erhalten
  // und unverändert, die Karte liegt dann als helles bzw. dunkles Milchglas darauf.
  const applyMode = (mode: "dark" | "light") => {
    const s = deriveScheme(accent, mode);
    setColorMode(mode);
    setAccent(s.accent); setText(s.text); setTextBody(s.textBody); setCardBg(s.cardBg);
    setBgColor(s.bgColor); setBgColor2(s.bgColor2);
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
    // Format prüfen (kein SVG/GIF)
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      setErr("Nicht unterstütztes Format. Erlaubt sind JPG, PNG, WebP oder AVIF.");
      e.target.value = "";
      return;
    }
    setUploading(kind); setErr("");
    try {
      let optimized: Blob;
      if (kind === "logo") {
        // Weißen/karierten Rand automatisch entfernen, dann als WebP optimieren
        // (Transparenz bleibt erhalten) und erst nach dem Größen-Check hochladen.
        const processed = await removeLogoBackground(file);
        optimized = await optimizeToWebp(processed, LOGO_OPTIMIZE);
        if (optimized.size > LOGO_HARD_LIMIT) {
          throw new Error("Logo ist auch nach Optimierung zu groß (über 500 KB). Bitte ein einfacheres oder kleineres Logo verwenden.");
        }
        const id = await uploadFile(optimized, "image/webp");
        setLogoId(id); setLogoPreviewUrl(URL.createObjectURL(optimized));
      } else {
        optimized = await optimizeToWebp(file, BG_OPTIMIZE);
        if (optimized.size > BG_HARD_LIMIT) {
          throw new Error("Hintergrundbild ist auch nach Optimierung zu groß (über 1 MB). Bitte ein kleineres Bild verwenden.");
        }
        const id = await uploadFile(optimized, "image/webp");
        setBgImageId(id); setBgPreviewUrl(URL.createObjectURL(optimized)); setBgType("image");
      }
    } catch (ex: unknown) {
      setErr(errMsg(ex, "Upload fehlgeschlagen"));
    } finally { setUploading(null); e.target.value = ""; }
  };

  // Gespeicherte Konfiguration (auch Grundlage für "ungespeicherte Änderungen")
  const config = useMemo(() => ({
    accent, text, textBody, cardBg, bgType,
    bgColor, bgColor2, bgImageId, logoId, logoShowName, logoWidth,
    tagline: tagline.trim() || undefined,
    qrStyle, stampIcon: icon, stampShape,
    stampBorderColor: stampBorderColor || undefined, stampBorderStyle, decor, colorMode,
  }), [accent, text, textBody, cardBg, bgType, bgColor, bgColor2, bgImageId, logoId, logoShowName, logoWidth, tagline, qrStyle, icon, stampShape, stampBorderColor, stampBorderStyle, decor, colorMode]);
  const [savedSnapshot, setSavedSnapshot] = useState(() => (dc ? JSON.stringify(config) : ""));
  // Ohne gespeichertes Design gibt es nichts zu vergleichen: dann immer speicherbar
  const dirty = !dc || JSON.stringify(config) !== savedSnapshot;

  // Live-Vorschau: dieselbe Komponente, die auch die Kunden sehen
  const previewCfg: ShopDesignConfig = useMemo(() => ({
    ...config, bgImageUrl: bgPreviewUrl, logoUrl: logoPreviewUrl,
  }), [config, bgPreviewUrl, logoPreviewUrl]);
  const previewTheme = useMemo(() => makeConfigTheme(previewCfg), [previewCfg]);

  const hasPhoto = bgType === "image" && !!bgPreviewUrl;
  const previewBg: React.CSSProperties = hasPhoto
    ? { backgroundImage: `url('${bgPreviewUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }
    : bgType === "gradient"
      ? { background: `linear-gradient(180deg, ${bgColor} 0%, ${bgColor2} 100%)` }
      : { background: bgColor };

  const handleSave = async () => {
    setSaving(true); setErr(""); setSaved(false);
    try {
      await setDesignConfig({ shopId: shop._id, adminSecret, config });
      setSavedSnapshot(JSON.stringify(config));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (ex: unknown) {
      setErr(errMsg(ex, "Fehler beim Speichern"));
    } finally { setSaving(false); }
  };

  const handleRemove = async () => {
    if (!window.confirm("Eigenes Design entfernen? Der Shop nutzt dann wieder den Standard-Look.")) return;
    setSaving(true); setErr("");
    try {
      await setDesignConfig({ shopId: shop._id, adminSecret, config: null });
      // Editor auf den Ausgangszustand zurücksetzen; die Bilder hat der Server gelöscht
      setColorMode("dark");
      setAccent(start.accent); setText(start.text); setTextBody(start.textBody); setCardBg(start.cardBg);
      setBgType("gradient"); setBgColor(start.bgColor); setBgColor2(start.bgColor2);
      setBgImageId(undefined); setBgPreviewUrl(undefined);
      setLogoId(undefined); setLogoPreviewUrl(undefined);
      setSavedSnapshot("");
    }
    catch (ex: unknown) { setErr(errMsg(ex, "Fehler")); }
    finally { setSaving(false); }
  };

  // Einheitliche Auswahl-Optik: gewählt = hell, sonst zurückhaltend
  const chip = (active: boolean) => active
    ? "bg-zinc-100 text-zinc-900 border-zinc-100"
    : "bg-white/[0.03] text-zinc-400 border-white/[0.07] hover:text-zinc-200 hover:border-white/15";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center gap-2 text-left">
        <Palette size={14} className={dc ? "text-amber-400" : "text-zinc-500"} />
        <span className="text-sm font-semibold text-zinc-200">Design-Editor</span>
        {dc && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400">aktiv</span>}
        <ChevronRight size={14} className={`ml-auto text-zinc-600 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-zinc-800">
          {shop.theme && (
            <p className="mx-4 mt-4 text-[11px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/25 rounded-xl px-3 py-2">
              Signature-Theme „{shop.theme}" ist aktiv und überdeckt den Editor. Beim Speichern hier wird es automatisch ersetzt.
            </p>
          )}

          <div className="p-4 lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-6 space-y-4 lg:space-y-0">
            {/* Vorschau: am Handy oben, am PC links und beim Scrollen fest */}
            <div ref={previewRef} className="lg:sticky lg:top-4 lg:self-start space-y-2 scroll-mt-4">
              <p className="text-[11px] text-zinc-500 font-medium">Vorschau, so sieht es der Kunde</p>
              <div className="relative rounded-[28px] overflow-hidden border border-white/[0.06] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)]" style={previewBg}>
                <div className="relative p-4 space-y-3">
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
            </div>

            {/* Einstellungen */}
            <div className="space-y-4 min-w-0">
              {/* Hell / Dunkel: Hauptschalter, gilt auch mit Foto */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
                {([
                  { id: "dark",  label: "Dunkel", Icon: Moon },
                  { id: "light", label: "Hell",   Icon: Sun  },
                ] as const).map(m => (
                  <button key={m.id} type="button" onClick={() => applyMode(m.id)}
                    className={`min-h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${colorMode === m.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-400 hover:text-zinc-200"}`}>
                    <m.Icon size={15} /> {m.label}
                  </button>
                ))}
              </div>

              {/* Reiter */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                {TABS.map(t => (
                  <button key={t.id} type="button" onClick={() => setTab(t.id)}
                    className={`min-h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${tab === t.id ? "bg-white/10 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}>
                    <t.icon size={15} />
                    <span className="leading-tight text-center">{t.label}</span>
                  </button>
                ))}
              </div>

              {tab === "farben" && (
                <Panel title="Die vier Farben der Karte" hint="Hell/Dunkel oben stellt alle vier passend ein. Hier kannst du jede einzeln anpassen.">
                  <ColorField label="Akzentfarbe (Stempel, Button)" value={accent}   onChange={setAccent} />
                  <ColorField label="Überschrift"                   value={text}     onChange={setText} />
                  <ColorField label="Text"                          value={textBody} onChange={setTextBody} />
                  <ColorField label="Kartenfläche"                  value={cardBg}   onChange={setCardBg} />
                </Panel>
              )}

              {tab === "hintergrund" && (
                <Panel title="Hintergrund">
                  <div className="grid grid-cols-3 gap-1.5">
                    {([
                      { id: "color",    label: "Farbe"   },
                      { id: "gradient", label: "Verlauf" },
                      { id: "image",    label: "Foto"    },
                    ] as const).map(t => (
                      <button key={t.id} type="button" onClick={() => setBgType(t.id)}
                        className={`min-h-10 rounded-xl border text-xs font-semibold transition-colors ${chip(bgType === t.id)}`}>
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
                    <>
                      <div className="flex items-center gap-2">
                        <label className="flex-1">
                          <span className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-200 text-xs font-semibold cursor-pointer hover:bg-white/10 transition-colors">
                            <Upload size={14} />
                            {uploading === "bg" ? "Lädt hoch…" : bgPreviewUrl ? "Foto ändern" : "Foto hochladen"}
                          </span>
                          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleUpload("bg")} disabled={uploading !== null} />
                        </label>
                        {bgPreviewUrl && (
                          <button type="button" aria-label="Foto entfernen"
                            onClick={() => { setBgImageId(undefined); setBgPreviewUrl(undefined); setBgType("gradient"); }}
                            className="min-h-11 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-500 hover:text-red-400 transition-colors">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">
                        Am besten Hochformat (z. B. 1024×1792), ruhige Bildmitte, ohne Text. Das Foto bleibt unverändert, die Karte liegt je nach Hell/Dunkel als helles oder dunkles Milchglas darauf.
                      </p>
                    </>
                  )}
                </Panel>
              )}

              {tab === "logo" && (
                <Panel title="Logo & Text">
                  <div className="flex items-center gap-2">
                    <label className="flex-1">
                      <span className="w-full min-h-11 flex items-center justify-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-200 text-xs font-semibold cursor-pointer hover:bg-white/10 transition-colors">
                        <Upload size={14} />
                        {uploading === "logo" ? "Verarbeite…" : logoPreviewUrl ? "Logo ändern" : "Logo hochladen (statt Shopname)"}
                      </span>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleUpload("logo")} disabled={uploading !== null} />
                    </label>
                    {logoPreviewUrl && (
                      <button type="button" aria-label="Logo entfernen" onClick={() => { setLogoId(undefined); setLogoPreviewUrl(undefined); }}
                        className="min-h-11 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-500 hover:text-red-400 transition-colors">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Weißer/karierter Hintergrund wird automatisch entfernt. Am besten trotzdem ein PNG mit transparentem Hintergrund verwenden.
                  </p>
                  {logoPreviewUrl && (
                    <button type="button" onClick={() => setLogoShowName(v => !v)}
                      className="w-full min-h-11 flex items-center gap-3 px-3 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs text-zinc-300 text-left">
                      <span className={`w-9 h-5 rounded-full shrink-0 flex items-center transition-colors ${logoShowName ? "bg-zinc-100" : "bg-zinc-700"}`}>
                        <span className={`w-4 h-4 rounded-full transition-transform ${logoShowName ? "translate-x-[18px] bg-zinc-900" : "translate-x-0.5 bg-zinc-300"}`} />
                      </span>
                      Shopname zusätzlich unter dem Logo anzeigen
                    </button>
                  )}
                  {logoPreviewUrl && (
                    <div className="px-1">
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="logo-width" className="text-xs text-zinc-400">Logo-Größe (Breite)</label>
                        <span className="text-xs text-zinc-500 tabular-nums">{logoWidth}%</span>
                      </div>
                      <input id="logo-width" type="range" min={40} max={100} step={5} value={logoWidth}
                        onChange={e => setLogoWidth(Number(e.target.value))}
                        className="w-full accent-zinc-100" />
                    </div>
                  )}
                  <div>
                    <label htmlFor="tagline" className="block text-xs text-zinc-400 mb-1.5 px-1">Kleiner Text unter Logo/Name (optional)</label>
                    <input id="tagline" value={tagline} onChange={e => setTagline(e.target.value)} maxLength={60}
                      placeholder="z. B. Ladenname oder Slogan"
                      className="w-full min-h-11 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/25" />
                  </div>
                </Panel>
              )}

              {tab === "stempel" && (
                <>
                  <Panel title="Stempel-Symbol">
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {ICON_CATEGORIES.map(cat => (
                        <div key={cat.label}>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">{cat.label}</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {cat.keys.map(key => {
                              const IconComp = STAMP_ICONS[key];
                              if (!IconComp) return null;
                              return (
                                <button key={key} type="button" onClick={() => setIcon(key)} aria-label={key}
                                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                                  style={icon === key
                                    ? { background: `${accent}26`, border: `1px solid ${accent}80` }
                                    : { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                                  <IconComp size={16} style={{ color: icon === key ? accent : "#71717a" }} />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Stempel-Form">
                    <div className="grid grid-cols-4 gap-1.5">
                      {STAMP_SHAPES.map(s => (
                        <button key={s.id} type="button" onClick={() => setStampShape(s.id)}
                          className={`min-h-16 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-[11px] font-semibold transition-colors ${chip(stampShape === s.id)}`}>
                          <ShapePreview shape={s.id} color={stampShape === s.id ? "#18181b" : accent} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Stempel-Umrandung">
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { id: "thin", label: "Fein" },
                        { id: "bold", label: "Fett" },
                      ] as const).map(s => (
                        <button key={s.id} type="button" onClick={() => setStampBorderStyle(s.id)}
                          className={`min-h-10 rounded-xl border text-xs font-semibold transition-colors ${chip(stampBorderStyle === s.id)}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button type="button" onClick={() => setStampBorderColor("")}
                        className={`min-h-10 rounded-xl border text-xs font-semibold transition-colors ${chip(!stampBorderColor)}`}>
                        Akzentfarbe
                      </button>
                      <button type="button" onClick={() => setStampBorderColor(c => c || accent)}
                        className={`min-h-10 rounded-xl border text-xs font-semibold transition-colors ${chip(!!stampBorderColor)}`}>
                        Eigene Farbe
                      </button>
                    </div>
                    {stampBorderColor && (
                      <ColorField label="Umrandungsfarbe" value={stampBorderColor} onChange={setStampBorderColor} />
                    )}
                  </Panel>

                  <Panel title="Ecken-Verzierung">
                    <div className="grid grid-cols-4 gap-1.5">
                      {DECORS.map(d => (
                        <button key={d.id} type="button" onClick={() => setDecor(d.id)}
                          className={`min-h-16 rounded-xl border flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${chip(decor === d.id)}`}>
                          <span className="h-6 flex items-center">
                            {d.id === "none"
                              ? <span className="block w-5 h-px" style={{ background: decor === d.id ? "#18181b" : "#52525b" }} />
                              : <CornerOrnament color={decor === d.id ? "#18181b" : accent} variant={d.id} />}
                          </span>
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </Panel>

                  <Panel title="QR-Code">
                    <div className="grid grid-cols-3 gap-1.5">
                      {([
                        { id: "button", label: "Button unten" },
                        { id: "icon",   label: "Klein oben"   },
                        { id: "both",   label: "Beide"        },
                      ] as const).map(s => (
                        <button key={s.id} type="button" onClick={() => setQrStyle(s.id)}
                          className={`min-h-10 rounded-xl border text-xs font-semibold transition-colors ${chip(qrStyle === s.id)}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </Panel>
                </>
              )}
            </div>
          </div>

          {/* Speichern-Leiste: bleibt unten sichtbar (am Handy über der schwebenden Admin-Navigation) */}
          <div className="sticky z-10 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] lg:bottom-0 px-4 py-3 border-t border-white/[0.06] bg-zinc-900/85 backdrop-blur-xl rounded-b-2xl">
            {err && <p className="text-red-400 text-xs mb-2">{err}</p>}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="lg:hidden min-h-11 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-300 text-xs font-semibold flex items-center gap-1.5">
                <Eye size={14} /> Vorschau
              </button>
              <button type="button" onClick={handleSave} disabled={saving || uploading !== null}
                className="flex-1 min-h-11 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-900 text-sm font-semibold rounded-xl transition-colors">
                {saving ? "Speichert…" : saved ? "Gespeichert ✓" : dirty ? "Design speichern" : "Gespeichert"}
              </button>
              {dc && (
                <button type="button" onClick={handleRemove} disabled={saving}
                  className="min-h-11 px-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-zinc-500 hover:text-red-400 text-xs transition-colors disabled:opacity-50">
                  Entfernen
                </button>
              )}
            </div>
            {dc && dirty && !saving && <p className="text-[11px] text-amber-400/80 mt-1.5">Ungespeicherte Änderungen</p>}
          </div>
        </div>
      )}
    </div>
  );
}
