import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stempelkarten Admin",
  manifest: "/zk7-verwaltung-9x2/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Admin" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
