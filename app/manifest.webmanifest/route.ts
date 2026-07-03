import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "СпецУчёт",
    short_name: "СпецУчёт",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0e7177",
    icons: [
      {
        src: "/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any"
      },
      {
        src: "/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  });
}
