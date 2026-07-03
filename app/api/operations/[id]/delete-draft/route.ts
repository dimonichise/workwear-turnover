import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin, assertOperationAccess } from "@/lib/access";
import { redirectTo } from "@/lib/http";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const operation = await prisma.operation.findUnique({ where: { id }, include: { attachments: true } });
  if (!operation) return NextResponse.json({ error: "Операция не найдена" }, { status: 404 });
  assertOperationAccess(user, operation);
  if (operation.type === "firing_return") assertAdmin(user);
  if (operation.status === "sent") {
    return NextResponse.json({ error: "Проведённую операцию удалить нельзя" }, { status: 400 });
  }

  for (const attachment of operation.attachments) {
    await fs.unlink(attachment.filePath).catch(() => undefined);
  }
  await prisma.operation.delete({ where: { id } });
  return redirectTo("/operations");
}
