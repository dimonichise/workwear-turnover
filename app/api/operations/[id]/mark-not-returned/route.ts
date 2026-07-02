import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addGarmentToOperation } from "@/lib/operation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = req.headers.get("content-type")?.includes("application/json")
    ? await req.json()
    : Object.fromEntries((await req.formData()).entries());
  const deductionAmount = Number(data.deductionAmount || 0);
  if (!deductionAmount) {
    return NextResponse.json({ error: "Для невозврата обязательна сумма удержания" }, { status: 400 });
  }
  const result = await addGarmentToOperation({
    operationId: id,
    barcode: String(data.barcode).trim(),
    direction: "not_returned",
    deductionAmount,
    userId: user.id
  });
  return NextResponse.json(result);
}
