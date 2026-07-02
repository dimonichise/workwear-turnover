import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ barcode: string }> }) {
  await requireUser();
  const { barcode } = await params;
  const garment = await prisma.garment.findUnique({
    where: { barcode },
    include: { employee: true, garmentType: true, station: true }
  });
  return NextResponse.json({ garment });
}
