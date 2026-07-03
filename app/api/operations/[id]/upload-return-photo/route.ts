import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertOperationAccess, assertOperationEditable } from "@/lib/access";
import { imageExtension, returnPhotoName, saveOperationFile } from "@/lib/storage";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const operation = await prisma.operation.findUnique({ where: { id }, include: { station: true } });
  if (!operation) return NextResponse.json({ error: "Операция не найдена" }, { status: 404 });
  assertOperationAccess(user, operation);
  assertOperationEditable(operation);
  if (operation.type !== "firing_return") return NextResponse.json({ error: "Фото одежды доступно только для возврата" }, { status: 400 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  try {
    const ext = imageExtension(file);
    const fileName = returnPhotoName(operation.station.name, operation.operationDate, ext);
    const saved = await saveOperationFile(operation, file, fileName);
    await prisma.attachment.deleteMany({ where: { operationId: id, fileType: "return_photo" } });
    await prisma.attachment.create({ data: { operationId: id, fileType: "return_photo", fileName, ...saved } });
    return NextResponse.redirect(new URL(`/operations/${id}`, req.url), { status: 303 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось загрузить фото" }, { status: 400 });
  }
}
