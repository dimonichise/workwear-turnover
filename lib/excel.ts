import ExcelJS from "exceljs";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { excelName, operationFolder } from "@/lib/storage";

const COMPANY_NAME = 'Автопилот ООО "ИНКАМ"';
const COLORS = {
  titleGreen: "B6D7A8",
  receivedGreen: "D9EAD3",
  sentRed: "F4CCCC",
  barcodeYellow: "FFF2CC",
  indexBlue: "00B0F0"
};

const mediumBorder: Partial<ExcelJS.Borders> = {
  top: { style: "medium" },
  left: { style: "medium" },
  bottom: { style: "medium" },
  right: { style: "medium" }
};

const thickTopBorder: Partial<ExcelJS.Borders> = {
  ...mediumBorder,
  top: { style: "thick" }
};

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
  setupLaundrySheet(ws, operation);

  const received = operation.items.filter((item) => item.direction === "received_from_laundry");
  const sent = operation.items.filter((item) => item.direction === "sent_to_laundry");
  const rows = Math.max(21, received.length, sent.length);
  for (let i = 0; i < rows; i++) {
    const rowNumber = 6 + i;
    ws.getCell(rowNumber, 1).value = i + 1;
    ws.getCell(rowNumber, 2).value = received[i] ? garmentName(received[i].garment) : "";
    ws.getCell(rowNumber, 3).value = received[i]?.garment.barcode || "";
    ws.getCell(rowNumber, 4).value = sent[i] ? garmentName(sent[i].garment) : "";
    ws.getCell(rowNumber, 5).value = sent[i]?.garment.barcode || "";
    styleLaundryDataRow(ws, rowNumber);
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
  setupReturnSheet(ws, operation);

  const rows = Math.max(14, operation.items.length);
  for (let i = 0; i < rows; i++) {
    const rowNumber = 6 + i;
    const item = operation.items[i];
    ws.getCell(rowNumber, 1).value = i + 1;
    ws.getCell(rowNumber, 2).value = item ? garmentName(item.garment) : "";
    ws.getCell(rowNumber, 3).value = item?.garment.barcode || "";
    styleReturnDataRow(ws, rowNumber);
  }
  return writeWorkbook(wb, operation, excelName("return", operation.station.name, operation.operationDate));
}

function garmentName(garment: { employee: { fullName: string }; garmentType: { name: string }; label: string | null }) {
  return `${garment.employee.fullName}, ${garment.label || garment.garmentType.name}`;
}

function setupLaundrySheet(ws: ExcelJS.Worksheet, operation: any) {
  ws.views = [{ showGridLines: false }];
  ws.columns = [
    { key: "index", width: 4.86 },
    { key: "receivedName", width: 24.86 },
    { key: "receivedBarcode", width: 19.14 },
    { key: "sentName", width: 34.57 },
    { key: "sentBarcode", width: 18.57 }
  ];
  setDefaultRowHeights(ws, 26);
  mergeAndSet(ws, "B1:E1", COMPANY_NAME, COLORS.titleGreen, thickTopBorder);
  mergeAndSet(ws, "B2:E2", stationLine(operation.station), COLORS.titleGreen, mediumBorder);
  mergeAndSet(ws, "B3:E3", operation.operationDate, COLORS.titleGreen, mediumBorder, "mm-dd-yy");
  mergeAndSet(ws, "B4:C4", "Пришло из стирки", COLORS.receivedGreen, mediumBorder);
  mergeAndSet(ws, "D4:E4", "Отдали в стирку", COLORS.sentRed, mediumBorder);
  setHeaderCell(ws.getCell("B5"), "ФИО, изделие", COLORS.receivedGreen);
  setHeaderCell(ws.getCell("C5"), "Номер", COLORS.receivedGreen);
  setHeaderCell(ws.getCell("D5"), "ФИО, изделие", COLORS.sentRed);
  setHeaderCell(ws.getCell("E5"), "Номер", COLORS.sentRed);
}

function setupReturnSheet(ws: ExcelJS.Worksheet, operation: any) {
  ws.views = [{ showGridLines: false }];
  ws.columns = [
    { key: "index", width: 4.86 },
    { key: "name", width: 40.57 },
    { key: "barcode", width: 38.14 }
  ];
  setDefaultRowHeights(ws, 19);
  mergeAndSet(ws, "B1:C1", COMPANY_NAME, COLORS.titleGreen, thickTopBorder);
  mergeAndSet(ws, "B2:C2", stationLine(operation.station), COLORS.titleGreen, mediumBorder);
  mergeAndSet(ws, "B3:C3", operation.operationDate, COLORS.titleGreen, mediumBorder, "mm-dd-yy");
  mergeAndSet(ws, "B4:C4", "Возврат", COLORS.sentRed, mediumBorder);
  setHeaderCell(ws.getCell("B5"), "ФИО, изделие", COLORS.sentRed);
  setHeaderCell(ws.getCell("C5"), "Номер", COLORS.sentRed);
}

