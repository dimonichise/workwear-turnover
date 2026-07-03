import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin, assertStationAccess } from "@/lib/access";
import { redirectTo } from "@/lib/http";

export async function GET() {
  const user = await requireUser();
  assertAdmin(user);
  return NextResponse.json(await prisma.user.findMany({ include: { station: true }, orderBy: { email: "asc" } }));
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  assertAdmin(user);
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const fullName = String(form.get("fullName") || "").trim();
  const rawRole = String(form.get("role") || "master");
  const role = Object.values(UserRole).includes(rawRole as UserRole) ? (rawRole as UserRole) : UserRole.master;
  const stationId = String(form.get("stationId") || "") || null;

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: "Email, пароль и имя обязательны" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Пароль должен быть не короче 8 символов" }, { status: 400 });
  }
  if (stationId) assertStationAccess(user, stationId);

  await prisma.user.create({
    data: {
      email,
      fullName,
      role,
      stationId,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });
  return redirectTo("/settings");
}
