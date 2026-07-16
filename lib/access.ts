import { Employee, Garment, Operation, OperationStatus, OperationType, User } from "@prisma/client";

type ScopedUser = Pick<User, "role" | "stationId">;

export function assertAppSecret() {
  return;
}

export function canUseStation(user: ScopedUser, stationId: string | null | undefined) {
  if (user.role === "admin" && !user.stationId) return true;
  return !!stationId && stationId === user.stationId;
}

export function assertStationAccess(user: ScopedUser, stationId: string | null | undefined) {
  if (!canUseStation(user, stationId)) {
    throw new Response("Недостаточно прав для этой СТО", { status: 403 });
  }
}

export function assertAdmin(user: ScopedUser) {
  if (user.role !== "admin") {
    throw new Response("Недостаточно прав", { status: 403 });
  }
}

export function isAdmin(user: ScopedUser) {
  return user.role === "admin";
}

export function isGlobalAdmin(user: ScopedUser) {
  return user.role === "admin" && !user.stationId;
}

export function assertGlobalAdmin(user: ScopedUser) {
  if (!isGlobalAdmin(user)) {
    throw new Response("Недостаточно прав", { status: 403 });
  }
}

export function stationScope(user: ScopedUser) {
  return isGlobalAdmin(user) ? undefined : user.stationId || "__no_station__";
}

export function assertEmployeeAccess(user: ScopedUser, employee: Pick<Employee, "stationId">) {
  assertStationAccess(user, employee.stationId);
}

export function assertGarmentAccess(user: ScopedUser, garment: Pick<Garment, "stationId">) {
  assertStationAccess(user, garment.stationId);
}

export function assertOperationAccess(user: ScopedUser, operation: Pick<Operation, "stationId">) {
  assertStationAccess(user, operation.stationId);
}

export function assertOperationEditable(operation: Pick<Operation, "status">) {
  if (operation.status === OperationStatus.sent || operation.status === OperationStatus.cancelled) {
    throw new Error("Операция уже закрыта для изменений");
  }
}

export function isValidDirectionForOperation(type: OperationType, direction: string) {
  if (type === OperationType.laundry) {
    return direction === "received_from_laundry" || direction === "sent_to_laundry";
  }
  return direction === "returned_after_firing" || direction === "not_returned";
}

export function assertLocalRedirect(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

export function jsonError(error: unknown, fallback = "Ошибка", status = 400) {
  if (error instanceof Response) return error;
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status });
}
