import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  await requireUser();
  const { itemId } = await params;
  await prisma.operationItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ itemId: string; id: string }> }) {
  await requireUser();
  const { itemId, id } = await params;
  await prisma.operationItem.delete({ where: { id: itemId } });
  return NextResponse.redirect(new URL(`/operations/${id}`, req.url), { status: 303 });
}
