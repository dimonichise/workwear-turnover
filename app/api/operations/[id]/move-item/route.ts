import { ItemDirection } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { moveOperationItem } from "@/lib/operation";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const form = await req.formData();
  const itemId = String(form.get("itemId"));
  const direction = String(form.get("direction")) as ItemDirection;
  try {
    await moveOperationItem({ operationId: id, itemId, direction, user });
    return redirectTo(`/operations/${id}`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось перенести позицию" }, { status: 400 });
  }
}
