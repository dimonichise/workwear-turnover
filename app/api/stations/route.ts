import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { redirectTo } from "@/lib/http";
import { assertGlobalAdmin, stationScope } from "@/lib/access";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(
    await prisma.station.findMany({
      where: { id: stationScope(user) },
      orderBy: { name: "asc" }
    })
  );
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  assertGlobalAdmin(user);
  if (req.headers.get("content-type")?.includes("application/json")) {
    const data = await req.json();
    return NextResponse.json(
      await prisma.station.create({
        data: {
          name: data.name,
          address: data.address,
          mailTo: data.mailTo || null
        }
      })
    );
  }
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) return NextResponse.json({ error: "Название СТО обязательно" }, { status: 400 });
  await prisma.station.create({
    data: {
      name,
      address: String(form.get("address") || "").trim() || null,
      mailTo: String(form.get("mailTo") || "").trim() || null
    }
  });
  return redirectTo("/settings");
}
