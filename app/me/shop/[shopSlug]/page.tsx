"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { StampOverlay, QRCard, LoyaltyCard, MilestonesSection } from "../../components";
import { getShopTheme, DEFAULT_COLORS } from "@/app/me/themes/registry";
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";

export default function MeShopPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (searchParams.get("qr") === "1") setShowQR(true);
  }, [searchParams]);
  const [stampAnim, setStampAnim] = useState<number | null>(null);
  const [showStampOverlay, setShowStampOverlay] = useState(false);
  const prevStampsRef = useRef<number | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    setMounted(true);
    setQrToken(localStorage.getItem("qrToken"));
  }, []);

  const data = useQuery(
    api.customers.getMembershipsForCustomer,
    qrToken ? { qrToken } : "skip"
  );

  const entry = data?.memberships.find(m => m.shop?.slug === shopSlug);
  const membership = entry?.membership;
  const shop = entry?.shop;
  useShopThemeSync(shop);

  useEffect(() => {
    if (!membership) return;
    const current = membership.currentStamps;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStampsRef.current = current;
      return;
    }

    const prev = prevStampsRef.current ?? current;
    if (current > prev) {
      setStampAnim(current - 1);
      setShowStampOverlay(true);
      setShowQR(false);
      setTimeout(() => setStampAnim(null), 1200);
    }
    prevStampsRef.current = current;
  }, [membership?.currentStamps]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted || data === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  if (!qrToken || !data || !entry || !shop || !membership) {
    router.replace("/me");
    return null;
  }

  const theme = getShopTheme(shop);
  const c = theme?.colors ?? DEFAULT_COLORS;

  return (
    <div className={`min-h-screen px-5 pt-10 pb-10 max-w-sm mx-auto flex flex-col relative ${theme ? "z-[2]" : ""}`}>

      {theme && <theme.Background />}

      <AnimatePresence>
        {showStampOverlay && <StampOverlay onDone={() => setShowStampOverlay(false)} />}
      </AnimatePresence>

      {/* Zurück-Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-7"
      >
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-zinc-700 transition-colors shrink-0"
        >
          <ArrowLeft size={16} className="text-zinc-400" />
        </button>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Stempelkarte
          </p>
          <h1 className="text-base font-bold text-zinc-100 leading-tight">{shop.name}</h1>
        </div>
      </motion.div>

      {/* QR oder Karte */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {showQR ? (
            <motion.div key="qr"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center gap-5"
            >
              <QRCard qrToken={qrToken} customerName={data.customer.name} />
              <button
                onClick={() => setShowQR(false)}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ← Zurück zur Karte
              </button>
            </motion.div>
          ) : (
            <motion.div key="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {theme ? (
                <>
                  <theme.Card
                    shopName={shop.name}
                    stampsRequired={shop.stampsRequired}
                    currentStamps={membership.currentStamps}
                    animateIndex={stampAnim}
                    onShowQR={() => setShowQR(true)}
                    qrToken={qrToken}
                    rewardTiers={shop.bonusProgramEnabled ? shop.rewardTiers : undefined}
                    accentColor={shop.accentColor}
                  />
                  <theme.Banner rewardText={shop.rewardText} stampsRequired={shop.stampsRequired} rewardTiers={shop.bonusProgramEnabled ? shop.rewardTiers : undefined} />
                  {shop.milestonesEnabled && shop.milestones && (
                    <theme.Milestones milestones={shop.milestones} totalStampsEver={membership.totalStampsEver} />
                  )}
                </>
              ) : (
                <>
                  <LoyaltyCard
                    shopName={shop.name}
                    rewardText={shop.rewardText}
                    stampsRequired={shop.stampsRequired}
                    currentStamps={membership.currentStamps}
                    rewardsRedeemed={membership.rewardsRedeemed}
                    animateIndex={stampAnim}
                    onShowQR={() => setShowQR(true)}
                    qrToken={qrToken}
                    rewardTiers={shop.bonusProgramEnabled ? shop.rewardTiers : undefined}
                    accentColor={shop.customDesignEnabled ? shop.accentColor : undefined}
                    stampIcon={shop.stampIcon}
                  />
                  {shop.milestonesEnabled && shop.milestones && (
                    <MilestonesSection
                      milestones={shop.milestones}
                      totalStampsEver={membership.totalStampsEver}
                      accent={shop.customDesignEnabled ? shop.accentColor : undefined}
                    />
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Legal links */}
      <div className="flex flex-wrap justify-center gap-3 pt-6 pb-2 relative z-10">
        {shop.impressumText && (
          <a href={`/me/impressum/${shopSlug}`} className="text-[11px] transition-colors"
            style={{ color: c.accentDim }}>Impressum</a>
        )}
        {shop.impressumText && shop.datenschutzText && (
          <span style={{ color: c.accentFaint }}>·</span>
        )}
        {shop.datenschutzText && (
          <a href={`/me/datenschutz/${shopSlug}`} className="text-[11px] transition-colors"
            style={{ color: c.accentDim }}>Datenschutz</a>
        )}
      </div>
    </div>
  );
}
