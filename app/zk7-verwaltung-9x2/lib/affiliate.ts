// Client-Helfer für die Kommunikation mit der Affiliate-App (Partner-Convex).
// Ausgelagert aus der Admin-Page, damit sie zentral und wiederverwendbar sind.

export const AFFILIATE_URL     = process.env.NEXT_PUBLIC_AFFILIATE_CONVEX_URL ?? "";
export const AFFILIATE_APP_URL = process.env.NEXT_PUBLIC_AFFILIATE_APP_URL ?? "http://localhost:3000";

// ConvexError-Texte stehen im HTTP-API-Feld errorData (auch in Produktion);
// errorMessage ist bei anderen Fehlern in Prod nur ein redigiertes "Server Error".
function affiliateError(data: { errorData?: unknown; errorMessage?: string }): Error {
  if (typeof data.errorData === "string") return new Error(data.errorData);
  const msg = data.errorMessage ?? "";
  if (!msg || /Server Error|Uncaught|\[Request ID/i.test(msg)) {
    return new Error("Fehler bei der Partner-App. Bitte nochmal versuchen.");
  }
  return new Error(msg);
}

export async function affiliateQuery(path: string, args: Record<string, unknown>) {
  if (!AFFILIATE_URL) return null;
  const res = await fetch(`${AFFILIATE_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, format: "json", args }),
  });
  const data = await res.json();
  if (data.status === "error") throw affiliateError(data);
  return data.value;
}

export async function affiliateMutation(path: string, args: Record<string, unknown>) {
  if (!AFFILIATE_URL) return null;
  const res = await fetch(`${AFFILIATE_URL}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, format: "json", args }),
  });
  const data = await res.json();
  if (data.status === "error") throw affiliateError(data);
  return data.value;
}

// ── Typen (Partner/Leads/Dashboard) ──────────────────────────────────────────
export type AffiliateStatus = "pending" | "active" | "suspended";
export type LeadStatus = "submitted" | "under_review" | "approved" | "rejected" | "active" | "draft";

export interface AffiliateLead {
  _id: string; _creationTime: number;
  shopName: string; ownerName: string; ownerEmail: string;
  city?: string; businessType?: string;
  affiliateName: string; affiliateCode: string;
  status: LeadStatus;
}

export interface AffiliatePartner {
  _id: string; name: string; email: string;
  referralCode: string; status: AffiliateStatus;
  _creationTime: number;
  company?: string;
  pendingProfile?: Record<string, unknown> | null;
}

export interface AffiliateDashboard {
  leads: { total: number; submitted: number; active: number; rejected: number };
  affiliates: { total: number; pending: number; active: number };
  commissions: { pending: number; confirmed: number; paid: number };
}
