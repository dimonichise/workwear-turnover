import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin, assertStationAccess } from "@/lib/access";
import { redirectTo } from "@/lib/http";
import { normalizeEmployeePosition } from "@/lib/positions";

export async function GET() {
  const user = await requireUser();
  const where = user.role === "admin" ? {} : { stationId: user.stationId || undefined };
  return NextResponse.json(await prisma.employee.findMany({ where, include: { station: true }, orderBy: { fullName: "asc" } }));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  assertAdmin(user);
  const form = await req.formData();
  const stationId = String(form.get("stationId") || user.stationId || "");
  assertStationAccess(user, stationId);
  const position = normalizeEmployeePosition(form.get("position"));
  if (!position) {
    return NextResponse.json({ error: "Выберите должность из справочника" }, { status: 400 });
  }
  const employee = await prisma.employee.create({
    data: {
      stationId,
      fullName: String(form.get("fullName")),
      position,
      hireDate: form.get("hireDate") ? new Date(String(form.get("hireDate"))) : null,
      comment: String(form.get("comment") || "") || null
    }
  });
  return redirectTo(`/employees/${employee.id}`);
}
