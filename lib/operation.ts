import { GarmentStatus, ItemDirection, OperationType, User } from "@prisma/client";
import { assertAdmin, assertGarmentAccess, assertOperationAccess, assertOperationEditable, isValidDirectionForOperation } from "@/lib/access";
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
  user: Pick<User, "id" | "role" | "stationId">;
  deductionAmount?: number;
}) {
  const operation = await prisma.operation.findUnique({ where: { id: params.operationId } });
  if (!operation) throw new Error("Операция не найдена");
  assertOperationAccess(params.user, operation);
  if (operation.type === OperationType.firing_return) assertAdmin(params.user);
  assertOperationEditable(operation);
  if (!isValidDirectionForOperation(operation.type, params.direction)) {
    throw new Error("Направление не подходит для типа операции");
  }
  if (params.direction === "not_returned" && !params.deductionAmount) {
    throw new Error("Для невозврата обязательна сумма удержания");
  }

  const garment = await prisma.garment.findUnique({ where: { barcode: params.barcode }, include: { employee: true } });
  if (!garment) return { unknown: true, barcode: params.barcode };
  assertGarmentAccess(params.user, garment);
  if (garment.stationId !== operation.stationId) {
    throw new Error("Изделие принадлежит другой СТО");
  }
  if (operation.type === OperationType.firing_return && operation.employeeId !== garment.employeeId) {
    throw new Error("Изделие не закреплено за сотрудником этой операции возврата");
  }
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
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.operationItem.create({
      data: {
        operationId: operation.id,
        garmentId: garment.id,
        direction: params.direction,
        deductionAmount: params.deductionAmount || 0,
        scannedById: params.user.id
      }
    });
    await resetGeneratedExcel(tx, operation.id);
    return created;
  });
  return { item, warning: inOtherBlock ? "Штрих-код уже есть в другом блоке этой операции" : null };
}

export async function moveOperationItem(params: {
  operationId: string;
  itemId: string;
  direction: ItemDirection;
  user: Pick<User, "id" | "role" | "stationId">;
}) {
  const item = await prisma.operationItem.findUnique({
    where: { id: params.itemId },
    include: { operation: true, garment: true }
  });
  if (!item || item.operationId !== params.operationId) throw new Error("Позиция не найдена");
  assertOperationAccess(params.user, item.operation);
  if (item.operation.type === OperationType.firing_return) assertAdmin(params.user);
  assertOperationEditable(item.operation);
  assertGarmentAccess(params.user, item.garment);
  if (!isValidDirectionForOperation(item.operation.type, params.direction)) {
    throw new Error("Направление не подходит для типа операции");
  }
  if (params.direction === "not_returned" && !Number(item.deductionAmount)) {
    throw new Error("Для переноса в невозврат сначала укажите сумму удержания");
  }
  const duplicate = await prisma.operationItem.findFirst({
    where: {
      operationId: item.operationId,
      garmentId: item.garmentId,
      direction: params.direction,
      id: { not: item.id }
    }
  });
  if (duplicate) throw new Error("Изделие уже есть в целевом блоке");

  await prisma.$transaction(async (tx) => {
    await tx.operationItem.update({ where: { id: item.id }, data: { direction: params.direction, scannedById: params.user.id } });
    await resetGeneratedExcel(tx, item.operationId);
  });
}

export async function deleteOperationItem(params: {
  operationId: string;
  itemId: string;
  user: Pick<User, "id" | "role" | "stationId">;
}) {
  const item = await prisma.operationItem.findUnique({
    where: { id: params.itemId },
    include: { operation: true, garment: true }
  });
  if (!item || item.operationId !== params.operationId) throw new Error("Позиция не найдена");
  assertOperationAccess(params.user, item.operation);
  if (item.operation.type === OperationType.firing_return) assertAdmin(params.user);
  assertOperationEditable(item.operation);
  assertGarmentAccess(params.user, item.garment);

  await prisma.$transaction(async (tx) => {
    await tx.operationItem.delete({ where: { id: item.id } });
    if (item.operation.type === OperationType.laundry) {
      await tx.garment.update({ where: { id: item.garmentId }, data: { status: GarmentStatus.with_employee } });
    }
    await resetGeneratedExcel(tx, item.operationId);
  });
}

export async function finalizeOperationGarmentStatuses(operationId: string) {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    include: { items: { include: { garment: true }, orderBy: { scanTime: "asc" } } }
  });
  if (!operation) throw new Error("Операция не найдена");
  if (operation.status === "sent") return;

  await prisma.$transaction(async (tx) => {
    for (const item of operation.items) {
      const newStatus = targetStatus(item.direction);
      await tx.garment.update({ where: { id: item.garmentId }, data: { status: newStatus } });
      await tx.garmentHistory.create({
        data: {
          garmentId: item.garmentId,
          operationId: operation.id,
          eventType: operation.type === OperationType.laundry ? "laundry_finalized" : "firing_return_finalized",
          oldStatus: item.garment.status,
          newStatus,
          userId: item.scannedById
        }
      });
    }
  });
}

async function resetGeneratedExcel(tx: any, operationId: string) {
  await tx.attachment.deleteMany({ where: { operationId, fileType: "excel_detail" } });
  await tx.operation.update({ where: { id: operationId }, data: { status: "draft" } });
}
