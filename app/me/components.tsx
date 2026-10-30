"use client";

import { useEffect, useId, useRef, useState } from "react";
import QRCode from "qrcode";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, useReducedMotion } from "framer-motion";
import {
  Gift, Stamp, Scissors, Coffee, Pizza, Dumbbell, Flower2,
  ShoppingBag, Car, Utensils, BookOpen, Flame, Star, Bike, Shirt,
  // Essen & Trinken
  Beer, Wine, Martini, CupSoda, IceCream, Cake, Croissant, Cookie,
  Candy, Apple, Cherry, Fish, Beef, Drumstick, Salad, Soup, Sandwich,
  Popcorn, Milk, Egg, Banana, Grape, Citrus, Carrot, Wheat, Donut,
  Lollipop, Ham,
  // Gesundheit & Apotheke
  Pill, Cross, Stethoscope, HeartPulse,
  // Beauty & Wellness
  Sparkles, Heart, Sun, Moon, Leaf, Droplets, Bath, Brush, Palette, SprayCan,
  // Tiere
  PawPrint, Dog, Cat, Bone, Bird, Rabbit, Turtle,
  // Freizeit & Kultur
  Gamepad2, Music, Guitar, Mic, Camera, Ticket, Trophy, Target, Rocket,
  Clapperboard, Film, Headphones, Dices, Puzzle, Tent, Backpack, Compass,
  // Lifestyle & Handel
  Crown, Gem, Watch, Glasses, Footprints, Baby, Smile, Store, ShoppingCart,
  Wallet, PiggyBank, Cigarette,
  // Handwerk & Service
  Wrench, Hammer, Key, Home, Plane, Anchor, Smartphone, Laptop,
  WashingMachine, Fuel, Bus, Truck,
  // Sonstiges
  Snowflake, Zap, Umbrella, TreePine, Mountain,
  // Erweiterung: Klassiker
  Medal, Award, BadgeCheck, ThumbsUp, PartyPopper, Clover, Sparkle, Flag,
  // Erweiterung: Essen & Trinken
  Hamburger, CakeSlice, CookingPot, ChefHat, Shrimp, Nut, Bean, IceCreamCone, IceCreamBowl,
  Popsicle, Dessert, GlassWater, EggFried, UtensilsCrossed, CandyCane, LeafyGreen, Hop, Vegan,
  // Erweiterung: Gesundheit
  Syringe, Thermometer, Bandage, Activity, Tablets, PillBottle, Brain, Eye, Ear, Dna,
  Microscope, Hospital, Ambulance, HandHeart,
  // Erweiterung: Beauty & Wellness
  Flower, Sprout, Feather, WandSparkles, Shell, Paintbrush, Ribbon, Pipette,
  // Erweiterung: Tiere
  Squirrel, Rat, Snail, Bug, Worm, Origami, Panda, FishSymbol,
  // Erweiterung: Sport & Freizeit
  Volleyball, Goal, Timer, Sailboat, MountainSnow, Swords, Drama, Piano, Drum, Disc3,
  Joystick, Spade, Club, Diamond, FerrisWheel, Binoculars, MapPin, TentTree, Ghost,
  // Erweiterung: Handel & Lifestyle
  ShoppingBasket, Tag, BadgePercent, Package, CreditCard, Coins, Banknote, Receipt,
  Handbag, Newspaper, Sofa, Lamp, Armchair,
  // Erweiterung: Handwerk & Service
  Drill, PaintRoller, Ruler, Shovel, Plug, Lightbulb, HardHat, Printer, Monitor, Lock,
  CarTaxiFront, Tractor, Ship, Mail, Hotel, BedDouble, TrainFront, Scooter,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardTier = { stamps: number; text: string; enabled: boolean };

// ─── Icon-System ──────────────────────────────────────────────────────────────

export const STAMP_ICONS: Record<string, LucideIcon> = {
  // Klassiker (bestehende Keys nicht ändern — liegen in der DB)
  scissors: Scissors,
  coffee: Coffee,
  pizza: Pizza,
  dumbbell: Dumbbell,
  flower: Flower2,
  shopping: ShoppingBag,
  car: Car,
  utensils: Utensils,
  book: BookOpen,
  flame: Flame,
  star: Star,
  bike: Bike,
  shirt: Shirt,
  stamp: Stamp,
  // Essen & Trinken
  beer: Beer,
  wine: Wine,
  cocktail: Martini,
  soda: CupSoda,
  icecream: IceCream,
  cake: Cake,
  croissant: Croissant,
  cookie: Cookie,
  candy: Candy,
  apple: Apple,
  cherry: Cherry,
  fish: Fish,
  beef: Beef,
  chicken: Drumstick,
  salad: Salad,
  soup: Soup,
  sandwich: Sandwich,
  popcorn: Popcorn,
  milk: Milk,
  egg: Egg,
  banana: Banana,
  grape: Grape,
  citrus: Citrus,
  carrot: Carrot,
  wheat: Wheat,
  donut: Donut,
  lollipop: Lollipop,
  ham: Ham,
  // Gesundheit & Apotheke
  pill: Pill,
  cross: Cross,
  stethoscope: Stethoscope,
  heartpulse: HeartPulse,
  // Beauty & Wellness
  sparkles: Sparkles,
  heart: Heart,
  sun: Sun,
  moon: Moon,
  leaf: Leaf,
  droplets: Droplets,
  bath: Bath,
  brush: Brush,
  palette: Palette,
  spray: SprayCan,
  // Tiere
  paw: PawPrint,
  dog: Dog,
  cat: Cat,
  bone: Bone,
  bird: Bird,
  rabbit: Rabbit,
  turtle: Turtle,
  // Freizeit & Kultur
  gamepad: Gamepad2,
  music: Music,
  guitar: Guitar,
  mic: Mic,
  camera: Camera,
  ticket: Ticket,
  trophy: Trophy,
  target: Target,
  rocket: Rocket,
  clapperboard: Clapperboard,
  film: Film,
  headphones: Headphones,
  dices: Dices,
  puzzle: Puzzle,
  tent: Tent,
  backpack: Backpack,
  compass: Compass,
  // Lifestyle & Handel
  gift: Gift,
  crown: Crown,
  gem: Gem,
  watch: Watch,
  glasses: Glasses,
  footprints: Footprints,
  baby: Baby,
  smile: Smile,
  store: Store,
  cart: ShoppingCart,
  wallet: Wallet,
  piggybank: PiggyBank,
  cigarette: Cigarette,
  // Handwerk & Service
  wrench: Wrench,
  hammer: Hammer,
  key: Key,
  home: Home,
  plane: Plane,
  anchor: Anchor,
  smartphone: Smartphone,
  laptop: Laptop,
  washing: WashingMachine,
  fuel: Fuel,
  bus: Bus,
  truck: Truck,
  // Sonstiges
  snowflake: Snowflake,
  zap: Zap,
  umbrella: Umbrella,
  tree: TreePine,
  mountain: Mountain,
  // ── Erweiterung ──
  // Klassiker
  medal: Medal,
  award: Award,
  badge: BadgeCheck,
  thumbsup: ThumbsUp,
  party: PartyPopper,
  clover: Clover,
  sparkle: Sparkle,
  flag: Flag,
  // Essen & Trinken
  burger: Hamburger,
  cakeslice: CakeSlice,
  pot: CookingPot,
  chef: ChefHat,
  shrimp: Shrimp,
  nut: Nut,
  bean: Bean,
  icecone: IceCreamCone,
  icebowl: IceCreamBowl,
  popsicle: Popsicle,
  dessert: Dessert,
  water: GlassWater,
  eggfried: EggFried,
  cutlery: UtensilsCrossed,
  candycane: CandyCane,
  greens: LeafyGreen,
  hop: Hop,
  vegan: Vegan,
  // Gesundheit & Apotheke
  syringe: Syringe,
  thermometer: Thermometer,
  bandage: Bandage,
  activity: Activity,
  tablets: Tablets,
  pillbottle: PillBottle,
  brain: Brain,
  eye: Eye,
  ear: Ear,
  dna: Dna,
  microscope: Microscope,
  hospital: Hospital,
  ambulance: Ambulance,
  handheart: HandHeart,
  // Beauty & Wellness
  rose: Flower,
  sprout: Sprout,
  feather: Feather,
  wand: WandSparkles,
  shell: Shell,
  paintbrush: Paintbrush,
  ribbon: Ribbon,
  pipette: Pipette,
  // Tiere
  squirrel: Squirrel,
  rat: Rat,
  snail: Snail,
  bug: Bug,
  worm: Worm,
  origami: Origami,
  panda: Panda,
  fishsymbol: FishSymbol,
  // Sport & Freizeit
  volleyball: Volleyball,
  goal: Goal,
  timer: Timer,
  sailboat: Sailboat,
  mountainsnow: MountainSnow,
  swords: Swords,
  drama: Drama,
  piano: Piano,
  drum: Drum,
  disc: Disc3,
  joystick: Joystick,
  spade: Spade,
  club: Club,
  diamond: Diamond,
  ferriswheel: FerrisWheel,
  binoculars: Binoculars,
  mappin: MapPin,
  tenttree: TentTree,
  ghost: Ghost,
  // Handel & Lifestyle
  basket: ShoppingBasket,
  tag: Tag,
  percent: BadgePercent,
  package: Package,
  creditcard: CreditCard,
  coins: Coins,
  banknote: Banknote,
  receipt: Receipt,
  handbag: Handbag,
  newspaper: Newspaper,
  sofa: Sofa,
  lamp: Lamp,
  armchair: Armchair,
  // Handwerk & Service
  drill: Drill,
  roller: PaintRoller,
  ruler: Ruler,
  shovel: Shovel,
  plug: Plug,
  lightbulb: Lightbulb,
  hardhat: HardHat,
  printer: Printer,
  monitor: Monitor,
  lock: Lock,
  taxi: CarTaxiFront,
  tractor: Tractor,
  ship: Ship,
  mail: Mail,
  hotel: Hotel,
  bed: BedDouble,
  train: TrainFront,
  scooter: Scooter,
};

// Kategorien für den Icon-Picker im Design-Editor: gruppiert statt eine
// riesige flache Liste, damit man das passende Branchen-Icon schnell findet
export const ICON_CATEGORIES: { label: string; keys: string[] }[] = [
  { label: "Klassiker",             keys: ["stamp","star","heart","gift","sparkles","sparkle","crown","gem","zap","trophy","medal","award","badge","thumbsup","party","clover","flag","target","rocket","smile"] },
  { label: "Essen & Trinken",       keys: ["coffee","utensils","cutlery","chef","pot","pizza","burger","sandwich","soup","salad","greens","vegan","fish","shrimp","beef","chicken","ham","egg","eggfried","croissant","flame","cake","cakeslice","dessert","donut","cookie","candy","candycane","lollipop","icecream","icecone","icebowl","popsicle","popcorn","apple","banana","cherry","grape","citrus","carrot","nut","bean","wheat","milk","water","soda","beer","hop","wine","cocktail"] },
  { label: "Gesundheit & Apotheke", keys: ["pill","tablets","pillbottle","cross","stethoscope","heartpulse","activity","syringe","thermometer","bandage","brain","eye","ear","dna","microscope","hospital","ambulance","handheart"] },
  { label: "Beauty & Wellness",     keys: ["scissors","flower","rose","sprout","brush","paintbrush","palette","spray","pipette","wand","ribbon","feather","shell","bath","droplets","sun","moon","leaf"] },
  { label: "Tiere",                 keys: ["paw","dog","cat","bone","bird","rabbit","turtle","squirrel","rat","snail","bug","worm","panda","fishsymbol","origami"] },
  { label: "Sport & Freizeit",      keys: ["dumbbell","volleyball","goal","timer","bike","footprints","sailboat","gamepad","joystick","dices","spade","club","diamond","puzzle","music","piano","drum","guitar","disc","mic","headphones","camera","film","clapperboard","drama","ticket","ferriswheel","ghost","swords","book","tent","tenttree","backpack","compass","binoculars","mappin","mountain","mountainsnow","tree","snowflake","umbrella"] },
  { label: "Handel & Lifestyle",    keys: ["shopping","handbag","basket","cart","store","tag","percent","package","receipt","creditcard","coins","banknote","wallet","piggybank","shirt","watch","glasses","baby","newspaper","sofa","armchair","lamp","cigarette"] },
  { label: "Handwerk & Service",    keys: ["car","taxi","fuel","bus","train","truck","tractor","scooter","wrench","hammer","drill","roller","ruler","shovel","hardhat","plug","lightbulb","key","lock","home","hotel","bed","washing","printer","monitor","smartphone","laptop","mail","plane","ship","anchor"] },
];

export function getStampIcon(key?: string | null): LucideIcon {
  if (key && STAMP_ICONS[key]) return STAMP_ICONS[key];
  return Stamp;
}

// ─── Branchen ─────────────────────────────────────────────────────────────────

export const BRANCHEN = [
  { label: "Friseur / Barbershop", icon: "scissors" },
  { label: "Café / Kaffee",        icon: "coffee"   },
  { label: "Restaurant",           icon: "utensils" },
  { label: "Imbiss / Pizza",       icon: "pizza"    },
  { label: "Bäckerei / Konditorei",icon: "flame"    },
  { label: "Gym / Fitness",        icon: "dumbbell" },
  { label: "Wellness / Kosmetik",  icon: "flower"   },
  { label: "Einzelhandel",         icon: "shopping" },
  { label: "Auto / Werkstatt",     icon: "car"      },
  { label: "Fahrrad",              icon: "bike"     },
  { label: "Mode / Kleidung",      icon: "shirt"    },
  { label: "Buchhandlung",         icon: "book"     },
  { label: "Sonstiges",            icon: "stamp"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hexLuminance(hex: string): number | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Heller Akzent (z.B. Gelb) auf hellem Design ist unlesbar. Helles Design
// erkennt man an dunkler Textfarbe, dann für Balken/Schrift die Textfarbe
// nehmen statt des Akzents.
export function readableAccent(accent: string, textColor: string): string {
  const a = hexLuminance(accent);
  const t = hexLuminance(textColor);
  if (a !== null && t !== null && a > 0.6 && t < 0.5) return textColor;
  return accent;
}

export function getActiveTiers(shop: {
  stampsRequired: number;
  rewardText: string;
  rewardTiers?: CardTier[];
}): CardTier[] {
  const baseTier: CardTier = { stamps: shop.stampsRequired, text: shop.rewardText, enabled: true };
  if (shop.rewardTiers && shop.rewardTiers.some(t => t.enabled)) {
    return [baseTier, ...shop.rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps);
  }
  return [baseTier];
}

// ─── Particles ────────────────────────────────────────────────────────────────

const PARTICLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist  = 90 + (i % 4) * 18;
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
});

// ─── StampOverlay ─────────────────────────────────────────────────────────────

export function StampOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      onClick={onDone}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm cursor-pointer"
    >
      {[0, 1, 2, 3].map(i => (
        <motion.div key={i}
          initial={{ scale: 0.2, opacity: 0.85 }} animate={{ scale: 5.5, opacity: 0 }}
          transition={{ delay: 0.1 + i * 0.11, duration: 1.0, ease: "easeOut" }}
          className="absolute w-28 h-28 rounded-full border-2 border-amber-400/55"
        />
      ))}
      {PARTICLES.map((p, i) => (
        <motion.div key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 0 }}
          transition={{ delay: 0.08, duration: 0.7, ease: "easeOut" }}
          className="absolute w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#f59e0b" : "#fde68a" }}
        />
      ))}
      <div className="relative flex flex-col items-center select-none">
        <motion.div
          initial={{ scale: 0.1, opacity: 0 }}
          animate={{ scale: [0.1, 1.2, 0.88, 1.08, 1], opacity: [0, 1, 1, 1, 1] }}
          transition={{ duration: 0.42, ease: "easeOut" }}
          className="w-36 h-36 bg-amber-400 rounded-full flex items-center justify-center shadow-2xl shadow-amber-400/50"
        >
          <Stamp size={68} className="text-zinc-900" strokeWidth={1.5} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, scale: 0.4, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 280 }}
          className="text-4xl font-black text-amber-400 mt-6 tracking-tight"
        >
          Stempel!
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
          className="text-zinc-500 text-sm mt-2"
        >
          Tippe um fortzufahren
        </motion.p>
      </div>
    </motion.div>
  );
}

