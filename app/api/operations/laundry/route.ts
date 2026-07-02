import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const form = await req.formData();
  const operation = await prisma.operation.create({
    data: {
      stationId: String(form.get("stationId") || user.stationId),
      type: "laundry",
      operationDate: form.get("operationDate") ? new Date(String(form.get("operationDate"))) : new Date(),
      actNumber: String(form.get("actNumber") || "") || null,
      createdById: user.id
    }
  });
  return NextResponse.redirect(new URL(`/operations/${operation.id}`, req.url), { status: 303 });
}
