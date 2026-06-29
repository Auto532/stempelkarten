export function buildManifest({
  name,
  shortName,
  startUrl,
  scope,
  themeColor = "#18181b",
  backgroundColor = "#09090b",
  id,
}: {
  name: string;
  shortName: string;
  startUrl: string;
  scope: string;
  themeColor?: string;
  backgroundColor?: string;
  id?: string;
}) {
  return {
    id: id ?? startUrl,
    name,
    short_name: shortName,
    start_url: startUrl,
    scope,
    display: "standalone",
    background_color: backgroundColor,
    theme_color: themeColor,
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
