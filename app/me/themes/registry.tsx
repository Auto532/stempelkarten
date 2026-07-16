"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

// Coded Themes werden dynamisch geladen: Kunden laden nur den Code des Themes
// ihres Shops — nicht alle Themes aller Shops (Bundle bleibt klein, egal wie
// viele Themes dazukommen).
const BeatesGrillBackground        = dynamic(() => import("./beatesGrill").then(m => m.BeatesGrillBackground));
const BeatesGrillLoyaltyCard       = dynamic(() => import("./beatesGrill").then(m => m.BeatesGrillLoyaltyCard));
const BeatesGrillRewardBanner      = dynamic(() => import("./beatesGrill").then(m => m.BeatesGrillRewardBanner));
const BeatesGrillMilestonesSection = dynamic(() => import("./beatesGrill").then(m => m.BeatesGrillMilestonesSection));
const AsiaTasteBackground          = dynamic(() => import("./asiaTaste").then(m => m.AsiaTasteBackground));
const AsiaTasteLoyaltyCard         = dynamic(() => import("./asiaTaste").then(m => m.AsiaTasteLoyaltyCard));
const AsiaTasteRewardBanner        = dynamic(() => import("./asiaTaste").then(m => m.AsiaTasteRewardBanner));
const AsiaTasteMilestonesSection   = dynamic(() => import("./asiaTaste").then(m => m.AsiaTasteMilestonesSection));
const BakeryLoyaltyCard            = dynamic(() => import("./bakery").then(m => m.BakeryLoyaltyCard));
const BakeryRewardBanner           = dynamic(() => import("./bakery").then(m => m.BakeryRewardBanner));
const BakeryMilestonesSection      = dynamic(() => import("./bakery").then(m => m.BakeryMilestonesSection));
const BarberLoyaltyCard            = dynamic(() => import("./barber").then(m => m.BarberLoyaltyCard));
const BarberRewardBanner           = dynamic(() => import("./barber").then(m => m.BarberRewardBanner));
const BarberMilestonesSection      = dynamic(() => import("./barber").then(m => m.BarberMilestonesSection));
const EiszauberBackground          = dynamic(() => import("./eiszauber").then(m => m.EiszauberBackground));
const EiszauberLoyaltyCard         = dynamic(() => import("./eiszauber").then(m => m.EiszauberLoyaltyCard));
const EiszauberRewardBanner        = dynamic(() => import("./eiszauber").then(m => m.EiszauberRewardBanner));
const EiszauberMilestonesSection   = dynamic(() => import("./eiszauber").then(m => m.EiszauberMilestonesSection));
const EntenhausBackground          = dynamic(() => import("./entenhaus").then(m => m.EntenhausBackground));
const EntenhausLoyaltyCard         = dynamic(() => import("./entenhaus").then(m => m.EntenhausLoyaltyCard));
const EntenhausRewardBanner        = dynamic(() => import("./entenhaus").then(m => m.EntenhausRewardBanner));
const EntenhausMilestonesSection   = dynamic(() => import("./entenhaus").then(m => m.EntenhausMilestonesSection));
const Block13Background            = dynamic(() => import("./block13").then(m => m.Block13Background));
const Block13LoyaltyCard           = dynamic(() => import("./block13").then(m => m.Block13LoyaltyCard));
const Block13RewardBanner          = dynamic(() => import("./block13").then(m => m.Block13RewardBanner));
const Block13MilestonesSection     = dynamic(() => import("./block13").then(m => m.Block13MilestonesSection));

type Star = { id: number; x: number; y: number; size: number; delay: number; dur: number };

export function DefaultBackground() {
  const [stars, setStars] = useState<Star[]>([]);
  useEffect(() => {
    setStars(Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() < 0.75 ? 1 : 2,
      delay: Math.random() * 5,
      dur: 2.5 + Math.random() * 3,
    })));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, #05070F 0%, #0A0D1A 60%, #0F0A18 100%)" }} />
      {stars.map(s => (
        <motion.div key={s.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, opacity: 0 }}
          animate={{ opacity: [0.15, s.size > 1 ? 0.9 : 0.6, 0.15] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: "easeInOut" }}
        />
      ))}
      {/* Subtle nebula glow */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 30% 40%, #1A1060 0%, transparent 60%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 50% 40% at 75% 65%, #0A1840 0%, transparent 55%)" }} />
    </div>
  );
}

