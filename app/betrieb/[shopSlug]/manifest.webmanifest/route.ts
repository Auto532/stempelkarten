import { buildManifest } from "@/lib/buildManifest";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shopSlug: string }> }
) {
  const { shopSlug: slug } = await params;
  const manifest = buildManifest({
    name: `Stempelkarte Inhaber`,
    shortName: "Inhaber",
    startUrl: `/betrieb/${slug}`,
    scope: `/betrieb/${slug}`,
    id: `/betrieb/${slug}`,
  });
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