function setDefaultRowHeights(ws: ExcelJS.Worksheet, rows: number) {
  for (let row = 1; row <= rows; row++) {
    ws.getRow(row).height = row === 1 ? 16.5 : 15.75;
  }
}

function mergeAndSet(
  ws: ExcelJS.Worksheet,
  range: string,
  value: string | Date,
  fillColor: string,
  border: Partial<ExcelJS.Borders>,
  numFmt?: string
) {
  ws.mergeCells(range);
  const cell = ws.getCell(range.split(":")[0]);
  cell.value = value;
  cell.numFmt = numFmt || "General";
  cell.font = { name: "Arial", size: 10, bold: true };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.fill = solidFill(fillColor);
  styleRange(ws, range, { fillColor, border, font: cell.font, alignment: cell.alignment, numFmt: cell.numFmt });
}

function setHeaderCell(cell: ExcelJS.Cell, value: string, fillColor: string) {
  cell.value = value;
  cell.font = { name: "Arial", size: 10, bold: false };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.fill = solidFill(fillColor);
  cell.border = mediumBorder;
}

function styleLaundryDataRow(ws: ExcelJS.Worksheet, rowNumber: number) {
  ws.getRow(rowNumber).height = 15.75;
  styleIndexCell(ws.getCell(rowNumber, 1));
  styleTextCell(ws.getCell(rowNumber, 2), COLORS.receivedGreen);
  styleBarcodeCell(ws.getCell(rowNumber, 3));
  styleTextCell(ws.getCell(rowNumber, 4), COLORS.sentRed);
  styleBarcodeCell(ws.getCell(rowNumber, 5));
}

function styleReturnDataRow(ws: ExcelJS.Worksheet, rowNumber: number) {
  ws.getRow(rowNumber).height = 15.75;
  styleIndexCell(ws.getCell(rowNumber, 1));
  styleTextCell(ws.getCell(rowNumber, 2), COLORS.sentRed);
  styleBarcodeCell(ws.getCell(rowNumber, 3));
}

function styleIndexCell(cell: ExcelJS.Cell) {
  cell.font = { name: "Calibri", size: 11 };
  cell.fill = solidFill(COLORS.indexBlue);
  cell.border = mediumBorder;
}

function styleTextCell(cell: ExcelJS.Cell, fillColor: string) {
  cell.font = { name: "Arial", size: 10 };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.fill = solidFill(fillColor);
  cell.border = mediumBorder;
}

function styleBarcodeCell(cell: ExcelJS.Cell) {
  cell.font = { name: "Arial", size: 10 };
  cell.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
  cell.numFmt = "@";
  cell.fill = solidFill(COLORS.barcodeYellow);
  cell.border = mediumBorder;
}

function styleRange(
  ws: ExcelJS.Worksheet,
  range: string,
  options: {
    fillColor: string;
    border: Partial<ExcelJS.Borders>;
    font: Partial<ExcelJS.Font>;
    alignment: Partial<ExcelJS.Alignment>;
    numFmt: string;
  }
) {
  const [start, end] = range.split(":");
  const startCell = ws.getCell(start);
  const endCell = ws.getCell(end);
  for (let row = Number(startCell.row); row <= Number(endCell.row); row++) {
    for (let col = Number(startCell.col); col <= Number(endCell.col); col++) {
      const cell = ws.getCell(row, col);
      cell.fill = solidFill(options.fillColor);
      cell.border = options.border;
      cell.font = options.font;
      cell.alignment = options.alignment;
      cell.numFmt = options.numFmt;
    }
  }
}

function solidFill(color: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: `FF${color}` } };
}

function stationLine(station: { name: string; address: string | null }) {
  return station.address ? `${station.name}, ${station.address}` : station.name;
}

async function writeWorkbook(wb: ExcelJS.Workbook, operation: any, fileName: string) {
  const dir = operationFolder(operation);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  await wb.xlsx.writeFile(filePath);
  const stat = await fs.stat(filePath);
  await prisma.attachment.deleteMany({ where: { operationId: operation.id, fileType: "excel_detail" } });
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
