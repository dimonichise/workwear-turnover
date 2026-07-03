import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(
    await prisma.employee.findMany({
      where: { stationId: user.role === "admin" ? undefined : user.stationId || undefined },
      include: { station: true, garments: { include: { garmentType: true } } }
    })
  );
}
