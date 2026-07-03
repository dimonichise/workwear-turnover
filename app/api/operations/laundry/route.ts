import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertStationAccess } from "@/lib/access";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const form = await req.formData();
  const stationId = String(form.get("stationId") || user.stationId || "");
  assertStationAccess(user, stationId);
  const existing = await prisma.operation.findFirst({
    where: {
      stationId,
      type: "laundry",
      status: { in: ["draft", "ready"] }
    },
    orderBy: { createdAt: "desc" }
  });
  if (existing) return redirectTo(`/operations/${existing.id}`);

  const operation = await prisma.operation.create({
    data: {
      stationId,
      type: "laundry",
      operationDate: form.get("operationDate") ? new Date(String(form.get("operationDate"))) : new Date(),
      actNumber: String(form.get("actNumber") || "") || null,
      createdById: user.id
    }
  });
  return redirectTo(`/operations/${operation.id}`);
}
