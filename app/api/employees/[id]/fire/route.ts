import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertEmployeeAccess } from "@/lib/access";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  assertEmployeeAccess(user, employee);
  await prisma.employee.update({ where: { id }, data: { status: "fired", firedDate: new Date() } });
  return NextResponse.redirect(new URL(`/employees/${id}`, req.url), { status: 303 });
}
