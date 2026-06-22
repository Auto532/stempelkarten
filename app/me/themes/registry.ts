"use client";

import { VintageBackground, VintageLoyaltyCard, VintageRewardBanner, VintageMilestonesSection } from "./vintage";
import { GrillBackground, GrillLoyaltyCard, GrillRewardBanner, GrillMilestonesSection } from "./grill";
import type { ComponentType } from "react";

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
  vintage: {
    colors: {
      accent:      "#C49A2A",
      accentDim:   "#7A5C12",
      accentFaint: "#3D2510",
      text:        "#E8D070",
      textBody:    "#C8A86A",
      cardBg:      "#130A04",
      dark:        "#1C0E06",
      divider:     "#7A5C1222",
      gradient:    "linear-gradient(135deg,#C49A2A,#7A5C12)",
      card:    { background: "#130A04", border: "1px solid #7A5C1244" },
      sub:     { background: "#1C0E06", border: "1px solid #7A5C1222" },
      input:   { background: "#1C0E06", border: "1px solid #7A5C1244", color: "#C8A86A" },
      badge:   { background: "#C49A2A22", border: "1px solid #7A5C12", color: "#E8D070" },
      subCard: { background: "#1C0E0688", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: VintageBackground,
    Card:       VintageLoyaltyCard,
    Banner:     VintageRewardBanner,
    Milestones: VintageMilestonesSection,
  },
  grill: {
    colors: {
      accent:      "#E07A20",
      accentDim:   "#8A5030",
      accentFaint: "#4A2008",
      text:        "#F5D5A8",
      textBody:    "#C89060",
      cardBg:      "#1E0E04",
      dark:        "#1E0E04",
      divider:     "#8A401022",
      gradient:    "linear-gradient(135deg,#E07A20,#8A4010)",
      card:    { background: "#1E0E04", border: "1px solid #8A401044" },
      sub:     { background: "#1a0804", border: "1px solid #8A401022" },
      input:   { background: "#1E0E0488", border: "1px solid #8A401033", color: "#C89060" },
      badge:   { background: "#E07A2022", border: "1px solid #8A4010", color: "#F5D5A8" },
      subCard: { background: "#1E0E0488", borderRadius: "0.75rem", padding: "0.75rem" },
    },
    Background: GrillBackground,
    Card:       GrillLoyaltyCard,
    Banner:     GrillRewardBanner,
    Milestones: GrillMilestonesSection,
  },
};

type ShopLike = { customDesignEnabled?: boolean; theme?: string } | null | undefined;

export function getShopTheme(shop: ShopLike): ThemeConfig | null {
  if (!shop?.customDesignEnabled || !shop.theme) return null;
  return THEMES[shop.theme] ?? null;
}
