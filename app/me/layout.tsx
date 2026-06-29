import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stempelkarte",
  manifest: "/me/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Stempelkarte" },
};

export default function MeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
