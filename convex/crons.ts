import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Täglicher Abgleich der Kundenzahl je Shop mit der Abrechnung
// (Preisstufe in der Affiliate-App), fängt z. B. gelöschte Karten ab.
crons.daily("Kundenzahl an Abrechnung melden", { hourUTC: 2, minuteUTC: 30 }, internal.billingSync.resyncAllCardCounts, {});

export default crons;
