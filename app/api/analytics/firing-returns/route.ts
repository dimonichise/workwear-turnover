import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  return NextResponse.json(await prisma.operation.findMany({ where: { type: "firing_return" }, include: { employee: true, items: true } }));
}
