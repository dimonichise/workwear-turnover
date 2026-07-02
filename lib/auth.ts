import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE = "workwear_session";

type SessionPayload = {
  userId: string;
  role: UserRole;
  stationId: string | null;
  exp: number;
};

function secret() {
  return process.env.APP_SECRET || "dev-secret-change-me";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 14 })
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || sign(body) !== signature) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}

export async function setSession(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new Error("Пользователь не найден");
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, createSessionCookie({ userId: user.id, role: user.role, stationId: user.stationId }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

export async function currentUser() {
  const cookieStore = await cookies();
  const payload = readSessionToken(cookieStore.get(COOKIE)?.value);
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.userId },
    include: { station: true }
  });
}

export async function requireUser() {
  const user = await currentUser();
  if (!user || !user.isActive) throw new Response("Не авторизован", { status: 401 });
  return user;
}

export function requireAdmin(role: UserRole) {
  if (role !== "admin") throw new Response("Недостаточно прав", { status: 403 });
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function routeUser(req: NextRequest) {
  const payload = readSessionToken(req.cookies.get(COOKIE)?.value);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: payload.userId }, include: { station: true } });
}

export function unauthorized() {
  return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
}
