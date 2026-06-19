import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./providers";
import { StarField } from "./components/StarField";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Stempelkarte",
  description: "Deine digitale Treuekarte",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Stempelkarte",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={`${jakarta.variable} antialiased bg-zinc-950 text-zinc-100 min-h-screen`}>
        <ConvexClientProvider>
          <StarField />
          <div className="max-w-sm mx-auto min-h-screen relative">
            {children}
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
