"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BeatesGrillBackground, BeatesGrillLoyaltyCard, BeatesGrillRewardBanner, BeatesGrillMilestonesSection } from "./beatesGrill";
import { AsiaTasteBackground, AsiaTasteLoyaltyCard, AsiaTasteRewardBanner, AsiaTasteMilestonesSection } from "./asiaTaste";
import { BakeryLoyaltyCard, BakeryRewardBanner, BakeryMilestonesSection } from "./bakery";
import type { ComponentType } from "react";

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
    colors: {
      accent:      "#F0844F",
      accentDim:   "#D2603A",
      accentFaint: "#4a2518",
      text:        "#F5ECD6",
      textBody:    "#F4D9AE",
      cardBg:      "#16211a",
      dark:        "#101813",
      divider:     "#6FB08320",
      gradient:    "linear-gradient(135deg, #F0844F, #6FB083)",
      card:    { background: "#16211a", border: "1px solid #6FB08326" },
      sub:     { background: "#101813", border: "1px solid #D2603A2e" },
      input:   { background: "#101813", border: "1px solid #6FB08340", color: "#F5ECD6" },
      badge:   { background: "#6FB08318", border: "1px solid #6FB08330", color: "#6FB083" },
      subCard: { background: "#16211a88", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: AsiaTasteBackground,
    Card:       AsiaTasteLoyaltyCard,
    Banner:     AsiaTasteRewardBanner,
    Milestones: AsiaTasteMilestonesSection,
  },
  "beates-grill": {
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
};

type ShopLike = { customDesignEnabled?: boolean; theme?: string } | null | undefined;

export function getShopTheme(shop: ShopLike): ThemeConfig | null {
  if (!shop?.customDesignEnabled || !shop.theme) return null;
  return THEMES[shop.theme] ?? null;
}
