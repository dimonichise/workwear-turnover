import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertEmployeeAccess } from "@/lib/access";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const form = await req.formData();
  const employeeId = String(form.get("employeeId"));
  const employee = await prisma.employee.findUnique({ where: { id: employeeId }, include: { garments: true } });
  if (!employee) return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  assertEmployeeAccess(user, employee);
  const operation = await prisma.operation.create({
    data: {
      stationId: employee.stationId,
      employeeId,
      type: "firing_return",
      operationDate: new Date(),
      createdById: user.id
    }
  });
  await prisma.employee.update({ where: { id: employeeId }, data: { status: "fired", firedDate: new Date() } });
  return redirectTo(`/operations/${operation.id}`);
}
