import { OperationStatus, OperationType, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stationScope } from "@/lib/access";

type ScopedUser = Pick<User, "role" | "stationId">;

export async function getVisibleOperations(user: ScopedUser) {
  const stationFilter = stationScope(user);
  const typeFilter = user.role === "admin" ? undefined : OperationType.laundry;
  const [sent, active] = await Promise.all([
    prisma.operation.findMany({
      where: {
        stationId: stationFilter,
        type: typeFilter,
        status: OperationStatus.sent
      },
      include: { station: true, employee: true, _count: { select: { items: true, attachments: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.operation.findMany({
      where: {
        stationId: stationFilter,
        type: typeFilter,
        status: { in: [OperationStatus.draft, OperationStatus.ready] }
      },
      include: { station: true, employee: true, _count: { select: { items: true, attachments: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const activeByStationAndType = new Map<string, (typeof active)[number]>();
  for (const operation of active) {
    const key = `${operation.stationId}:${operation.type}`;
    if (!activeByStationAndType.has(key)) activeByStationAndType.set(key, operation);
  }

  return [...activeByStationAndType.values(), ...sent].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
