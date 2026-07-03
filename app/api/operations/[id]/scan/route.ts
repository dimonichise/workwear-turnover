import { ItemDirection } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addGarmentToOperation } from "@/lib/operation";
import { assertLocalRedirect } from "@/lib/access";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = req.headers.get("content-type")?.includes("application/json")
    ? await req.json()
    : Object.fromEntries((await req.formData()).entries());
  try {
    const result = await addGarmentToOperation({
      operationId: id,
      barcode: String(data.barcode).trim(),
      direction: String(data.direction) as ItemDirection,
      user,
      deductionAmount: Number(data.deductionAmount || 0)
    });
    if (data.redirectTo) return NextResponse.redirect(new URL(assertLocalRedirect(String(data.redirectTo)), req.url), { status: 303 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ошибка сканирования" }, { status: 400 });
  }
}
