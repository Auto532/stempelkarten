"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function MeWithToken() {
  const { qrToken } = useParams<{ qrToken: string }>();
  const router = useRouter();

  useEffect(() => {
    if (qrToken) {
      localStorage.setItem("qrToken", qrToken);
      router.replace("/me");
    }
  }, [qrToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-zinc-500 text-sm"
      >
        Laden...
      </motion.div>
    </div>
  );
}
