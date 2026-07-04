import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin } from "@/lib/access";
import { isLaundryDelayed } from "@/lib/laundryDelay";

export async function GET() {
  const user = await requireUser();
  assertAdmin(user);
  const stationWhere = { stationId: user.role === "admin" ? undefined : user.stationId || undefined };
  const [total, withEmployee, inLaundry, delayedLaundryCandidates, deductions] = await Promise.all([
    prisma.garment.count({ where: stationWhere }),
    prisma.garment.count({ where: { status: "with_employee", ...stationWhere } }),
    prisma.garment.count({ where: { status: "in_laundry", ...stationWhere } }),
    prisma.garment.findMany({
      where: { status: "in_laundry", ...stationWhere },
      select: { id: true, operationItems: { where: { direction: "sent_to_laundry", operation: { status: "sent" } }, orderBy: { scanTime: "desc" }, take: 1 } }
    }),
    prisma.operationItem.aggregate({ where: { direction: "not_returned", garment: stationWhere }, _sum: { deductionAmount: true } })
  ]);
  const delayedLaundry = delayedLaundryCandidates.filter((garment) => {
    const scanTime = garment.operationItems[0]?.scanTime;
    return scanTime && isLaundryDelayed(scanTime);
  }).length;
  return NextResponse.json({ total, withEmployee, inLaundry, delayedLaundry, deductions: deductions._sum.deductionAmount || 0 });
}
