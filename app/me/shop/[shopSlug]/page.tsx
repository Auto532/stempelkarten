"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Gift, Check, Banknote } from "lucide-react";
import { StampOverlay, QRCard, RedeemVoucher, LoyaltyCard, MilestonesSection, getActiveTiers, hexToRgba } from "../../components";
import type { CardTier } from "../../components";
import { getShopTheme, DEFAULT_COLORS } from "@/app/me/themes/registry";
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";

const SHOP_LEVELS = [
  { min: 0,   max: 9,        label: "Neuling"     },
  { min: 10,  max: 24,       label: "Stammgast"   },
  { min: 25,  max: 49,       label: "Treue-Kunde" },
  { min: 50,  max: 99,       label: "Loyaler"     },
  { min: 100, max: 199,      label: "VIP"         },
  { min: 200, max: Infinity, label: "Legende"     },
];

export default function MeShopPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showRedeemConfirm, setShowRedeemConfirm] = useState(false);
  const [showRedeemQR, setShowRedeemQR] = useState(false);
  const [redeemedText, setRedeemedText] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [selectedReward, setSelectedReward] = useState<CardTier | null>(null);
  const setPending = useMutation(api.memberships.setPendingRedemption);
  const cancelPending = useMutation(api.memberships.cancelPendingRedemption);

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
    const storedStars = localStorage.getItem("meStarsOn");
    const starsOn = storedStars !== "false";
    const sf = document.getElementById("star-field");
    if (sf) sf.style.display = starsOn ? "" : "none";
    return () => { if (sf) sf.style.display = ""; };
  }, []);

  const data = useQuery(
    api.customers.getMembershipsForCustomer,
    qrToken ? { qrToken } : "skip"
  );

  const entry = data?.memberships.find(m => m.shop?.slug === shopSlug);
  const membership = entry?.membership;
  const shop = entry?.shop;
  const cardNumber = entry?.cardNumber;
  useShopThemeSync(shop);

  const prevPendingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!membership) return;
    const current = membership.currentStamps;
    const hasPending = !!membership.pendingRedemption;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      prevStampsRef.current = current;
      prevPendingRef.current = hasPending;
      return;
    }

    const prev = prevStampsRef.current ?? current;
    const wasPending = prevPendingRef.current;

    // Redemption confirmed by shop: close overlay, card updates automatically
    if (wasPending && !hasPending && current < prev) {
      setShowRedeemQR(false);
    }
    // Normal stamp added
    else if (current > prev && !wasPending) {
      setStampAnim(current - 1);
      setShowStampOverlay(true);
      setShowQR(false);
      setTimeout(() => setStampAnim(null), 1200);
    }

    prevStampsRef.current = current;
    prevPendingRef.current = hasPending;
  }, [membership?.currentStamps, membership?.pendingRedemption]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const activeTiers = getActiveTiers({
    stampsRequired: shop.stampsRequired,
    rewardText: shop.rewardText,
    rewardTiers: shop.bonusProgramEnabled ? shop.rewardTiers : undefined,
  });
  const availableRewards = activeTiers.filter(t => membership.currentStamps >= t.stamps);

  const shopLvlIdx = SHOP_LEVELS.findIndex(l => membership.totalStampsEver <= l.max);
  const safeShopLvlIdx = shopLvlIdx === -1 ? SHOP_LEVELS.length - 1 : shopLvlIdx;
  const shopLvlData = SHOP_LEVELS[safeShopLvlIdx];
  const shopLvlNext = SHOP_LEVELS[safeShopLvlIdx + 1] ?? null;
  const shopLvlProgress = shopLvlNext
    ? (membership.totalStampsEver - shopLvlData.min) / (shopLvlNext.min - shopLvlData.min)
    : 1;

  const openRedeemSheet = () => {
    setSelectedReward(availableRewards[0] ?? null);
    setShowRedeemConfirm(true);
  };

  const handleRedeem = async () => {
    if (!qrToken || !selectedReward) return;
    setRedeeming(true);
    try {
      await setPending({
        qrToken,
        membershipId: membership._id,
        targetStamps: selectedReward.stamps,
      });
      setRedeemedText(selectedReward.text);
      setShowRedeemConfirm(false);
      setShowRedeemQR(true);
    } catch {
      // server validation handles edge cases
    } finally {
      setRedeeming(false);
    }
  };

  const handleCancelRedemption = async () => {
    if (!qrToken) return;
    try {
      await cancelPending({ qrToken, membershipId: membership._id });
    } catch { /* ignore */ }
    setShowRedeemQR(false);
    setSelectedReward(null);
  };

  return (
    <div className={`min-h-screen px-5 pt-10 pb-10 max-w-sm mx-auto flex flex-col relative ${theme ? "z-[2]" : ""}`}>

      {theme && <theme.Background />}

      <AnimatePresence>
        {showStampOverlay && <StampOverlay onDone={() => setShowStampOverlay(false)} />}
      </AnimatePresence>

      {/* Warte-auf-Scan-Overlay: QR zeigen, Shop bestätigt Einlösung */}
      <AnimatePresence>
        {showRedeemQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/98 backdrop-blur-md px-6 gap-5"
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="w-full max-w-xs"
            >
              <RedeemVoucher
                qrToken={qrToken}
                shopName={shop.name}
                rewardText={redeemedText}
                accentColor={c.accent}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="flex items-center gap-2 justify-center mb-1">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400 text-xs font-semibold">Warte auf Bestätigung</span>
              </div>
              <p className="text-zinc-500 text-sm">Mitarbeiter scannt den Code</p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              onClick={handleCancelRedemption}
              className="text-zinc-600 text-sm hover:text-zinc-400 transition-colors"
            >
              Abbrechen
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Bestätigungs-Sheet */}
      <AnimatePresence>
        {showRedeemConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col justify-end"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRedeemConfirm(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative bg-zinc-900 rounded-t-3xl px-5 pt-5 pb-10 max-w-sm w-full mx-auto"
              style={{ border: "1px solid #27272a", borderBottom: "none" }}
            >
              <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3">Belohnung wählen</p>

              {/* Reward-Auswahl */}
              <div className="space-y-2 mb-5">
                {availableRewards.map((reward) => {
                  const active = selectedReward?.stamps === reward.stamps;
                  return (
                    <button
                      key={reward.stamps}
                      onClick={() => setSelectedReward(reward)}
                      className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-left transition-all"
                      style={{
                        background: active ? `${c.accent}12` : "#18181b",
                        border: `1.5px solid ${active ? c.accent : "#27272a"}`,
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: active ? `${c.accent}20` : "#27272a" }}
                      >
                        <Gift size={16} style={{ color: active ? c.accent : "#71717a" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-zinc-100 truncate">{reward.text}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: active ? c.accent + "99" : "#52525b" }}>
                          {reward.stamps} Stempel
                        </p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                        style={{ borderColor: active ? c.accent : "#3f3f46" }}
                      >
                        {active && <div className="w-2 h-2 rounded-full" style={{ background: c.accent }} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <p className="text-zinc-600 text-xs mb-5">
                Deine Stempel werden abgezogen. Zeig den nächsten Bildschirm dem Mitarbeiter.
              </p>
              <button
                onClick={handleRedeem}
                disabled={redeeming || !selectedReward}
                className="w-full py-3.5 rounded-2xl text-base font-bold text-zinc-900 mb-2 disabled:opacity-60"
                style={{ background: c.accent }}
              >
                {redeeming ? "Einlösen…" : "Jetzt einlösen"}
              </button>
              <button onClick={() => setShowRedeemConfirm(false)} className="w-full py-2.5 text-sm text-zinc-500">
                Abbrechen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zurück-Header */}
      {(() => {
        const showBack = showQR || (data.memberships.length > 1);
        return (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-7"
          >
            {showBack && (
              <button
                onClick={() => showQR ? setShowQR(false) : router.back()}
                className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:border-zinc-700 transition-colors shrink-0"
              >
                <ArrowLeft size={16} className="text-zinc-400" />
              </button>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
                Stempelkarte
              </p>
              <h1 className="text-base font-bold text-zinc-100 leading-tight">{shop.name}</h1>
            </div>
          </motion.div>
        );
      })()}

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
              <QRCard
                qrToken={qrToken}
                customerName={data.customer.name}
                shopName={shop.name}
                cardBg={theme?.colors.card.background}
                cardBorder={theme?.colors.card.border}
                textPrimary={theme?.colors.text}
                textMuted={theme?.colors.accentDim}
                accentColor={theme?.colors.accent ?? shop.accentColor}
              />
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
                    stampValue={shop.stampValue}
                    cardNumber={cardNumber}
                  />
                  {shop.stampValue && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="rounded-2xl p-4 flex items-center gap-3"
                      style={{ background: hexToRgba(c.accent, 0.06), border: `1px solid ${hexToRgba(c.accent, 0.15)}` }}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: hexToRgba(c.accent, 0.12) }}>
                        <Banknote size={16} style={{ color: c.accent }} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: c.accent }}>Stempelwert</p>
                        <p className="text-sm font-medium" style={{ color: c.text }}>1 Stempel = €{shop.stampValue} Einkauf</p>
                      </div>
                    </motion.div>
                  )}
                  {availableRewards.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }} whileTap={{ scale: 0.97 }}
                      onClick={openRedeemSheet}
                      className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 text-base font-bold text-zinc-900"
                      style={{ background: c.accent }}
                    >
                      <Gift size={18} />
                      {availableRewards.length > 1 ? `${availableRewards.length} Belohnungen wählen` : "Belohnung einlösen"}
                    </motion.button>
                  )}
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
                    stampValue={shop.stampValue}
                    cardNumber={cardNumber}
                  />
                  {shop.stampValue && (() => {
                    const sa = (shop.customDesignEnabled && shop.accentColor) ? shop.accentColor : "#fbbf24";
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="rounded-2xl p-4 flex items-center gap-3"
                        style={{ background: hexToRgba(sa, 0.06), border: `1px solid ${hexToRgba(sa, 0.15)}` }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: hexToRgba(sa, 0.12) }}>
                          <Banknote size={16} style={{ color: sa }} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: sa }}>Stempelwert</p>
                          <p className="text-sm font-medium text-zinc-300">1 Stempel = €{shop.stampValue} Einkauf</p>
                        </div>
                      </motion.div>
                    );
                  })()}
                  {availableRewards.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }} whileTap={{ scale: 0.97 }}
                      onClick={openRedeemSheet}
                      className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5 text-base font-bold text-zinc-900"
                      style={{ background: c.accent }}
                    >
                      <Gift size={18} />
                      {availableRewards.length > 1 ? `${availableRewards.length} Belohnungen wählen` : "Belohnung einlösen"}
                    </motion.button>
                  )}
                  {shop.milestonesEnabled && shop.milestones && (
                    <MilestonesSection
                      milestones={shop.milestones}
                      totalStampsEver={membership.totalStampsEver}
                      accent={shop.customDesignEnabled ? shop.accentColor : undefined}
                    />
                  )}
                </>
              )}

              {/* Shop-Level */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl px-5 py-4"
                style={{ background: hexToRgba(c.accent, 0.04), border: `1px solid ${hexToRgba(c.accent, 0.12)}` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{ background: c.accent, color: "#0e0d0b", letterSpacing: "0.06em" }}>
                      LVL {safeShopLvlIdx + 1}
                    </span>
                    <span className="text-[11px]" style={{ color: hexToRgba(c.accent, 0.5) }}>
                      {membership.totalStampsEver} Stempel
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: c.accent }}>{shopLvlData.label}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: hexToRgba(c.accent, 0.1) }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${shopLvlProgress * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: c.accent, boxShadow: `0 0 8px ${hexToRgba(c.accent, 0.4)}` }}
                  />
                </div>
                {shopLvlNext && (
                  <p className="text-[9px] mt-1.5" style={{ color: hexToRgba(c.accent, 0.3) }}>
                    Nächstes Level bei {shopLvlNext.min} Stempeln
                  </p>
                )}
              </motion.div>
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
