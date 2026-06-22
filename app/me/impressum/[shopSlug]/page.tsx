"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { VintageBackground } from "@/app/me/themes/vintage";
import { GrillBackground } from "@/app/me/themes/grill";
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";

export default function ImpressumPage() {
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

  if (!shop || !shop.impressumText) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <p className="text-zinc-400">Kein Impressum hinterlegt.</p>
        <button onClick={() => router.back()} className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors">
          ← Zurück
        </button>
      </div>
    );
  }

  const isVintage = !!shop.customDesignEnabled && shop.theme === "vintage";
  const isGrill   = !!shop.customDesignEnabled && shop.theme === "grill";

  return (
    <div className={`min-h-screen px-5 pt-10 pb-16 max-w-sm mx-auto relative ${isVintage || isGrill ? "z-[2]" : ""}`}>
      {isVintage && <VintageBackground />}
      {isGrill && <GrillBackground />}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10">

        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm transition-colors mb-8"
          style={{ color: isGrill ? "#8A5030" : isVintage ? "#7A5C12" : "#71717a" }}>
          <ArrowLeft size={15} /> Zurück
        </button>

        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
            style={{ color: isGrill ? "#8A5030" : isVintage ? "#7A5C12" : "#52525b" }}>
            {shop.name}
          </p>
          <h1 className="text-2xl font-bold"
            style={{ color: isGrill ? "#F5D5A8" : isVintage ? "#E8D070" : "#f4f4f5" }}>
            Impressum
          </h1>
          <div className="mt-2 h-px"
            style={{ background: isGrill ? "linear-gradient(to right, #E07A2066, transparent)" : isVintage ? "linear-gradient(to right, #C49A2A66, transparent)" : "linear-gradient(to right, rgba(251,191,36,0.4), transparent)" }} />
        </div>

        <div className="rounded-2xl p-5"
          style={isGrill
            ? { background: "#1E0E04", border: "1px solid #8A401044" }
            : isVintage
            ? { background: "#130A04", border: "1px solid #7A5C1244" }
            : { background: "#18181b", border: "1px solid #27272a" }}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: isGrill ? "#C89060" : isVintage ? "#C8A86A" : "#d4d4d8" }}>
            {shop.impressumText}
          </p>
        </div>

        <p className="text-[11px] text-center mt-6" style={{ color: isGrill ? "#4A2008" : isVintage ? "#3D2510" : "#3f3f46" }}>
          Digitale Stempelkarte · {shop.name}
        </p>
      </motion.div>
    </div>
  );
}
