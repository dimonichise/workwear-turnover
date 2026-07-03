import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertOperationAccess } from "@/lib/access";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const operation = await prisma.operation.findUnique({
      where: { id },
      include: {
        station: true,
        employee: true,
        attachments: true,
        items: { include: { garment: { include: { employee: true, garmentType: true, station: true } } } }
      }
    });
  if (!operation) return NextResponse.json({ error: "Операция не найдена" }, { status: 404 });
  assertOperationAccess(user, operation);
  return NextResponse.json(operation);
}
