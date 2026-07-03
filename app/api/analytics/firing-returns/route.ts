import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin } from "@/lib/access";

export async function GET() {
  const user = await requireUser();
  assertAdmin(user);
  return NextResponse.json(
    await prisma.operation.findMany({
      where: { type: "firing_return", stationId: user.role === "admin" ? undefined : user.stationId || undefined },
      include: { employee: true, items: true }
    })
  );
}