// ─── QRCard ───────────────────────────────────────────────────────────────────

export function QRCard({ qrToken, customerName, shopName, cardBg, cardBorder, textPrimary, textMuted, accentColor, currentStamps, stampsRequired, cardNumber }: {
  qrToken: string;
  customerName: string;
  shopName?: string;
  cardBg?: string;
  cardBorder?: string;
  textPrimary?: string;
  textMuted?: string;
  accentColor?: string;
  currentStamps?: number;
  stampsRequired?: number;
  cardNumber?: string | number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bg     = cardBg     ?? "#18181b";
  const tPrim  = textPrimary ?? "#f4f4f5";
  const tMuted = textMuted   ?? "#71717a";
  const accent = accentColor ?? "#fbbf24";
  // Wallet-Pass: fast deckend (nur bei Hex-Hintergrund, sonst Original → kein NaN bei rgba()-Themes)
  const isHex = /^#[0-9a-fA-F]{6}$/.test(bg);
  const passBg = isHex ? hexToRgba(bg, 0.9) : bg;

  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 200, margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" },
      });
    }
  }, [qrToken]);

  // Live-Uhr mit Sekunden → Kassierer sieht: echte Karte, kein Screenshot
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // 3D-Tilt + Lichtreflex folgt Finger/Maus
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(px, [0, 1], [-10, 10]), { stiffness: 150, damping: 18 });
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.06), transparent 55%)`;

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduceMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function onPointerLeave() { px.set(0.5); py.set(0.5); }

  const initial = shopName?.trim().charAt(0).toUpperCase();
  const hasStamps = typeof currentStamps === "number" && typeof stampsRequired === "number" && stampsRequired > 0;
  const shownStamps = hasStamps ? Math.min(currentStamps!, stampsRequired!) : 0;
  const cardNo = cardNumber != null && cardNumber !== "" ? String(cardNumber).padStart(4, "0") : null;

  // Wallet-Feld: kleines Label oben, Wert darunter
  const Field = ({ label, value, align = "left" }: { label: string; value: React.ReactNode; align?: "left" | "right" }) => (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] mb-0.5" style={{ color: hexToRgba(accent, 0.85) }}>{label}</p>
      <div className="text-[15px] font-semibold leading-tight truncate" style={{ color: tPrim }}>{value}</div>
    </div>
  );

  return (
    <div className="relative mx-auto w-full max-w-xs pt-4" style={{ perspective: 1000 }}
      onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      {/* Dezenter Akzent-Glow hinter der Karte → Tiefe */}
      <div className="absolute -inset-3 top-1 rounded-[36px] pointer-events-none"
        style={{ background: hexToRgba(accent, 0.12), filter: "blur(30px)" }} />

      {/* Wallet-Stapel: zwei Karten lugen oben hervor */}
      <div className="absolute left-6 right-6 top-0 h-16 rounded-[18px]"
        style={{ background: hexToRgba(accent, 0.18), border: `1px solid ${hexToRgba(accent, 0.15)}` }} />
      <div className="absolute left-3 right-3 top-2 h-16 rounded-[20px]"
        style={{ background: isHex ? hexToRgba(bg, 0.95) : bg, border: `1px solid ${hexToRgba(accent, 0.22)}`, boxShadow: "0 -4px 12px rgba(0,0,0,0.3)" }} />

      {/* Pass */}
      <motion.div className="relative rounded-[22px] overflow-hidden"
        initial={reduceMotion ? false : { y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        style={{
          rotateX, rotateY, transformStyle: "preserve-3d",
          background: passBg,
          border: `1px solid ${hexToRgba(accent, 0.25)}`,
          boxShadow: "0 30px 70px -16px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.14)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
        }}>

        {/* Lichtreflex */}
        <motion.div className="absolute inset-0 pointer-events-none z-10" style={{ background: glare }} />

        {/* Kopfzeile: Logo + Name | Header-Feld */}
        <div className="relative z-10 flex items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {initial && (
              <div className="w-8 h-8 shrink-0 rounded-[10px] flex items-center justify-center text-sm font-black"
                style={{
                  color: tPrim,
                  background: `linear-gradient(135deg, ${hexToRgba(accent, 0.5)}, ${hexToRgba(accent, 0.15)})`,
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.25)`,
                }}>
                {initial}
              </div>
            )}
            {shopName && <p className="text-[15px] font-bold tracking-tight truncate" style={{ color: tPrim }}>{shopName}</p>}
          </div>
          {cardNo && <Field label="Karte" value={<span className="tabular-nums">#{cardNo}</span>} align="right" />}
        </div>

        {/* Strip: Primärfeld Stempel + Punkte */}
        <div className="relative z-10 mx-3 rounded-[16px] px-4 py-4 overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${hexToRgba(accent, 0.38)} 0%, ${hexToRgba(accent, 0.1)} 100%)` }}>
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full" style={{ background: hexToRgba(accent, 0.12) }} />
          {hasStamps ? (
            <>
              <p className="relative text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: hexToRgba(accent, 0.95) }}>Stempel</p>
              <p className="relative text-[34px] font-black leading-none tracking-tight mt-1 tabular-nums" style={{ color: tPrim }}>
                {shownStamps}<span className="text-lg font-bold" style={{ color: tMuted }}> / {stampsRequired}</span>
              </p>
              <div className="relative flex flex-wrap gap-1.5 mt-3">
                {Array.from({ length: stampsRequired! }).map((_, i) => (
                  <motion.span key={i} className="w-2.5 h-2.5 rounded-full"
                    initial={reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15 + i * 0.03, type: "spring", stiffness: 400, damping: 18 }}
                    style={i < shownStamps
                      ? { background: accent }
                      : { background: "rgba(255,255,255,0.08)", border: `1px solid ${hexToRgba(accent, 0.3)}` }} />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="relative text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: hexToRgba(accent, 0.95) }}>Stempelkarte</p>
              <p className="relative text-2xl font-black leading-tight tracking-tight mt-1" style={{ color: tPrim }}>{shopName ?? "Treuekarte"}</p>
            </>
          )}
        </div>

        {/* Sekundärfelder */}
        <div className="relative z-10 grid grid-cols-[1fr_auto] gap-3 px-5 pt-4">
          <Field label="Inhaber" value={customerName} />
          <Field label="Live" value={<span className="tabular-nums">{now ? now.toLocaleTimeString("de-DE") : "--:--:--"}</span>} align="right" />
        </div>

        {/* Barcode-Bereich */}
        <div className="relative z-10 px-5 pt-5 pb-5 flex flex-col items-center">
          <motion.div className="relative rounded-[14px] p-2.5 overflow-hidden"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.92, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: "#fff", boxShadow: `0 0 0 1px ${hexToRgba(accent, 0.25)}, 0 0 26px ${hexToRgba(accent, 0.18)}` }}>
            <canvas ref={canvasRef} className="block" />
            {/* Scan-Linie */}
            {!reduceMotion && (
              <motion.div className="absolute left-2.5 right-2.5 h-[2px] pointer-events-none"
                style={{
                  top: 10,
                  background: `linear-gradient(90deg, transparent, ${hexToRgba(accent, 0.6)}, transparent)`,
                }}
                animate={{ y: [0, 198, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} />
            )}
          </motion.div>
          {/* Status unterm Code (wie Wallet-Alttext) */}
          <div className="flex items-center gap-1.5 mt-3">
            <span className="relative flex w-1.5 h-1.5">
              <span className="animate-ping absolute inline-flex w-full h-full rounded-full opacity-75" style={{ background: accent }} />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
            </span>
            <p className="text-[10px] font-semibold" style={{ color: tMuted }}>Bereit zum Scannen · im Laden vorzeigen</p>
          </div>
        </div>

      </motion.div>
    </div>
  );
}

// ─── QRMini ───────────────────────────────────────────────────────────────────

export function QRMini({ qrToken }: { qrToken: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 72, margin: 1, color: { dark: "#09090b", light: "#fafafa" },
      });
    }
  }, [qrToken]);
  return (
    <div className="bg-zinc-50 rounded-xl p-1.5 inline-block shadow-md">
      <canvas ref={canvasRef} className="rounded-lg block" />
    </div>
  );
}

