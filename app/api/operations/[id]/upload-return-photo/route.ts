import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { returnPhotoName, saveOperationFile } from "@/lib/storage";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const operation = await prisma.operation.findUnique({ where: { id }, include: { station: true } });
  if (!operation) return NextResponse.json({ error: "Операция не найдена" }, { status: 404 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = returnPhotoName(operation.station.name, operation.operationDate, ext);
  const saved = await saveOperationFile(operation, file, fileName);
  await prisma.attachment.create({ data: { operationId: id, fileType: "return_photo", fileName, ...saved } });
  return NextResponse.redirect(new URL(`/operations/${id}`, req.url), { status: 303 });
}
