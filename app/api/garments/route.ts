import { NextRequest, NextResponse } from "next/server";
import { GarmentStatus, ItemDirection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertEmployeeAccess, assertLocalRedirect, assertStationAccess } from "@/lib/access";
import { redirectTo as redirectResponse } from "@/lib/http";
import { addGarmentToOperation } from "@/lib/operation";

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
  const redirectTo = assertLocalRedirect(String(form.get("redirectTo") || "/garments"));
  const stationId = String(form.get("stationId") || user.stationId || "");
  const employeeId = String(form.get("employeeId") || "");
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  assertStationAccess(user, stationId);
  assertEmployeeAccess(user, employee);
  if (employee.stationId !== stationId) {
    return NextResponse.json({ error: "Сотрудник принадлежит другой СТО" }, { status: 400 });
  }
  const rawStatus = String(form.get("status") || "with_employee");
  const status = Object.values(GarmentStatus).includes(rawStatus as GarmentStatus) ? (rawStatus as GarmentStatus) : GarmentStatus.with_employee;
  if (status === "archived" || status === "not_returned") {
    return NextResponse.json({ error: "Этот статус нельзя назначить при создании изделия" }, { status: 400 });
  }
  const garment = await prisma.garment.create({
    data: {
      barcode: String(form.get("barcode")),
      stationId,
      employeeId,
      garmentTypeId: String(form.get("garmentTypeId")),
      label: String(form.get("label") || "") || null,
      status
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
  const operationId = String(form.get("operationId") || "");
  const direction = String(form.get("direction") || "") as ItemDirection;
  if (operationId && Object.values(ItemDirection).includes(direction)) {
    await addGarmentToOperation({
      operationId,
      barcode: garment.barcode,
      direction,
      user
    });
  }
  return redirectResponse(redirectTo);
}
