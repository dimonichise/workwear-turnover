import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertGarmentAccess } from "@/lib/access";

export async function GET(_: NextRequest, { params }: { params: Promise<{ barcode: string }> }) {
  const user = await requireUser();
  const { barcode } = await params;
  const garment = await prisma.garment.findUnique({
    where: { barcode },
    include: { employee: true, garmentType: true, station: true }
  });
  if (garment) assertGarmentAccess(user, garment);
  return NextResponse.json({ garment });
}
