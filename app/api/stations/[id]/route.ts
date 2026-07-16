import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { redirectTo } from "@/lib/http";
import { assertStationAccess, isGlobalAdmin } from "@/lib/access";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  assertStationAccess(user, id);
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  if (!name) return NextResponse.json({ error: "Название СТО обязательно" }, { status: 400 });

  await prisma.station.update({
    where: { id },
    data: {
      name,
      address: String(form.get("address") || "").trim() || null,
      mailTo: String(form.get("mailTo") || "").trim() || null,
      ...(isGlobalAdmin(user) ? { isActive: form.get("isActive") === "on" } : {})
    }
  });

  return redirectTo("/settings");
}
