import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  const where = user.role === "admin" ? {} : { stationId: user.stationId || undefined };
  return NextResponse.json(
    await prisma.garment.findMany({
      where,
      include: { station: true, employee: true, garmentType: true },
      orderBy: { updatedAt: "desc" }
    })
  );
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const form = await req.formData();
  const redirectTo = String(form.get("redirectTo") || "/garments");
  const garment = await prisma.garment.create({
    data: {
      barcode: String(form.get("barcode")),
      stationId: String(form.get("stationId") || user.stationId),
      employeeId: String(form.get("employeeId")),
      garmentTypeId: String(form.get("garmentTypeId")),
      label: String(form.get("label") || "") || null,
      status: (String(form.get("status") || "with_employee") as any)
    }
  });
  await prisma.garmentHistory.create({
    data: {
      garmentId: garment.id,
      eventType: "create",
      newStatus: garment.status,
      userId: user.id,
      comment: "Первичное добавление изделия"
    }
  });
  return NextResponse.redirect(new URL(redirectTo, req.url), { status: 303 });
}
