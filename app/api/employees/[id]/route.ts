import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin, assertEmployeeAccess } from "@/lib/access";
import { normalizeEmployeePosition } from "@/lib/positions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAdmin(user);
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id }, include: { garments: true, station: true } });
  if (!employee) return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  assertEmployeeAccess(user, employee);
  return NextResponse.json(employee);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAdmin(user);
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  assertEmployeeAccess(user, employee);
  const data = await req.json();
  const position = "position" in data ? normalizeEmployeePosition(data.position) : undefined;
  if ("position" in data && !position) {
    return NextResponse.json({ error: "Выберите должность из справочника" }, { status: 400 });
  }
  const allowed = {
    fullName: data.fullName,
    position,
    hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
    firedDate: data.firedDate ? new Date(data.firedDate) : undefined,
    comment: data.comment,
    status: data.status
  };
  return NextResponse.json(await prisma.employee.update({ where: { id }, data: allowed }));
}
