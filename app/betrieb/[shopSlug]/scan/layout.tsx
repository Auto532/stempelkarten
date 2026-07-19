import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { shopSlug: string } }): Promise<Metadata> {
  return {
    title: "Scanner · Stempelkarte",
    description: "Stempel vergeben für deinen Betrieb",
    manifest: `/betrieb/${params.shopSlug}/scan/manifest.webmanifest`,
    icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Mitarbeiter" },
  };
}

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