// ─── RedeemVoucher ────────────────────────────────────────────────────────────

export function RedeemVoucher({
  qrToken, shopName, rewardText, accentColor,
}: {
  qrToken: string;
  shopName: string;
  rewardText: string;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const accent = accentColor ?? "#fbbf24";

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, `${window.location.origin}/stamp/${qrToken}`, {
        width: 200, margin: 2, color: { dark: "#0a0a0a", light: "#ffffff" },
      });
    }
  }, [qrToken]);

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      overflow: "hidden",
      boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)",
      width: "100%",
      maxWidth: "280px",
      margin: "0 auto",
    }}>
      {/* Colored header */}
      <div style={{ background: accent, padding: "18px 20px 16px" }}>
        <p style={{
          color: "rgba(0,0,0,0.55)", fontSize: "9px", fontWeight: "800",
          letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "6px",
        }}>
          Gutschein · {shopName}
        </p>
        <p style={{ color: "#000", fontSize: "20px", fontWeight: "900", lineHeight: "1.15" }}>
          {rewardText}
        </p>
        <p style={{ color: "rgba(0,0,0,0.45)", fontSize: "10px", marginTop: "6px" }}>
          Einmalig einlösbar
        </p>
      </div>

      {/* Perforated divider */}
      <div style={{ position: "relative", height: "0", display: "flex", alignItems: "center" }}>
        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#0a0a0a", marginLeft: "-9px", flexShrink: 0 }} />
        <div style={{ flex: 1, borderTop: "2px dashed #d4d4d8", margin: "0 6px" }} />
        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#0a0a0a", marginRight: "-9px", flexShrink: 0 }} />
      </div>

      {/* QR section */}
      <div style={{ background: "#f5f5f5", padding: "20px 20px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
          <canvas ref={canvasRef} style={{ display: "block" }} />
        </div>
        <p style={{ fontSize: "10px", color: "#a1a1aa", textAlign: "center", letterSpacing: "0.05em" }}>
          Mitarbeiter zum Scannen zeigen
        </p>
      </div>
    </div>
  );
}

