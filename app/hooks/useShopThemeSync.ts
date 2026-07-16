import { useEffect } from "react";

type ShopLike = {
  slug: string;
  theme?: string;
  customDesignEnabled?: boolean;
  designConfig?: unknown;
} | null | undefined;

export function useShopThemeSync(shop: ShopLike) {
  useEffect(() => {
    if (!shop) return;
    const key = `sTheme_${shop.slug}`;
    // Coded Theme ODER Config-Design (Editor) — beide blenden den
    // Default-Sternenhimmel aus (html[data-shop-theme] #star-field in globals.css)
    const themeKey = shop.theme ?? (shop.designConfig ? "config" : undefined);
    const active = !!shop.customDesignEnabled && !!themeKey;
    if (active) {
      localStorage.setItem(key, themeKey!);
      document.documentElement.setAttribute("data-shop-theme", themeKey!);
    } else {
      localStorage.removeItem(key);
      document.documentElement.removeAttribute("data-shop-theme");
    }
    return () => {
      document.documentElement.removeAttribute("data-shop-theme");
    };
  }, [shop]);
}
