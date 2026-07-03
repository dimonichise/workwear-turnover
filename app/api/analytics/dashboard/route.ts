import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin } from "@/lib/access";

export async function GET() {
  const user = await requireUser();
  assertAdmin(user);
  const stationWhere = { stationId: user.role === "admin" ? undefined : user.stationId || undefined };
  const [total, withEmployee, inLaundry, returned, notReturned, deductions] = await Promise.all([
    prisma.garment.count({ where: stationWhere }),
    prisma.garment.count({ where: { status: "with_employee", ...stationWhere } }),
    prisma.garment.count({ where: { status: "in_laundry", ...stationWhere } }),
    prisma.garment.count({ where: { status: "returned_after_firing", ...stationWhere } }),
    prisma.garment.count({ where: { status: "not_returned", ...stationWhere } }),
    prisma.operationItem.aggregate({ where: { direction: "not_returned", garment: stationWhere }, _sum: { deductionAmount: true } })
  ]);
  return NextResponse.json({ total, withEmployee, inLaundry, returned, notReturned, deductions: deductions._sum.deductionAmount || 0 });
}
