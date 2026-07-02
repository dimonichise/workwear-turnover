import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateLaundryExcel } from "@/lib/excel";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  await generateLaundryExcel(id);
  return NextResponse.redirect(new URL(`/operations/${id}`, req.url), { status: 303 });
}
