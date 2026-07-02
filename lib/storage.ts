import path from "path";
import fs from "fs/promises";
import { AttachmentType, Operation } from "@prisma/client";
import { fileDate } from "@/lib/format";

export function storageRoot() {
  return process.env.STORAGE_DIR || path.join(process.cwd(), "storage");
}

export function operationFolder(operation: Pick<Operation, "type" | "operationDate">) {
  const section = operation.type === "laundry" ? "laundry" : "returns";
  const d = new Date(operation.operationDate);
  const ymd = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  return path.join(storageRoot(), "operations", section, ymd);
}

export async function saveOperationFile(
  operation: Pick<Operation, "type" | "operationDate">,
  file: File,
  fileName: string
) {
  const dir = operationFolder(operation);
  await fs.mkdir(dir, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, bytes);
  return { filePath, sizeBytes: bytes.length, mimeType: file.type || "application/octet-stream" };
}

export function actName(station: string, date: Date | string, ext = "jpg") {
  return `Акт_${station}_${fileDate(date)}.${ext}`;
}

export function returnPhotoName(station: string, date: Date | string, ext = "jpg") {
  return `Фото_Возврат_${station}_${fileDate(date)}.${ext}`;
}

export function excelName(type: "laundry" | "return", station: string, date: Date | string) {
  return type === "laundry"
    ? `Детализация_${station}_${fileDate(date)}.xlsx`
    : `Детализация_Возврат_${station}_${fileDate(date)}.xlsx`;
}

export function fileTypeLabel(type: AttachmentType) {
  return type === "act_photo" ? "Акт" : type === "return_photo" ? "Фото одежды" : "Excel";
}
