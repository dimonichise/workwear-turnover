import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return NextResponse.json(
    await prisma.garmentHistory.findMany({
      where: { garmentId: id },
      include: { user: true, operation: true },
      orderBy: { createdAt: "desc" }
    })
  );
}
