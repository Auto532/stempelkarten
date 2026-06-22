"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { getShopTheme, DEFAULT_COLORS } from "@/app/me/themes/registry";
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";

export default function DatenschutzPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });
  useShopThemeSync(shop);

  if (shop === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  if (!shop || !shop.datenschutzText) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-zinc-400">Keine Datenschutzerklärung hinterlegt.</p>
        <button onClick={() => router.back()} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
          ← Zurück
        </button>
      </div>
    );
  }

  const theme = getShopTheme(shop);
  const c = theme?.colors ?? DEFAULT_COLORS;

  return (
    <div className={`min-h-screen px-5 pt-10 pb-16 max-w-sm mx-auto relative ${theme ? "z-[2]" : ""}`}>
      {theme && <theme.Background />}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">

        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm transition-colors mb-8"
          style={{ color: c.accentDim }}>
          <ArrowLeft size={15} /> Zurück
        </button>

        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
            style={{ color: c.accentDim }}>
            {shop.name}
          </p>
          <h1 className="text-2xl font-bold" style={{ color: c.text }}>Datenschutzerklärung</h1>
          <div className="mt-2 h-px"
            style={{ background: `linear-gradient(to right, ${c.accent}66, transparent)` }} />
        </div>

        <div className="rounded-2xl p-5" style={c.card}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: c.textBody }}>
            {shop.datenschutzText}
          </p>
        </div>

        <p className="text-[11px] text-center mt-6" style={{ color: c.accentFaint }}>
          Digitale Stempelkarte · {shop.name}
        </p>
      </motion.div>
    </div>
  );
}
