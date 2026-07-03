import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { redirectTo } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(
    await prisma.station.findMany({
      where: user.role === "admin" ? undefined : { id: user.stationId || undefined },
      orderBy: { name: "asc" }
    })
  );
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  requireAdmin(user.role);
  if (req.headers.get("content-type")?.includes("application/json")) {
    const data = await req.json();
    return NextResponse.json(await prisma.station.create({ data: { name: data.name, address: data.address } }));
  }
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) return NextResponse.json({ error: "Название СТО обязательно" }, { status: 400 });
  await prisma.station.create({
    data: {
      name,
      address: String(form.get("address") || "").trim() || null
    }
  });
  return redirectTo("/settings");
}
