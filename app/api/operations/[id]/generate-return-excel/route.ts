import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertOperationAccess, assertOperationEditable } from "@/lib/access";
import { generateReturnExcel } from "@/lib/excel";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  assertAdmin(user);
  const { id } = await params;
  const operation = await prisma.operation.findUnique({ where: { id } });
  if (!operation) return NextResponse.json({ error: "Операция не найдена" }, { status: 404 });
  assertOperationAccess(user, operation);
  assertOperationEditable(operation);
  if (operation.type !== "firing_return") return NextResponse.json({ error: "Это не операция возврата" }, { status: 400 });
  await generateReturnExcel(id);
  return redirectTo(`/operations/${id}`);
}
