import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return NextResponse.json(await prisma.employee.findUnique({ where: { id }, include: { garments: true, station: true } }));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const data = await req.json();
  return NextResponse.json(await prisma.employee.update({ where: { id }, data }));
}
