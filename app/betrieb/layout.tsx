import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stempelkarten Betrieb",
  icons: { icon: "/Icon.png", apple: "/Icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Betrieb" },
};

export default function BetriebLayout({ children }: { children: React.ReactNode }) {
  return children;
}