export function makePhotoBackground(url: string): ComponentType {
  return function PhotoBackground() {
    useEffect(() => {
      const b = document.body;
      b.style.backgroundImage = `url('${url}')`;
      b.style.backgroundSize = "cover";
      b.style.backgroundPosition = "center center";
      b.style.backgroundAttachment = "scroll";
      return () => {
        b.style.backgroundImage = "";
        b.style.backgroundSize = "";
        b.style.backgroundPosition = "";
        b.style.backgroundAttachment = "";
      };
    }, []);
    return null;
  };
}

export interface ThemeColors {
  accent: string;
  accentDim: string;
  accentFaint: string;
  text: string;
  textBody: string;
  cardBg: string;
  dark: string;
  divider: string;
  gradient: string;
  card: { background: string; border: string };
  sub: { background: string; border?: string };
  input: { background: string; border: string; color: string };
  badge: { background: string; border: string; color: string };
  subCard: { background: string; borderRadius: string; padding: string };
}

export type ThemeTier = { stamps: number; text: string; enabled: boolean };

export interface ThemeCardProps {
  shopName: string;
  stampsRequired: number;
  currentStamps: number;
  animateIndex: number | null;
  onShowQR?: () => void;
  qrToken: string;
  hideQR?: boolean;
  rewardTiers?: ThemeTier[];
  accentColor?: string;
  stampValue?: number | null;
  cardNumber?: number;
  milestoneBadge?: string | null;
}

export interface ThemeBannerProps {
  rewardText: string;
  stampsRequired: number;
  rewardTiers?: ThemeTier[];
}

export interface ThemeMilestonesProps {
  milestones: ThemeTier[];
  totalStampsEver: number;
}

export interface ThemeConfig {
  label: string;
  colors: ThemeColors;
  Background: ComponentType;
  Card: ComponentType<ThemeCardProps>;
  Banner: ComponentType<ThemeBannerProps>;
  Milestones: ComponentType<ThemeMilestonesProps>;
}

