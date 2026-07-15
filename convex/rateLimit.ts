// Einfacher Brute-Force-Schutz für den Admin-PIN (C2).
// Zählt Fehlversuche pro Schlüssel im Zeitfenster und sperrt danach kurz.

import type { MutationCtx } from "./_generated/server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS    = 15 * 60 * 1000;
const LOCK_MS      = 15 * 60 * 1000;

type Throttle = { _id: any; count: number; windowStart: number; lockedUntil?: number } | null;

export async function assertNotLocked(ctx: MutationCtx, key: string): Promise<Throttle> {
  const rec = await ctx.db
    .query("authThrottle")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (rec?.lockedUntil && rec.lockedUntil > Date.now()) {
    const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60000);
    throw new Error(`Zu viele Fehlversuche. Bitte in ${mins} Minute(n) erneut versuchen.`);
  }
  return rec as Throttle;
}

export async function recordFailure(ctx: MutationCtx, key: string, rec: Throttle): Promise<void> {
  const now = Date.now();
  if (!rec) {
    await ctx.db.insert("authThrottle", { key, count: 1, windowStart: now });
    return;
  }
  if (now - rec.windowStart > WINDOW_MS) {
    await ctx.db.patch(rec._id, { count: 1, windowStart: now, lockedUntil: undefined });
    return;
  }
  const count = rec.count + 1;
  await ctx.db.patch(rec._id, {
    count,
    ...(count >= MAX_ATTEMPTS ? { lockedUntil: now + LOCK_MS } : {}),
  });
}

export async function clearFailures(ctx: MutationCtx, rec: Throttle): Promise<void> {
  if (rec) await ctx.db.delete(rec._id);
}

// Konstant-Zeit-String-Vergleich gegen Timing-Leaks beim PIN-Check.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
