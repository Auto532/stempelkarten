"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Gift, ArrowRight, CheckCircle, Stamp } from "lucide-react";
import { getShopTheme, DEFAULT_COLORS, type ThemeColors } from "@/app/me/themes/registry";
import { useShopThemeSync } from "@/app/hooks/useShopThemeSync";

function AcquisitionPicker({
  value, onChange, c,
}: {
  value: "new" | "returning" | null;
  onChange: (v: "new" | "returning" | null) => void;
  c: ThemeColors;
}) {
  const options: { key: "new" | "returning"; label: string }[] = [
    { key: "new", label: "Bin neu hier" },
    { key: "returning", label: "Komm schon länger" },
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-xs ml-0.5" style={{ color: c.accentDim }}>
        Warst du schon mal hier? <span style={{ color: c.accentFaint }}>(optional)</span>
      </p>
      <div className="flex gap-2">
        {options.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(value === key ? null : key)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={value === key
              ? { background: `${c.accent}22`, border: `1px solid ${c.accentDim}`, color: c.accent }
              : { background: c.cardBg, border: `1px solid ${c.accentFaint}44`, color: c.accentDim }
            }
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function JoinPage() {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const router = useRouter();
  const shop = useQuery(api.shops.getBySlug, { slug: shopSlug });

  const [qrToken, setQrToken] = useState<string | null>(undefined as unknown as null);
  const [tokenLoaded, setTokenLoaded] = useState(false);

  useEffect(() => {
    setQrToken(localStorage.getItem("qrToken"));
    setTokenLoaded(true);
  }, []);

  const existing = useQuery(
    api.memberships.getForCustomerAndShop,
    tokenLoaded && shop && qrToken ? { qrToken, shopId: shop._id } : "skip"
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [acquisitionType, setAcquisitionType] = useState<"new" | "returning" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const registerCustomer = useMutation(api.customers.registerCustomer);
  const createMembership = useMutation(api.memberships.createMembershipForExistingCustomer);

  useEffect(() => {
    if (existing?.membership && qrToken) {
      router.replace(`/me/${qrToken}`);
    }
  }, [existing, qrToken, router]);

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !consent) return;
    setLoading(true); setError("");
    try {
      const { qrToken: newToken } = await registerCustomer({
        name: name.trim(), phone: phone.trim(), shopSlug,
        existingQrToken: qrToken ?? undefined,
        acquisitionType: acquisitionType ?? undefined,
      });
      localStorage.setItem("qrToken", newToken);
      setSuccess(true);
      setTimeout(() => router.push(`/me/${newToken}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Registrieren");
    } finally { setLoading(false); }
  };

  const handleReturningSubmit = async () => {
    if (!qrToken || !shop || !consent) return;
    setLoading(true); setError("");
    try {
      await createMembership({ qrToken, shopId: shop._id, acquisitionType: acquisitionType ?? undefined });
      setSuccess(true);
      setTimeout(() => router.push(`/me/${qrToken}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Hinzufügen");
    } finally { setLoading(false); }
  };

  useShopThemeSync(shop);
  const isLoading = shop === undefined || !tokenLoaded || (qrToken !== null && existing === undefined);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-zinc-500 text-sm">Laden...</motion.div>
      </div>
    );
  }

  if (shop === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold">Shop nicht gefunden</h1>
          <p className="text-zinc-500 mt-2 text-sm">Dieser Link ist ungültig.</p>
        </div>
      </div>
    );
  }

  const theme = getShopTheme(shop);
  const c = theme?.colors ?? DEFAULT_COLORS;
  const customerName = existing?.customer?.name;
  const isReturning = !!qrToken && !!existing && !existing.membership;

  const inputStyle = { background: c.cardBg, border: `1px solid ${c.accentDim}44`, color: c.textBody };
  const btnActive  = { background: c.gradient, color: "#18181b" };
  const btnOff     = { background: c.dark, color: c.accentFaint };

  return (
    <div className={`min-h-screen flex flex-col px-6 py-12 max-w-sm mx-auto relative ${theme ? "z-[2]" : ""}`}>
      {theme && <theme.Background />}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }} className="mb-10 relative z-10">

        {/* Progress stamps */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: shop.stampsRequired }).map((_, i) => (
            <motion.div key={i}
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3, type: "spring" }}
              className="h-2 rounded-full flex-1"
              style={{ background: i < 3 ? c.gradient : c.dark }}
            />
          ))}
        </div>

        <h1 className="text-3xl font-bold tracking-tight" style={{ color: c.text }}>{shop.name}</h1>
        <p className="mt-1 text-sm" style={{ color: c.accentDim }}>Digitale Stempelkarte</p>

        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2"
          style={{ background: `${c.accent}18`, border: `1px solid ${c.accentDim}` }}>
          <Gift size={14} style={{ color: c.accent }} />
          <span className="text-xs font-medium" style={{ color: c.text }}>
            Nach {shop.stampsRequired} Stempeln: {shop.rewardText}
          </span>
        </motion.div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
              <CheckCircle size={64} style={{ color: c.accent }} className="mx-auto" />
            </motion.div>
            <h2 className="text-xl font-bold" style={{ color: c.text }}>
              {isReturning ? "Karte hinzugefügt!" : `Willkommen, ${name}!`}
            </h2>
            <p style={{ color: c.accentDim }} className="text-sm">Deine Stempelkarte wird geladen...</p>
          </motion.div>

        ) : isReturning ? (
          <motion.div key="returning" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }} className="flex flex-col gap-4 flex-1 relative z-10">

            <div className="flex items-center gap-3 rounded-2xl px-5 py-4" style={c.card}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${c.accent}18` }}>
                <Stamp size={18} style={{ color: c.accent }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: c.text }}>
                  Willkommen zurück{customerName ? `, ${customerName}` : ""}!
                </p>
                <p className="text-xs mt-0.5" style={{ color: c.accentDim }}>
                  Füge {shop.name} zu deiner Wallet hinzu.
                </p>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}
            <div className="flex-1" />
            <AcquisitionPicker value={acquisitionType} onChange={setAcquisitionType} c={c} />

            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 shrink-0">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="sr-only" />
                <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                  style={consent
                    ? { background: c.accent, borderColor: c.accent }
                    : { borderColor: c.accentDim, background: c.cardBg }}>
                  {consent && <CheckCircle size={12} className="text-zinc-900" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-xs leading-relaxed" style={{ color: c.accentDim }}>
                Ich stimme zu, dass meine Daten für das Treueprogramm bei{" "}
                <span style={{ color: c.textBody }}>{shop.name}</span> gespeichert werden.
              </span>
            </label>

            <motion.button onClick={handleReturningSubmit} disabled={loading || !consent} whileTap={{ scale: 0.97 }}
              className="w-full py-4 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
              style={consent ? btnActive : btnOff}>
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
                : <><span>Karte hinzufügen</span><ArrowRight size={18} /></>}
            </motion.button>
          </motion.div>

        ) : (
          <motion.form key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }} onSubmit={handleNewSubmit}
            className="flex flex-col gap-4 flex-1 relative z-10">

            <div className="group">
              <label className="block text-xs font-medium mb-2 ml-1" style={{ color: c.accentDim }}>Dein Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: c.accentDim }} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Max Mustermann" required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl placeholder-zinc-600 focus:outline-none transition-all"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-medium mb-2 ml-1" style={{ color: c.accentDim }}>Handynummer</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: c.accentDim }} />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 151 12345678" required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl placeholder-zinc-600 focus:outline-none transition-all"
                  style={inputStyle}
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}
            <div className="flex-1" />
            <AcquisitionPicker value={acquisitionType} onChange={setAcquisitionType} c={c} />

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="sr-only" />
                <div className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                  style={consent
                    ? { background: c.accent, borderColor: c.accent }
                    : { borderColor: c.accentDim, background: c.cardBg }}>
                  {consent && <CheckCircle size={12} className="text-zinc-900" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-xs leading-relaxed" style={{ color: c.accentDim }}>
                Ich stimme zu, dass meine Daten (Name, Telefonnummer) für das Treueprogramm bei{" "}
                <span style={{ color: c.textBody }}>{shop.name}</span> gespeichert und genutzt werden.
              </span>
            </label>

            <motion.button type="submit" disabled={loading || !name.trim() || !phone.trim() || !consent}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
              style={!loading && name.trim() && phone.trim() && consent ? btnActive : btnOff}>
              {loading
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full" />
                : <><span>Jetzt registrieren</span><ArrowRight size={18} /></>}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Legal */}
      <div className="flex justify-center gap-3 pt-4 pb-2 relative z-10">
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
