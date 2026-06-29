import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { shopSlug: string } }): Promise<Metadata> {
  return {
    title: "Stempelkarten Betrieb",
    description: "Stempelkarten-Scanner für deinen Betrieb",
    manifest: `/betrieb/${params.shopSlug}/manifest.webmanifest`,
    icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Betrieb" },
  };
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
