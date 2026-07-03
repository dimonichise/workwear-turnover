import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertGarmentAccess } from "@/lib/access";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const garment = await prisma.garment.findUnique({ where: { id } });
  if (!garment) return NextResponse.json({ error: "Изделие не найдено" }, { status: 404 });
  assertGarmentAccess(user, garment);
  return NextResponse.json(
    await prisma.garmentHistory.findMany({
      where: { garmentId: id },
      include: { user: true, operation: true },
      orderBy: { createdAt: "desc" }
    })
  );
}
