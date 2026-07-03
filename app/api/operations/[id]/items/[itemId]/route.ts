import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deleteOperationItem } from "@/lib/operation";
import { redirectTo } from "@/lib/http";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const user = await requireUser();
  const { id, itemId } = await params;
  try {
    await deleteOperationItem({ operationId: id, itemId, user });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось удалить позицию" }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ itemId: string; id: string }> }) {
  const user = await requireUser();
  const { itemId, id } = await params;
  try {
    await deleteOperationItem({ operationId: id, itemId, user });
    return redirectTo(`/operations/${id}`);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось удалить позицию" }, { status: 400 });
  }
}
