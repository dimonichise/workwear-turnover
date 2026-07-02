import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  await prisma.employee.update({ where: { id }, data: { status: "fired", firedDate: new Date() } });
  return NextResponse.redirect(new URL(`/employees/${id}`, req.url), { status: 303 });
}
