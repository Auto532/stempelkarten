import { buildManifest } from "@/lib/buildManifest";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  const { shopSlug: slug } = await params;
  const manifest = buildManifest({
    name: `Stempelkarte Mitarbeiter`,
    shortName: "Mitarbeiter",
    startUrl: `/betrieb/${slug}/scan`,
    scope: `/betrieb/${slug}/scan`,
    id: `/betrieb/${slug}/scan`,
  });
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
