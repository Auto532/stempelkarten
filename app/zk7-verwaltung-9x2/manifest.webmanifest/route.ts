import { buildManifest } from "@/lib/buildManifest";

export async function GET() {
  const manifest = buildManifest({
    name: "Stempelkarte Admin",
    shortName: "Admin",
    startUrl: "/zk7-verwaltung-9x2",
    scope: "/zk7-verwaltung-9x2",
    id: "/zk7-admin",
  });
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
