import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { addGarmentToOperation } from "@/lib/operation";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = req.headers.get("content-type")?.includes("application/json")
    ? await req.json()
    : Object.fromEntries((await req.formData()).entries());
  const result = await addGarmentToOperation({
    operationId: id,
    barcode: String(data.barcode).trim(),
    direction: "returned_after_firing",
    user
  });
  return NextResponse.json(result);
}
