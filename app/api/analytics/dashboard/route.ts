import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  const [total, withEmployee, inLaundry, returned, notReturned, deductions] = await Promise.all([
    prisma.garment.count(),
    prisma.garment.count({ where: { status: "with_employee" } }),
    prisma.garment.count({ where: { status: "in_laundry" } }),
    prisma.garment.count({ where: { status: "returned_after_firing" } }),
    prisma.garment.count({ where: { status: "not_returned" } }),
    prisma.operationItem.aggregate({ where: { direction: "not_returned" }, _sum: { deductionAmount: true } })
  ]);
  return NextResponse.json({ total, withEmployee, inLaundry, returned, notReturned, deductions: deductions._sum.deductionAmount || 0 });
}
