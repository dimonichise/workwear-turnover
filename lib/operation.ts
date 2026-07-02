import { GarmentStatus, ItemDirection, OperationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function targetStatus(direction: ItemDirection): GarmentStatus {
  if (direction === "sent_to_laundry") return "in_laundry";
  if (direction === "not_returned") return "not_returned";
  if (direction === "returned_after_firing") return "returned_after_firing";
  return "with_employee";
}

export async function addGarmentToOperation(params: {
  operationId: string;
  barcode: string;
  direction: ItemDirection;
  userId: string;
  deductionAmount?: number;
}) {
  const operation = await prisma.operation.findUnique({ where: { id: params.operationId } });
  if (!operation) throw new Error("Операция не найдена");
  const garment = await prisma.garment.findUnique({ where: { barcode: params.barcode } });
  if (!garment) return { unknown: true, barcode: params.barcode };
  if (garment.status === "archived" || garment.status === "not_returned") {
    throw new Error("Изделие в статусе, который требует проверки");
  }

  const duplicate = await prisma.operationItem.findFirst({
    where: { operationId: operation.id, garmentId: garment.id, direction: params.direction }
  });
  if (duplicate) throw new Error("Этот штрих-код уже добавлен в выбранный блок");

  const inOtherBlock = await prisma.operationItem.findFirst({
    where: { operationId: operation.id, garmentId: garment.id, direction: { not: params.direction } }
  });
  const newStatus = targetStatus(params.direction);
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.operationItem.create({
      data: {
        operationId: operation.id,
        garmentId: garment.id,
        direction: params.direction,
        deductionAmount: params.deductionAmount || 0,
        scannedById: params.userId
      }
    });
    await tx.garment.update({ where: { id: garment.id }, data: { status: newStatus } });
    await tx.garmentHistory.create({
      data: {
        garmentId: garment.id,
        operationId: operation.id,
        eventType: operation.type === OperationType.laundry ? "laundry_scan" : "firing_return",
        oldStatus: garment.status,
        newStatus,
        userId: params.userId
      }
    });
    return created;
  });
  return { item, warning: inOtherBlock ? "Штрих-код уже есть в другом блоке этой операции" : null };
}
