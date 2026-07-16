import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin, stationScope } from "@/lib/access";

export async function GET() {
  const user = await requireUser();
  assertAdmin(user);
  return NextResponse.json(
    await prisma.garment.findMany({
      where: { status: "in_laundry", stationId: stationScope(user) },
      include: { employee: true, garmentType: true }
    })
  );
}
