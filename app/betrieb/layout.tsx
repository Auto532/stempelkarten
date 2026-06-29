import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stempelkarten Betrieb",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Betrieb" },
};

export default function BetriebLayout({ children }: { children: React.ReactNode }) {
  return children;
}
