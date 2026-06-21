"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Phone, Gift, ArrowRight, CheckCircle, Stamp } from "lucide-react";

function AcquisitionPicker({
  value,
  onChange,
}: {
  value: "new" | "returning" | null;
  onChange: (v: "new" | "returning" | null) => void;
}) {
  const options: { key: "new" | "returning"; label: string }[] = [
    { key: "new", label: "Bin neu hier" },
    { key: "returning", label: "Komm schon länger" },
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-zinc-500 ml-0.5">Warst du schon mal hier? <span className="text-zinc-600">(optional)</span></p>
      <div className="flex gap-2">
        {options.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(value === key ? null : key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              value === key
                ? "bg-amber-400/15 border-amber-400/40 text-amber-400"
                : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
            }`}
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
    tokenLoaded && shop && qrToken
      ? { qrToken, shopId: shop._id }
      : "skip"
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

  // Bestandskunde mit bestehender Mitgliedschaft → direkt weiterleiten
  useEffect(() => {
    if (existing?.membership && qrToken) {
      router.replace(`/me/${qrToken}`);
    }
  }, [existing, qrToken, router]);

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !consent) return;
    setLoading(true);
    setError("");
    try {
      const { qrToken: newToken } = await registerCustomer({
        name: name.trim(),
        phone: phone.trim(),
        shopSlug,
        existingQrToken: qrToken ?? undefined,
        acquisitionType: acquisitionType ?? undefined,
      });
      localStorage.setItem("qrToken", newToken);
      setSuccess(true);
      setTimeout(() => router.push(`/me/${newToken}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Registrieren");
    } finally {
      setLoading(false);
    }
  };

  const handleReturningSubmit = async () => {
    if (!qrToken || !shop || !consent) return;
    setLoading(true);
    setError("");
    try {
      await createMembership({ qrToken, shopId: shop._id, acquisitionType: acquisitionType ?? undefined });
      setSuccess(true);
      setTimeout(() => router.push(`/me/${qrToken}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Hinzufügen");
    } finally {
      setLoading(false);
    }
  };

  const isLoading = shop === undefined || !tokenLoaded || (qrToken !== null && existing === undefined);

  if (isLoading) {
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

  const customerName = existing?.customer?.name;
  const isReturning = !!qrToken && !!existing && !existing.membership;

  return (
    <div className="min-h-screen flex flex-col px-6 py-12 max-w-sm mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: shop.stampsRequired }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3, type: "spring" }}
              className={`h-2 rounded-full flex-1 ${i < 3 ? "bg-amber-400" : "bg-zinc-800"}`}
            />
          ))}
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-zinc-100">{shop.name}</h1>
        <p className="text-zinc-500 mt-1 text-sm">Digitale Stempelkarte</p>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-2"
        >
          <Gift size={14} className="text-amber-400" />
          <span className="text-amber-300 text-xs font-medium">
            Nach {shop.stampsRequired} Stempeln: {shop.rewardText}
          </span>
        </motion.div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle size={64} className="text-amber-400 mx-auto" />
            </motion.div>
            <h2 className="text-xl font-bold text-zinc-100">
              {isReturning ? `Karte hinzugefügt!` : `Willkommen, ${name}!`}
            </h2>
            <p className="text-zinc-500 text-sm">Deine Stempelkarte wird geladen...</p>
          </motion.div>

        ) : isReturning ? (
          /* Bestandskunde, noch kein Mitglied hier */
          <motion.div
            key="returning"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col gap-4 flex-1"
          >
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center shrink-0">
                <Stamp size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-zinc-100 font-semibold">Willkommen zurück{customerName ? `, ${customerName}` : ""}!</p>
                <p className="text-zinc-500 text-xs mt-0.5">Füge {shop.name} zu deiner Wallet hinzu.</p>
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex-1" />

            <AcquisitionPicker value={acquisitionType} onChange={setAcquisitionType} />

            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  consent ? "bg-amber-400 border-amber-400" : "border-zinc-600 bg-zinc-900"
                }`}>
                  {consent && <CheckCircle size={12} className="text-zinc-900" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-xs text-zinc-500 leading-relaxed">
                Ich stimme zu, dass meine Daten für das Treueprogramm bei{" "}
                <span className="text-zinc-300">{shop.name}</span> gespeichert werden.
              </span>
            </label>

            <motion.button
              onClick={handleReturningSubmit}
              disabled={loading || !consent}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full"
                />
              ) : (
                <>
                  Karte hinzufügen
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </motion.div>

        ) : (
          /* Neuer Kunde */
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            onSubmit={handleNewSubmit}
            className="flex flex-col gap-4 flex-1"
          >
            <div className="group">
              <label className="block text-xs font-medium text-zinc-400 mb-2 ml-1">Dein Name</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Max Mustermann"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 focus:bg-zinc-900 transition-all"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-xs font-medium text-zinc-400 mb-2 ml-1">Handynummer</label>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-400 transition-colors" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+49 151 12345678"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 transition-all"
                />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex-1" />

            <AcquisitionPicker value={acquisitionType} onChange={setAcquisitionType} />

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                  consent ? "bg-amber-400 border-amber-400" : "border-zinc-600 bg-zinc-900"
                }`}>
                  {consent && <CheckCircle size={12} className="text-zinc-900" strokeWidth={3} />}
                </div>
              </div>
              <span className="text-xs text-zinc-500 leading-relaxed">
                Ich stimme zu, dass meine Daten (Name, Telefonnummer) für das Treueprogramm bei{" "}
                <span className="text-zinc-300">{shop.name}</span> gespeichert und genutzt werden.
              </span>
            </label>

            <motion.button
              type="submit"
              disabled={loading || !name.trim() || !phone.trim() || !consent}
              whileTap={{ scale: 0.97 }}
              className="w-full py-4 bg-amber-400 hover:bg-amber-300 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full"
                />
              ) : (
                <>
                  Jetzt registrieren
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Legal links */}
      <div className="flex justify-center gap-3 pt-4 pb-2">
        {shop.impressumText && (
          <a href={`/impressum/${shopSlug}`} className="text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors">
            Impressum
          </a>
        )}
        {shop.impressumText && shop.datenschutzText && <span className="text-zinc-800">·</span>}
        {shop.datenschutzText && (
          <a href={`/datenschutz/${shopSlug}`} className="text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors">
            Datenschutz
          </a>
        )}
      </div>
    </div>
  );
}
