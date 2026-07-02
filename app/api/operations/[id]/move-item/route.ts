import { ItemDirection } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { targetStatus } from "@/lib/operation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const form = await req.formData();
  const itemId = String(form.get("itemId"));
  const direction = String(form.get("direction")) as ItemDirection;
  const item = await prisma.operationItem.findUnique({ where: { id: itemId }, include: { garment: true } });
  if (!item) return NextResponse.json({ error: "Позиция не найдена" }, { status: 404 });
  const newStatus = targetStatus(direction);
  await prisma.$transaction([
    prisma.operationItem.update({ where: { id: itemId }, data: { direction, scannedById: user.id } }),
    prisma.garment.update({ where: { id: item.garmentId }, data: { status: newStatus } }),
    prisma.garmentHistory.create({
      data: {
        garmentId: item.garmentId,
        operationId: id,
        eventType: "move_item",
        oldStatus: item.garment.status,
        newStatus,
        userId: user.id
      }
    })
  ]);
  return NextResponse.redirect(new URL(`/operations/${id}`, req.url), { status: 303 });
}