export const DEFAULT_COLORS: ThemeColors = {
  accent:      "#fbbf24",
  accentDim:   "#71717a",
  accentFaint: "#3f3f46",
  text:        "#f4f4f5",
  textBody:    "#d4d4d8",
  cardBg:      "#18181b",
  dark:        "#27272a",
  divider:     "#27272a",
  gradient:    "#fbbf24",
  card:    { background: "#18181b", border: "1px solid #27272a" },
  sub:     { background: "#27272a" },
  input:   { background: "#27272a", border: "1px solid #3f3f46", color: "#d4d4d8" },
  badge:   { background: "#fbbf2422", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" },
  subCard: { background: "#27272a", borderRadius: "0.75rem", padding: "0.75rem" },
};

const THEMES: Record<string, ThemeConfig> = {
  "bakery": {
    label: "Bäckerei",
    colors: {
      accent:      "#d97706",
      accentDim:   "#b45309",
      accentFaint: "#fef3c7",
      text:        "#451a03",
      textBody:    "#78350f",
      cardBg:      "#fffbeb",
      dark:        "#fef3c7",
      divider:     "#fcd34d40",
      gradient:    "linear-gradient(135deg, #d97706, #b45309)",
      card:    { background: "#fffbeb", border: "1px solid #d9770650" },
      sub:     { background: "#fef9ee", border: "1px solid #fde68a" },
      input:   { background: "#fef9ee", border: "1px solid #fcd34d", color: "#451a03" },
      badge:   { background: "#d9770618", border: "1px solid #d97706", color: "#b45309" },
      subCard: { background: "#fffbeb88", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: makePhotoBackground('/Hintergrund_meisterbaeckerei.png'),
    Card:       BakeryLoyaltyCard,
    Banner:     BakeryRewardBanner,
    Milestones: BakeryMilestonesSection,
  },
  "asia-taste": {
    label: "Asia Taste",
    colors: {
      accent:      "#cf6a35",
      accentDim:   "#85907f",
      accentFaint: "#161e18",
      text:        "#f2ead4",
      textBody:    "#c4bea9",
      cardBg:      "#131a15",
      dark:        "#0d130f",
      divider:     "#27322b",
      gradient:    "linear-gradient(180deg, #e58b50, #cf6a35 55%, #a9501f)",
      card:    { background: "#131a15", border: "1px solid #27322b" },
      sub:     { background: "#161e18", border: "1px solid #27322b" },
      input:   { background: "#161e18", border: "1px solid #27322b", color: "#f2ead4" },
      badge:   { background: "rgba(106,167,117,.13)", border: "1px solid rgba(106,167,117,.32)", color: "#8cc497" },
      subCard: { background: "#13181588", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: AsiaTasteBackground,
    Card:       AsiaTasteLoyaltyCard,
    Banner:     AsiaTasteRewardBanner,
    Milestones: AsiaTasteMilestonesSection,
  },
  "barber": {
    label: "Barbershop",
    colors: {
      accent:      "#d7d2c6",
      accentDim:   "#8d877b",
      accentFaint: "#1a1a1a",
      text:        "#f1e9d6",
      textBody:    "#c3bdb0",
      cardBg:      "#141414",
      dark:        "#0b0b0b",
      divider:     "#2b2b2b",
      gradient:    "linear-gradient(180deg, #f4efe4, #d7d2c6 60%, #8d877b)",
      card:    { background: "#141414", border: "1px solid #2b2b2b" },
      sub:     { background: "#101010", border: "1px solid #2b2b2b" },
      input:   { background: "#181818", border: "1px solid #2b2b2b", color: "#f1e9d6" },
      badge:   { background: "rgba(228,222,208,.12)", border: "1px solid rgba(228,222,208,.3)", color: "#f4efe4" },
      subCard: { background: "#18181888", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: makePhotoBackground('/Hintergrund_barbershop.png'),
    Card:       BarberLoyaltyCard,
    Banner:     BarberRewardBanner,
    Milestones: BarberMilestonesSection,
  },
  "beates-grill": {
    label: "Beate's Grill",
    colors: {
      accent:      "#E8A020",
      accentDim:   "#A06815",
      accentFaint: "#5A3808",
      text:        "#F5E8C0",
      textBody:    "#D4B870",
      cardBg:      "#120900",
      dark:        "#1C1005",
      divider:     "#A0681520",
      gradient:    "linear-gradient(135deg, #E8A020, #B07010)",
      card:    { background: "#120900", border: "1px solid #E8A02028" },
      sub:     { background: "#1C1005", border: "1px solid #A0681520" },
      input:   { background: "#1C1005", border: "1px solid #E8A02030", color: "#D4B870" },
      badge:   { background: "#E8A02022", border: "1px solid #A06815", color: "#F5E8C0" },
      subCard: { background: "#12090088", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: BeatesGrillBackground,
    Card:       BeatesGrillLoyaltyCard,
    Banner:     BeatesGrillRewardBanner,
    Milestones: BeatesGrillMilestonesSection,
  },
  "entenhaus": {
    label: "Entenhaus",
    colors: {
      accent:      "#C9A560",
      accentDim:   "#7E6738",
      accentFaint: "#251610",
      text:        "#F0E4CC",
      textBody:    "#9C8B70",
      cardBg:      "#1C100B",
      dark:        "#0A0504",
      divider:     "rgba(201,166,107,.2)",
      gradient:    "linear-gradient(180deg, #E5C77D, #C9A560 55%, #7E6738)",
      card:    { background: "#1C100B", border: "1px solid rgba(201,166,107,.2)" },
      sub:     { background: "#251610", border: "1px solid rgba(201,166,107,.2)" },
      input:   { background: "#251610", border: "1px solid rgba(201,166,107,.42)", color: "#F0E4CC" },
      badge:   { background: "rgba(176,42,36,.15)", border: "1px solid rgba(200,57,47,.4)", color: "#E5C77D" },
      subCard: { background: "#1C100B88", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: EntenhausBackground,
    Card:       EntenhausLoyaltyCard,
    Banner:     EntenhausRewardBanner,
    Milestones: EntenhausMilestonesSection,
  },
  "block13": {
    label: "Block 13",
    colors: {
      accent:      "#c9a227",
      accentDim:   "#8a6f1b",
      accentFaint: "#1c1a13",
      text:        "#f2ede4",
      textBody:    "rgba(242,237,228,.55)",
      cardBg:      "#17150f",
      dark:        "#0d0c0a",
      divider:     "rgba(201,162,39,.2)",
      gradient:    "linear-gradient(120deg, #e8c96a, #c9a227)",
      card:    { background: "#17150f", border: "1px solid rgba(255,255,255,.06)" },
      sub:     { background: "#1c1a13", border: "1px solid rgba(255,255,255,.08)" },
      input:   { background: "#1c1a13", border: "1px solid rgba(201,162,39,.3)", color: "#f2ede4" },
      badge:   { background: "rgba(201,162,39,.12)", border: "1px solid rgba(201,162,39,.3)", color: "#c9a227" },
      subCard: { background: "#17150f88", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: Block13Background,
    Card:       Block13LoyaltyCard,
    Banner:     Block13RewardBanner,
    Milestones: Block13MilestonesSection,
  },
  "eiszauber": {
    label: "Eiszauber",
    colors: {
      accent:      "#ff4fa0",
      accentDim:   "#c93d82",
      accentFaint: "#ffd6e9",
      text:        "#2c1020",
      textBody:    "#8c6578",
      cardBg:      "#fffafe",
      dark:        "#fff1f8",
      divider:     "rgba(192,80,140,.14)",
      gradient:    "linear-gradient(135deg, #ff4fa0, #c93d82)",
      card:    { background: "rgba(255,250,254,0.95)", border: "1px solid rgba(255,79,160,.14)" },
      sub:     { background: "#fff7fb", border: "1px solid rgba(192,80,140,.14)" },
      input:   { background: "#fff7fb", border: "1px solid rgba(255,79,160,.3)", color: "#2c1020" },
      badge:   { background: "#ffd6e9", border: "1px solid #ff4fa088", color: "#c93d82" },
      subCard: { background: "#fff7fb88", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: EiszauberBackground,
    Card:       EiszauberLoyaltyCard,
    Banner:     EiszauberRewardBanner,
    Milestones: EiszauberMilestonesSection,
  },
};

// Für Admin-Menüs: eine Quelle statt zwei — beim Registrieren eines neuen
// Themes taucht es automatisch in der Auswahl auf.
export const THEME_LIST = Object.entries(THEMES).map(([id, t]) => ({
  id, label: t.label, color: t.colors.accent,
}));

import { makeConfigTheme, type ShopDesignConfig } from "./configTheme";

// Config-Themes cachen, damit getShopTheme bei jedem Render dieselben
// Komponenten-Referenzen liefert (sonst remountet React die Karte ständig).
const configThemeCache = new Map<string, ThemeConfig>();
function getConfigTheme(cfg: ShopDesignConfig): ThemeConfig {
  const key = JSON.stringify(cfg);
  let t = configThemeCache.get(key);
  if (!t) { t = makeConfigTheme(cfg); configThemeCache.set(key, t); }
  return t;
}

type ShopLike = {
  customDesignEnabled?: boolean;
  theme?: string;
  designConfig?: ShopDesignConfig;
} | null | undefined;

export function getShopTheme(shop: ShopLike): ThemeConfig | null {
  if (!shop?.customDesignEnabled) return null;
  // Coded Theme (Signature) hat Vorrang; sonst Config-Design aus der DB.
  if (shop.theme && THEMES[shop.theme]) return THEMES[shop.theme];
  if (shop.designConfig) return getConfigTheme(shop.designConfig);
  return null;
}
