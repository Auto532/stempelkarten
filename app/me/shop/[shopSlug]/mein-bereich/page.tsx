"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowLeft, Stamp, Gift, Send, Check, MessageSquare, Trophy } from "lucide-react";
import { hexToRgba, readableAccent, MilestonesSection } from "../../../components";
import { getShopTheme, DEFAULT_COLORS } from "@/app/me/themes/registry";

const SHOP_LEVELS = [
  { min: 0,   max: 9,        label: "Neuling"     },
  { min: 10,  max: 24,       label: "Stammgast"   },
  { min: 25,  max: 49,       label: "Treue-Kunde" },
  { min: 50,  max: 99,       label: "Loyaler"     },
  { min: 100, max: 199,      label: "VIP"         },
  { min: 200, max: Infinity, label: "Legende"     },
];

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

function monthsAgo(ts: number) {
  const months = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "< 1 Mon.";
  if (months === 1) return "1 Mon.";
  return `${months} Mon.`;
}

export default function MeinBereichPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();

  const [qrToken, setQrToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const sendMessage = useMutation(api.messages.sendMessage);

  useEffect(() => {
    setMounted(true);
    setQrToken(localStorage.getItem("qrToken"));
  }, []);

  const data = useQuery(
    api.customers.getMembershipsForCustomer,
    qrToken ? { qrToken } : "skip"
  );

  if (!mounted || data === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  if (!qrToken || !data) { router.replace("/me"); return null; }

  const entry = data.memberships.find(m => m.shop?.slug === shopSlug);
  if (!entry?.shop || !entry.membership) { router.replace("/me"); return null; }

  const { membership, shop, cardNumber } = entry;
  const theme = getShopTheme(shop);
  const c = theme?.colors ?? DEFAULT_COLORS;
  const cb = () => hexToRgba(c.cardBg, theme ? 0.88 : 0.78);
  // Für Balken, Icons und farbige Schrift: bei hellem Design mit hellem
  // Akzent (z.B. Gelb) die dunkle Textfarbe verwenden
  const a2 = readableAccent(c.accent, c.text);

  const shopLvlIdx = SHOP_LEVELS.findIndex(l => membership.totalStampsEver <= l.max);
  const safeIdx = shopLvlIdx === -1 ? SHOP_LEVELS.length - 1 : shopLvlIdx;
  const lvlData = SHOP_LEVELS[safeIdx];
  const lvlNext = SHOP_LEVELS[safeIdx + 1] ?? null;
  const lvlProgress = lvlNext
    ? (membership.totalStampsEver - lvlData.min) / (lvlNext.min - lvlData.min)
    : 1;

  const handleSend = async () => {
    if (!messageText.trim() || !qrToken) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage({ qrToken, membershipId: membership._id, text: messageText.trim() });
      setSent(true);
      setMessageText("");
      setTimeout(() => setSent(false), 4000);
    } catch {
      setSendError("Konnte nicht gesendet werden. Bitte erneut versuchen.");
    } finally {
      setSending(false);
    }
  };

  const fade = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.07 } });

  return (
    <div className={`min-h-screen px-5 pt-10 pb-12 max-w-sm mx-auto flex flex-col relative ${theme ? "z-[2]" : ""}`}>
      {theme && <theme.Background />}

      {/* Header */}
      <motion.div {...fade(0)} className="flex items-center gap-3 mb-7">
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 backdrop-blur-sm"
          style={{ background: hexToRgba(c.accent, 0.1), border: `1px solid ${hexToRgba(c.accent, 0.2)}` }}>
          <ArrowLeft size={16} style={{ color: a2 }} />
        </button>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: c.textBody }}>
            Mein Bereich
          </p>
          <h1 className="text-base font-bold leading-tight" style={{ color: c.text }}>{shop.name}</h1>
        </div>
        {cardNumber !== undefined && (
          <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm"
            style={{ background: hexToRgba(c.accent, 0.12), color: c.textBody }}>
            #{String(cardNumber).padStart(3, "0")}
          </span>
        )}
      </motion.div>

      {/* Greeting */}
      <motion.p {...fade(1)} className="text-2xl font-bold mb-5 leading-snug" style={{ color: c.text }}>
        Hallo, {data.customer.name.split(" ")[0]} 👋
      </motion.p>

      {/* Stats 3-column */}
      <motion.div {...fade(2)} className="grid grid-cols-3 gap-3 mb-4">
        {[
          { icon: Stamp, value: membership.totalStampsEver, label: "Stempel gesamt" },
          { icon: Gift,  value: membership.rewardsRedeemed, label: "Eingelöst" },
          { icon: Trophy, value: monthsAgo(membership._creationTime), label: `Seit ${formatDate(membership._creationTime)}` },
        ].map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center backdrop-blur-sm"
            style={{ background: cb(), border: `1px solid ${hexToRgba(c.accent, 0.22)}` }}>
            <Icon size={15} style={{ color: a2 }} />
            <p className="text-xl font-bold leading-none" style={{ color: c.text }}>{value}</p>
            <p className="text-[9px] leading-tight" style={{ color: c.textBody }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Level card */}
      <motion.div {...fade(3)} className="rounded-2xl px-5 py-4 mb-4 backdrop-blur-sm"
        style={{ background: cb(), border: `1px solid ${hexToRgba(c.accent, 0.22)}` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ background: a2, color: a2 === c.accent ? "#0e0d0b" : c.cardBg, letterSpacing: "0.06em" }}>
              LVL {safeIdx + 1}
            </span>
            <span className="text-[11px]" style={{ color: c.textBody }}>
              {membership.totalStampsEver} Stempel
            </span>
          </div>
          <span className="text-[11px] font-bold" style={{ color: c.text }}>{lvlData.label}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: hexToRgba(a2, 0.12) }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${lvlProgress * 100}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: a2, boxShadow: `0 0 10px ${hexToRgba(a2, 0.5)}` }} />
        </div>
        {lvlNext && (
          <p className="text-[9px] mt-1.5" style={{ color: c.textBody, opacity: 0.8 }}>
            Nächstes Level bei {lvlNext.min} Stempeln
          </p>
        )}
      </motion.div>

      {/* Milestones */}
      {shop.milestonesEnabled && shop.milestones && (
        <motion.div {...fade(4)} className="mb-4">
          <MilestonesSection
            milestones={shop.milestones}
            totalStampsEver={membership.totalStampsEver}
            accent={shop.customDesignEnabled ? shop.accentColor : undefined}
            textColor={c.text}
            textBody={c.textBody}
            cardBg={cb()}
          />
        </motion.div>
      )}

      {/* Message form */}
      <motion.div {...fade(5)} className="rounded-2xl px-4 py-4 backdrop-blur-sm"
        style={{ background: cb(), border: `1px solid ${hexToRgba(c.accent, 0.22)}` }}>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={14} style={{ color: a2 }} />
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: c.textBody }}>
            Nachricht an {shop.name}
          </p>
        </div>

        {sent ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 py-4 justify-center">
            <Check size={18} className="text-green-400" />
            <span className="text-sm text-green-400 font-medium">Nachricht gesendet!</span>
          </motion.div>
        ) : (
          <>
            <textarea
              value={messageText}
              onChange={e => { setMessageText(e.target.value); setSendError(null); }}
              placeholder="Schreib uns etwas: Feedback, Fragen, Wünsche…"
              maxLength={1000}
              rows={4}
              className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none mb-3"
              style={{
                background: cb(),
                border: `1px solid ${hexToRgba(c.accent, 0.25)}`,
                color: c.text,
              }}
            />
            {sendError && <p className="text-red-400 text-xs mb-2">{sendError}</p>}
            <button
              onClick={handleSend}
              disabled={sending || !messageText.trim()}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 transition-opacity"
              style={{ background: c.accent, color: "#0e0d0b" }}
            >
              <Send size={14} />
              {sending ? "Senden…" : "Nachricht senden"}
            </button>
            <p className="text-[10px] text-center mt-2" style={{ color: c.textBody, opacity: 0.7 }}>
              {messageText.length}/1000
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
