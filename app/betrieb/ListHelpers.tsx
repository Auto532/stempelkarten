"use client";

// Listen-Helfer für Betrieb + Mitarbeiter: Listen laden nie alles auf einmal,
// sondern seitenweise mit "Mehr laden"; beim Laden pulsierende Platzhalter.
import { ChevronRight } from "lucide-react";

export const PAGE_SIZE = 20;

export function LoadMore({ status, onMore, color, divColor }: {
  status: "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";
  onMore: () => void; color: string; divColor: string;
}) {
  if (status !== "CanLoadMore" && status !== "LoadingMore") return null;
  return (
    <button onClick={onMore} disabled={status === "LoadingMore"}
      className="w-full py-3 text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-60"
      style={{ color, borderTop: `1px solid ${divColor}` }}>
      {status === "LoadingMore" ? "Lädt…" : <>Mehr laden <ChevronRight size={12} className="rotate-90" /></>}
    </button>
  );
}

export function ListSkeleton({ color, rows = 4 }: { color: string; rows?: number }) {
  return (
    <div className="px-4 py-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: `${color}22` }} />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 rounded-full animate-pulse" style={{ background: `${color}22`, width: `${60 - i * 8}%` }} />
            <div className="h-2 rounded-full animate-pulse" style={{ background: `${color}14`, width: "30%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
