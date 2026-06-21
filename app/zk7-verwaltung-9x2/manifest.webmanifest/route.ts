export async function GET() {
  return Response.json(
    {
      id: "/zk7-admin",
      name: "Stempelkarten Admin",
      short_name: "Admin",
      description: "Super-Admin-Verwaltung",
      start_url: "/zk7-verwaltung-9x2",
      scope: "/zk7-verwaltung-9x2",
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
