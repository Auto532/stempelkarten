export async function GET(_req: Request, { params }: { params: { shopSlug: string } }) {
  const { shopSlug } = params;
  return Response.json(
    {
      name: "Stempelkarten Betrieb",
      short_name: "Betrieb",
      description: "Stempelkarten-Scanner für deinen Betrieb",
      start_url: `/betrieb/${shopSlug}`,
      display: "standalone",
      background_color: "#09090b",
      theme_color: "#18181b",
      orientation: "portrait",
      icons: [
        { src: "/Icon.png", sizes: "192x192", type: "image/png" },
        { src: "/Icon.png", sizes: "512x512", type: "image/png" },
        { src: "/Icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
