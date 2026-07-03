import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertStationAccess } from "@/lib/access";
import { redirectTo } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  const where = user.role === "admin" ? {} : { stationId: user.stationId || undefined };
  return NextResponse.json(await prisma.employee.findMany({ where, include: { station: true }, orderBy: { fullName: "asc" } }));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const form = await req.formData();
  const stationId = String(form.get("stationId") || user.stationId || "");
  assertStationAccess(user, stationId);
  const employee = await prisma.employee.create({
    data: {
      stationId,
      fullName: String(form.get("fullName")),
      position: String(form.get("position") || "") || null,
      hireDate: form.get("hireDate") ? new Date(String(form.get("hireDate"))) : null,
      comment: String(form.get("comment") || "") || null
    }
  });
  return redirectTo(`/employees/${employee.id}`);
}
