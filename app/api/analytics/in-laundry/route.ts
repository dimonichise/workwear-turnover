import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  return NextResponse.json(await prisma.garment.findMany({ where: { status: "in_laundry" }, include: { employee: true, garmentType: true } }));
}
