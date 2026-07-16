import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin, stationScope } from "@/lib/access";

export async function GET() {
  const user = await requireUser();
  assertAdmin(user);
  return NextResponse.json(
    await prisma.operation.findMany({
      where: { type: "firing_return", stationId: stationScope(user) },
      include: { employee: true, items: true }
    })
  );
}
