"use client";

import { useEffect, useState } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";

// Chrome/Android liefert beforeinstallprompt, iOS Safari kennt das Event nicht.
// Dort geht die Installation nur manuell über Teilen > Zum Home-Bildschirm,
// deshalb zeigen wir auf iOS eine kurze Anleitung statt eines Buttons.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallHint({
  storageKey,
  title,
  text,
}: {
  storageKey: string;   // eigener Dismiss-Speicher pro App (Kunde/Betrieb)
  title: string;
  text: string;
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;
    if (localStorage.getItem(`pwa-hint-dismissed:${storageKey}`)) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) {
      setIsIos(true);
      setVisible(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [storageKey]);

  const dismiss = () => {
    localStorage.setItem(`pwa-hint-dismissed:${storageKey}`, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setVisible(false);
    setDeferred(null);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md rounded-2xl border border-zinc-700 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur">
      <button onClick={dismiss} aria-label="Hinweis schließen"
        className="absolute right-2.5 top-2.5 rounded-lg p-1 text-zinc-500 hover:text-zinc-300">
        <X size={16} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/30">
          <Download size={17} className="text-amber-400" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-zinc-100">{title}</p>
          <p className="text-xs leading-relaxed text-zinc-400">{text}</p>
          {isIos ? (
            <p className="flex flex-wrap items-center gap-1 text-xs text-zinc-300">
              In Safari unten auf
              <Share size={13} className="inline text-amber-400" />
              <span className="font-semibold">Teilen</span> tippen, dann
              <PlusSquare size={13} className="inline text-amber-400" />
              <span className="font-semibold">Zum Home-Bildschirm</span> wählen.
            </p>
          ) : (
            <button onClick={install}
              className="mt-1 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-900 hover:bg-amber-300">
              Jetzt installieren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
