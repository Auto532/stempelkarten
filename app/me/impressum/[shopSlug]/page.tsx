"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function ImpressumPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });

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

  return (
    <div className="min-h-screen px-5 pt-10 pb-16 max-w-sm mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors mb-8">
          <ArrowLeft size={15} /> Zurück
        </button>

        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 mb-1">
            {shop.name}
          </p>
          <h1 className="text-2xl font-bold text-zinc-100">Impressum</h1>
          <div className="mt-2 h-px bg-gradient-to-r from-amber-400/40 to-transparent" />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {shop.impressumText}
          </p>
        </div>

        <p className="text-[11px] text-zinc-700 text-center mt-6">
          Digitale Stempelkarte · {shop.name}
        </p>
      </motion.div>
    </div>
  );
}
