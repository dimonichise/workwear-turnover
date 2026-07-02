import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    name: "Оборот спецодежды",
    short_name: "Спецодежда",
    start_url: "/",
    display: "standalone",
    background_color: "#eef2f1",
    theme_color: "#176b5b",
    icons: []
  });
}
