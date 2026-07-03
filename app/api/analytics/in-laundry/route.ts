import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const user = await requireUser();
  return NextResponse.json(
    await prisma.garment.findMany({
      where: { status: "in_laundry", stationId: user.role === "admin" ? undefined : user.stationId || undefined },
      include: { employee: true, garmentType: true }
    })
  );
}
