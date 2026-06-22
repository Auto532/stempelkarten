"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { motion } from "framer-motion";

export default function BetriebLoginPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const result = useQuery(api.shops.resolveLoginToken, { token });

  useEffect(() => {
    if (!result) return;
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminShopSlug", result.shopSlug);
    localStorage.setItem("adminRole", result.role);

    if (result.role === "mitarbeiter") {
      router.replace(`/betrieb/${result.shopSlug}/scan`);
    } else {
      router.replace(`/betrieb/${result.shopSlug}`);
    }
  }, [result, token, router]);

  if (result === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold">Ungültiger Login-Link</h1>
          <p className="text-zinc-500 mt-2 text-sm">Bitte kontaktiere den Betrieb.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-zinc-500 text-sm"
      >
        Anmelden...
      </motion.div>
    </div>
  );
}