// ─── MilestonesSection (außerhalb der Karte) ──────────────────────────────────

export function MilestonesSection({
  milestones, totalStampsEver, accent, textColor, textBody, cardBg,
}: {
  milestones: CardTier[];
  totalStampsEver: number;
  accent?: string;
  textColor?: string;
  // Lesbare Sekundär-Textfarbe des Designs; Akzent-Alpha ist auf hellen
  // Hintergründen sonst unsichtbar
  textBody?: string;
  cardBg?: string;
}) {
  const active = milestones.filter(m => m.enabled).sort((a, b) => a.stamps - b.stamps);
  if (!active.length) return null;
  const a = accent ?? "#fbbf24";
  const tc = textColor ?? "#f4f4f5";
  const tb = textBody ?? hexToRgba(tc, 0.6);
  // Für Balken und farbige Schrift: bei hellem Design dunkle Variante
  const aStrong = readableAccent(a, tc);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <div className="flex items-center gap-2 mb-3">
        <Star size={13} style={{ color: aStrong }} />
        <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: tb }}>
          Treue-Meilensteine
        </h3>
      </div>
      <div className="space-y-2">
        {active.map((m, i) => {
          const reached = totalStampsEver >= m.stamps;
          const isNext  = !reached && active.slice(0, i).every(prev => totalStampsEver >= prev.stamps);
          const progress = Math.min(totalStampsEver / m.stamps, 1);
          return (
            <div key={i}
              className="rounded-2xl p-4 flex items-center gap-3 backdrop-blur-sm"
              style={{
                background: cardBg ?? (reached ? hexToRgba(a, 0.13) : hexToRgba(a, 0.05)),
                border: `1px solid ${hexToRgba(a, reached ? 0.35 : 0.15)}`,
              }}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                style={reached
                  ? { background: hexToRgba(a, 0.22), color: aStrong }
                  : { background: hexToRgba(a, 0.07), color: tb }
                }
              >
                {reached ? "✓" : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium truncate"
                    style={{ color: reached ? tc : hexToRgba(tc, isNext ? 0.65 : 0.38) }}>
                    {m.text}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
                    style={reached
                      ? { background: hexToRgba(a, 0.15), color: aStrong }
                      : { background: hexToRgba(a, 0.07), color: tb }
                    }
                  >
                    {totalStampsEver}/{m.stamps}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: hexToRgba(aStrong, 0.12) }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="h-full rounded-full"
                    style={{
                      background: reached ? aStrong : hexToRgba(aStrong, 0.55),
                      boxShadow: reached ? `0 0 6px ${hexToRgba(aStrong, 0.45)}` : undefined,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Tinten-Stempel (Standard- + Config-Karte) ────────────────────────────────

// SVG-Filter für raue Tinten-Kanten der Stempel; Einsatz per filter: url(#id)
export function InkFilter({ id }: { id: string }) {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feComponentTransfer in="noise" result="speckle">
          <feFuncA type="discrete" tableValues="1 1 1 0.8 1 1 0.88 1" />
        </feComponentTransfer>
        <feComposite in="rough" in2="speckle" operator="in" />
      </filter>
    </svg>
  );
}

// Eindeutige Filter-ID pro Karte (useId liefert ":r1:", das in url() nicht geht)
export function useInkId() {
  return `ink-${useId().replace(/:/g, "")}`;
}

// Deterministische "Handstempel"-Schiefe pro Feld (immer gleich, wirkt aber zufällig)
export function stampJitter(i: number) {
  return { rotate: ((i * 37) % 19) - 9, x: ((i * 13) % 5) - 2, y: ((i * 29) % 5) - 2 };
}

// ─── LoyaltyCard ─────────────────────────────────────────────────────────────

export function LoyaltyCard({
  shopName, rewardText, stampsRequired, currentStamps, rewardsRedeemed,
  animateIndex, onShowQR, qrToken, rewardTiers, accentColor, stampIcon, hideQR, stampValue, cardNumber, milestoneBadge,
}: {
  shopName: string;
  rewardText: string;
  stampsRequired: number;
  currentStamps: number;
  rewardsRedeemed: number;
  animateIndex: number | null;
  onShowQR?: () => void;
  qrToken: string;
  rewardTiers?: CardTier[];
  accentColor?: string;
  stampIcon?: string | null;
  hideQR?: boolean;
  stampValue?: number | null;
  cardNumber?: number;
  milestoneBadge?: string | null;
}) {
  const accent = accentColor ?? "#fbbf24";
  const StampIconComponent = getStampIcon(stampIcon);
  const baseTier: CardTier = { stamps: stampsRequired, text: rewardText, enabled: true };
  const activeTiers: CardTier[] = rewardTiers && rewardTiers.some(t => t.enabled)
    ? [baseTier, ...rewardTiers.filter(t => t.enabled)].sort((a, b) => a.stamps - b.stamps)
    : [baseTier];
  const maxStamps = activeTiers[activeTiers.length - 1].stamps;
  const tierThresholds = new Set(activeTiers.map(t => t.stamps));
  const cols = maxStamps <= 6 ? 3 : maxStamps <= 8 ? 4 : maxStamps <= 10 ? 5 : 4;
  const iconSize = cols <= 3 ? 26 : cols <= 4 ? 23 : 21;
  const inkId = useInkId();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className="card-3d rounded-3xl overflow-hidden"
      style={{
        backgroundColor: "#111111",
        border: "1px solid #262626",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}
    >
      {/* Karten-Kopf */}
      <div className="px-6 pt-6 pb-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: accent }}>
              Digitale Stempelkarte
            </p>
            {cardNumber !== undefined && (
              <span className="text-[9px] font-bold tabular-nums px-1.5 py-0.5 rounded-md"
                style={{ background: hexToRgba(accent, 0.1), color: hexToRgba(accent, 0.5) }}>
                #{String(cardNumber).padStart(3, "0")}
              </span>
            )}
            {milestoneBadge && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: hexToRgba(accent, 0.15), color: accent }}>
                {milestoneBadge}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-neutral-100 leading-tight">{shopName}</h2>
          <p className="text-neutral-500 text-sm mt-1">{currentStamps} von {maxStamps} Stempel</p>
        </div>
        {!hideQR && (
          <button onClick={onShowQR} className="shrink-0 flex flex-col items-center gap-1.5 group mt-0.5">
            <QRMini qrToken={qrToken} />
            <span className="text-[9px] group-hover:text-neutral-400 transition-colors" style={{ color: accent }}>
              QR zeigen
            </span>
          </button>
        )}
      </div>

      {/* Stempel-Raster */}
      <div className="px-6 pt-5 pb-6">
        <InkFilter id={inkId} />
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: maxStamps }).map((_, i) => {
            const filled    = i < currentStamps;
            const isNew     = animateIndex === i;
            const isTierEnd = tierThresholds.has(i + 1);
            const j = stampJitter(i);
            return (
              <div key={i} className="aspect-square relative flex items-center justify-center">
                {/* Vorgedrucktes, leeres Feld */}
                <div className="absolute inset-0 rounded-full flex items-center justify-center"
                  style={{
                    border: isTierEnd ? `1.5px dashed ${hexToRgba(accent, 0.55)}` : `1.5px dashed ${hexToRgba(accent, 0.25)}`,
                    background: isTierEnd ? hexToRgba(accent, 0.06) : "transparent",
                  }}>
                  {!filled && (isTierEnd
                    ? <Gift size={iconSize - 4} strokeWidth={1.6} style={{ color: hexToRgba(accent, 0.6) }} />
                    : <span className="select-none font-serif italic text-sm" style={{ color: "#4a4a4a" }}>{i + 1}</span>
                  )}
                </div>

                {/* Tinten-Abdruck (Doppelring + großes Symbol, handgestempelt schief) */}
                {filled && (
                  <motion.div
                    className="absolute inset-[-3px] rounded-full flex items-center justify-center"
                    style={{
                      border: `2.5px solid ${accent}`,
                      boxShadow: `inset 0 0 0 3px transparent, inset 0 0 0 4.5px ${hexToRgba(accent, 0.55)}`,
                      background: hexToRgba(accent, 0.14),
                      filter: `url(#${inkId})`,
                    }}
                    initial={isNew ? { scale: 2.4, opacity: 0, rotate: j.rotate - 25, x: j.x, y: j.y } : false}
                    animate={{ scale: 1, opacity: 0.95, rotate: j.rotate, x: j.x, y: j.y }}
                    transition={isNew ? { duration: 0.22, ease: [0.55, 0, 1, 0.45] } : { duration: 0 }}
                  >
                    {isTierEnd
                      ? <Gift size={iconSize} strokeWidth={2.2} style={{ color: accent }} />
                      : <StampIconComponent size={iconSize} strokeWidth={2.2} style={{ color: accent }} />}
                  </motion.div>
                )}

                {/* Tinten-Ring beim Aufschlag */}
                {isNew && (
                  <motion.div className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ border: `2px solid ${hexToRgba(accent, 0.5)}` }}
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
                    transition={{ duration: 0.45, delay: 0.22, ease: "easeOut" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Belohnungs-Abschnitt */}
      <div className="px-5 pb-6 space-y-2">
        {activeTiers.map((tier, i) => {
          const reached = currentStamps >= tier.stamps;
          return (
            <div
              key={i}
              className="rounded-2xl p-4 flex items-center gap-4 transition-all duration-500"
              style={{
                background: reached
                  ? `linear-gradient(to right, ${hexToRgba(accent, 0.18)}, ${hexToRgba(accent, 0.08)})`
                  : "rgba(255,255,255,0.02)",
                border: reached
                  ? `1px solid ${hexToRgba(accent, 0.45)}`
                  : "1px solid rgba(255,255,255,0.06)",
                opacity: reached ? 1 : 0.45,
              }}
            >
              <Gift size={28} style={{ color: reached ? accent : "#888888", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-wider uppercase mb-0.5"
                  style={{ color: reached ? accent : "#888888" }}>
                  {reached ? "Bereit zum Einlösen" : `Ab ${tier.stamps} Stempeln`}
                </p>
                <p className="font-semibold leading-snug"
                  style={{ color: reached ? "#fefce8" : "#888888" }}>
                  {tier.text}
                </p>
              </div>
              {i === activeTiers.length - 1 && rewardsRedeemed > 0 && (
                <div className="shrink-0 text-center">
                  <p className="text-sm font-bold" style={{ color: reached ? accent : "#666666" }}>{rewardsRedeemed}×</p>
                  <p className="text-[9px] text-neutral-600">genutzt</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
