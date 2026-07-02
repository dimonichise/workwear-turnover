import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  return NextResponse.json(
    await prisma.operation.findUnique({
      where: { id },
      include: {
        station: true,
        employee: true,
        attachments: true,
        items: { include: { garment: { include: { employee: true, garmentType: true, station: true } } } }
      }
    })
  );
}
