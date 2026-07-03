import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertOperationAccess, assertOperationEditable } from "@/lib/access";
import { actName, imageExtension, saveOperationFile } from "@/lib/storage";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const operation = await prisma.operation.findUnique({ where: { id }, include: { station: true } });
  if (!operation) return NextResponse.json({ error: "Операция не найдена" }, { status: 404 });
  assertOperationAccess(user, operation);
  assertOperationEditable(operation);
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  try {
    const ext = imageExtension(file);
    const fileName = actName(operation.station.name, operation.operationDate, ext);
    const saved = await saveOperationFile(operation, file, fileName);
    await prisma.attachment.deleteMany({ where: { operationId: id, fileType: "act_photo" } });
    await prisma.attachment.create({ data: { operationId: id, fileType: "act_photo", fileName, ...saved } });
    return redirectTo(`/operations/${id}`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось загрузить акт" }, { status: 400 });
  }
}
