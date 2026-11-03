"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { ArrowLeft, Stamp, Gift, Send, Check, MessageSquare, Trophy, Lock, Clock } from "lucide-react";
import { hexToRgba, readableAccent, MilestonesSection } from "../../../components";
import { getShopTheme, DEFAULT_COLORS } from "@/app/me/themes/registry";
import { errMsg } from "@/app/lib/errMsg";

const SHOP_LEVELS = [
  { min: 0,   max: 9,        label: "Neuling"     },
  { min: 10,  max: 24,       label: "Stammgast"   },
  { min: 25,  max: 49,       label: "Treue-Kunde" },
  { min: 50,  max: 99,       label: "Loyaler"     },
  { min: 100, max: 199,      label: "VIP"         },
  { min: 200, max: Infinity, label: "Legende"     },
];

function formatMonth(ts: number) {
  return new Date(ts).toLocaleDateString("de-DE", { month: "short", year: "numeric" });
}

function formatDay(ts: number) {
  return new Date(ts).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
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

  const entry = data?.memberships.find(m => m.shop?.slug === shopSlug);
  const membershipId = entry?.membership?._id;
  // Feedback-Regeln (ab 10 Stempeln, 1 pro Woche) prüft der Server; hier nur Anzeige
  const feedback = useQuery(
    api.messages.getFeedbackStatus,
    qrToken && membershipId ? { qrToken, membershipId } : "skip"
  );

  // Formular automatisch freigeben, sobald die Wochen-Sperre abläuft
  const [now, setNow] = useState(() => Date.now());
  const unlockAt = feedback?.nextAllowedAt ?? null;
  useEffect(() => {
    if (unlockAt === null) return;
    const wait = unlockAt - Date.now();
    if (wait <= 0) { setNow(Date.now()); return; }
    const t = setTimeout(() => setNow(Date.now()), wait + 1000);
    return () => clearTimeout(t);
  }, [unlockAt]);

  if (!mounted || data === undefined) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  if (!qrToken || !data) { router.replace("/me"); return null; }
  if (!entry?.shop || !entry.membership) { router.replace("/me"); return null; }

  const { membership, shop, cardNumber } = entry;
  const theme = getShopTheme(shop);
  const c = theme?.colors ?? DEFAULT_COLORS;
  const cb = () => hexToRgba(c.cardBg, theme ? 0.88 : 0.78);
  // Für Balken, Icons und farbige Schrift: bei hellem Design mit hellem
  // Akzent (z.B. Gelb) die dunkle Textfarbe verwenden
  const a2 = readableAccent(c.accent, c.text);

  // Schwebende Glasfläche (2027-Look): Milchglas, feine Kante, weicher Schatten
  const glass = {
    background: cb(),
    border: `1px solid ${hexToRgba(c.accent, 0.18)}`,
    boxShadow: "0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
  };

  const shopLvlIdx = SHOP_LEVELS.findIndex(l => membership.totalStampsEver <= l.max);
  const safeIdx = shopLvlIdx === -1 ? SHOP_LEVELS.length - 1 : shopLvlIdx;
  const lvlData = SHOP_LEVELS[safeIdx];
  const lvlNext = SHOP_LEVELS[safeIdx + 1] ?? null;
  const lvlProgress = lvlNext
    ? (membership.totalStampsEver - lvlData.min) / (lvlNext.min - lvlData.min)
    : 1;

  const minStamps = feedback?.minStamps ?? 10;
  const missingStamps = Math.max(0, minStamps - membership.totalStampsEver);
  const nextAllowedAt = unlockAt;
  const inCooldown = nextAllowedAt !== null && nextAllowedAt > now;

  const handleSend = async () => {
    if (!messageText.trim() || !qrToken) return;
    setSending(true);
    setSendError(null);
    try {
      await sendMessage({ qrToken, membershipId: membership._id, text: messageText.trim() });
      setSent(true);
      setMessageText("");
    } catch (e: unknown) {
      setSendError(errMsg(e, "Konnte nicht gesendet werden. Bitte erneut versuchen."));
    } finally {
      setSending(false);
    }
  };

  const fade = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const } });

  return (
    <div className={`min-h-screen px-5 pt-10 pb-12 max-w-sm mx-auto flex flex-col relative ${theme ? "z-[2]" : ""}`}>
      {theme && <theme.Background />}

      {/* Zurück: nur der Pfeil, schwebend */}
      <motion.div {...fade(0)} className="mb-4">
        <button onClick={() => router.back()} aria-label="Zurück"
          className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform active:scale-95 backdrop-blur-md"
          style={glass}>
          <ArrowLeft size={18} style={{ color: a2 }} />
        </button>
      </motion.div>

      {/* Begrüßung mit Ladenname und Kartennummer */}
      <motion.div {...fade(1)} className="rounded-3xl px-5 py-5 mb-3 backdrop-blur-md" style={glass}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: c.textBody }}>
            Mein Bereich
          </p>
          {cardNumber !== undefined && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
              style={{ background: hexToRgba(c.accent, 0.12), color: c.textBody }}>
              #{String(cardNumber).padStart(3, "0")}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold leading-snug" style={{ color: c.text }}>
          Hallo, {data.customer.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm mt-0.5" style={{ color: c.textBody }}>{shop.name}</p>
      </motion.div>

      {/* Statistik */}
      <motion.div {...fade(2)} className="grid grid-cols-3 gap-2.5 mb-3">
        {[
          { icon: Stamp,  value: String(membership.totalStampsEver), label: "Stempel gesamt", small: false },
          { icon: Gift,   value: String(membership.rewardsRedeemed), label: "Eingelöst", small: false },
          { icon: Trophy, value: formatMonth(membership._creationTime), label: "Mitglied seit", small: true },
        ].map(({ icon: Icon, value, label, small }) => (
          <div key={label} className="rounded-2xl px-2 py-3.5 flex flex-col items-center gap-1.5 text-center backdrop-blur-md"
            style={glass}>
            <Icon size={14} style={{ color: a2, opacity: 0.75 }} />
            <p className={`${small ? "text-base" : "text-2xl"} font-bold leading-none min-h-6 flex items-center`} style={{ color: c.text }}>{value}</p>
            <p className="text-[12px] leading-tight" style={{ color: c.textBody }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* Level */}
      <motion.div {...fade(3)} className="rounded-3xl px-5 py-4 mb-3 backdrop-blur-md"
        style={{ ...glass, border: `1px solid ${hexToRgba(c.accent, 0.28)}`, boxShadow: `${glass.boxShadow}, 0 0 28px ${hexToRgba(a2, 0.12)}` }}>
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: c.textBody }}>
            Level {safeIdx + 1}
          </p>
          <span className="text-[12px]" style={{ color: c.textBody }}>{membership.totalStampsEver} Stempel</span>
        </div>
        <p className="text-xl font-bold mt-0.5 mb-3" style={{ color: c.text }}>{lvlData.label}</p>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: hexToRgba(a2, 0.12) }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${lvlProgress * 100}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: a2, boxShadow: `0 0 12px ${hexToRgba(a2, 0.55)}` }} />
        </div>
        <p className="text-[12px] mt-2" style={{ color: c.textBody }}>
          {lvlNext
            ? `Noch ${lvlNext.min - membership.totalStampsEver} Stempel bis ${lvlNext.label}`
            : "Höchstes Level erreicht"}
        </p>
      </motion.div>

      {/* Milestones */}
      {shop.milestonesEnabled && shop.milestones && (
        <motion.div {...fade(4)} className="mb-3">
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

      {/* Nachricht an den Laden: gesperrt / Wartezeit / frei */}
      <motion.div {...fade(5)} className="rounded-3xl px-5 py-4 backdrop-blur-md" style={glass}>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare size={15} style={{ color: a2 }} />
          <p className="text-sm font-semibold" style={{ color: c.text }}>Nachricht an {shop.name}</p>
        </div>

        {missingStamps > 0 ? (
          <div className="flex items-start gap-3 py-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: hexToRgba(c.accent, 0.12) }}>
              <Lock size={16} style={{ color: a2 }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: c.text }}>
                Dir fehl{missingStamps === 1 ? "t" : "en"} noch {missingStamps} Stempel
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: c.textBody }}>
                Ab Level 2 ({minStamps} Stempel) kannst du dem Laden schreiben.
              </p>
              <div className="h-1.5 rounded-full overflow-hidden mt-2.5" style={{ background: hexToRgba(a2, 0.12) }}>
                <div className="h-full rounded-full"
                  style={{ width: `${(membership.totalStampsEver / minStamps) * 100}%`, background: a2 }} />
              </div>
            </div>
          </div>
        ) : inCooldown ? (
          <div className="flex items-start gap-3 py-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: sent ? "rgba(74,222,128,0.12)" : hexToRgba(c.accent, 0.12) }}>
              {sent ? <Check size={16} className="text-green-400" /> : <Clock size={16} style={{ color: a2 }} />}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: c.text }}>
                {sent ? "Danke, deine Nachricht ist angekommen!" : "Du hast in den letzten 7 Tagen schon geschrieben"}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: c.textBody }}>
                Nächste Nachricht möglich am {formatDay(nextAllowedAt!)}.
              </p>
            </div>
          </div>
        ) : (
          <>
            <textarea
              value={messageText}
              onChange={e => { setMessageText(e.target.value); setSendError(null); }}
              placeholder="Feedback, Fragen, Wünsche…"
              maxLength={1000}
              rows={4}
              className="w-full rounded-2xl px-3.5 py-3 text-sm resize-none focus:outline-none mb-3"
              style={{
                background: hexToRgba(c.cardBg, 0.6),
                border: `1px solid ${hexToRgba(c.accent, 0.22)}`,
                color: c.text,
              }}
            />
            {sendError && <p className="text-red-400 text-xs mb-2">{sendError}</p>}
            <button
              onClick={handleSend}
              disabled={sending || !messageText.trim() || feedback === undefined}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 transition-all active:scale-[0.98]"
              style={{ background: c.accent, color: "#0e0d0b", boxShadow: `0 6px 20px ${hexToRgba(c.accent, 0.25)}` }}
            >
              <Send size={14} />
              {sending ? "Senden…" : "Nachricht senden"}
            </button>
            <div className="flex justify-between text-[11px] mt-2 px-1" style={{ color: c.textBody, opacity: 0.75 }}>
              <span>Eine Nachricht pro Woche</span>
              <span>{messageText.length}/1000</span>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
