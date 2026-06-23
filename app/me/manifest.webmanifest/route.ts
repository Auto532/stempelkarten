import { buildManifest } from "@/lib/buildManifest";

export async function GET() {
  const manifest = buildManifest({
    name: "Stempelkarte",
    shortName: "Stempelkarte",
    startUrl: "/me",
    scope: "/me",
    id: "/customer-stempelkarte",
  });
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
