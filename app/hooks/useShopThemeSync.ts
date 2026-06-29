import { useEffect } from "react";

type ShopLike = {
  slug: string;
  theme?: string;
  customDesignEnabled?: boolean;
} | null | undefined;

export function useShopThemeSync(shop: ShopLike) {
  useEffect(() => {
    if (!shop) return;
    const key = `sTheme_${shop.slug}`;
    const active = !!shop.customDesignEnabled && !!shop.theme;
    if (active) {
      localStorage.setItem(key, shop.theme!);
      document.documentElement.setAttribute("data-shop-theme", shop.theme!);
    } else {
      localStorage.removeItem(key);
      document.documentElement.removeAttribute("data-shop-theme");
    }
    return () => {
      document.documentElement.removeAttribute("data-shop-theme");
    };
  }, [shop]);
}
