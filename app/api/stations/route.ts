import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

export async function GET() {
  await requireUser();
  return NextResponse.json(await prisma.station.findMany({ orderBy: { name: "asc" } }));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  requireAdmin(user.role);
  const data = await req.json();
  return NextResponse.json(await prisma.station.create({ data: { name: data.name, address: data.address } }));
}
