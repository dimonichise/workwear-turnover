import ExcelJS from "exceljs";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { excelName, operationFolder } from "@/lib/storage";
import { statusNames } from "@/lib/format";

export async function generateLaundryExcel(operationId: string) {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    include: {
      station: true,
      items: { include: { garment: { include: { employee: true, garmentType: true } } }, orderBy: { scanTime: "asc" } }
    }
  });
  if (!operation) throw new Error("Операция не найдена");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Стирка");
  ws.columns = [
    { header: "ФИО, изделие", key: "receivedName", width: 34 },
    { header: "Номер", key: "receivedBarcode", width: 18 },
    { header: "ФИО, изделие", key: "sentName", width: 34 },
    { header: "Номер", key: "sentBarcode", width: 18 }
  ];
  ws.getRow(1).font = { bold: true };
  const received = operation.items.filter((item) => item.direction === "received_from_laundry");
  const sent = operation.items.filter((item) => item.direction === "sent_to_laundry");
  const rows = Math.max(received.length, sent.length);
  for (let i = 0; i < rows; i++) {
    ws.addRow({
      receivedName: received[i] ? garmentName(received[i].garment) : "",
      receivedBarcode: received[i]?.garment.barcode || "",
      sentName: sent[i] ? garmentName(sent[i].garment) : "",
      sentBarcode: sent[i]?.garment.barcode || ""
    });
  }
  return writeWorkbook(wb, operation, excelName("laundry", operation.station.name, operation.operationDate));
}

export async function generateReturnExcel(operationId: string) {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    include: {
      station: true,
      employee: true,
      items: { include: { garment: { include: { employee: true, garmentType: true } } }, orderBy: { scanTime: "asc" } }
    }
  });
  if (!operation) throw new Error("Операция не найдена");

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Возврат");
  ws.columns = [
    { header: "ФИО сотрудника", key: "employee", width: 32 },
    { header: "Изделие", key: "garment", width: 24 },
    { header: "Номер", key: "barcode", width: 20 },
    { header: "Статус", key: "status", width: 18 },
    { header: "Сумма удержания", key: "deduction", width: 18 }
  ];
  ws.getRow(1).font = { bold: true };
  for (const item of operation.items) {
    ws.addRow({
      employee: item.garment.employee.fullName,
      garment: item.garment.label || item.garment.garmentType.name,
      barcode: item.garment.barcode,
      status: item.direction === "not_returned" ? "Не возвращено" : "Возвращено",
      deduction: Number(item.deductionAmount)
    });
  }
  return writeWorkbook(wb, operation, excelName("return", operation.station.name, operation.operationDate));
}

function garmentName(garment: { employee: { fullName: string }; garmentType: { name: string }; label: string | null }) {
  return `${garment.employee.fullName}, ${garment.label || garment.garmentType.name}`;
}

async function writeWorkbook(wb: ExcelJS.Workbook, operation: any, fileName: string) {
  const dir = operationFolder(operation);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  await wb.xlsx.writeFile(filePath);
  const stat = await fs.stat(filePath);
  await prisma.attachment.create({
    data: {
      operationId: operation.id,
      fileType: "excel_detail",
      fileName,
      filePath,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: stat.size
    }
  });
  await prisma.operation.update({ where: { id: operation.id }, data: { status: "ready" } });
  return { fileName, filePath, sizeBytes: stat.size };
}
