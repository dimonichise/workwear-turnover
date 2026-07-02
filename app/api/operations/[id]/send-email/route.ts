import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendOperationEmail } from "@/lib/mail";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  try {
    await sendOperationEmail(id);
    return NextResponse.redirect(new URL(`/operations/${id}`, req.url), { status: 303 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось отправить письмо" }, { status: 400 });
  }
}
