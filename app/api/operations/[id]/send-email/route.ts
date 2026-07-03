import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAdmin, assertOperationAccess } from "@/lib/access";
import { sendOperationEmail } from "@/lib/mail";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const operation = await prisma.operation.findUnique({ where: { id } });
  if (!operation) return NextResponse.json({ error: "Операция не найдена" }, { status: 404 });
  assertOperationAccess(user, operation);
  if (operation.type === "firing_return") assertAdmin(user);
  try {
    await sendOperationEmail(id);
    return redirectTo(`/operations/${id}`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось отправить письмо" }, { status: 400 });
  }
}
