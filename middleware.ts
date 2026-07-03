import { NextRequest, NextResponse } from "next/server";
import { redirectTo } from "@/lib/http";

const publicPaths = ["/login", "/api/auth/login", "/api/health", "/manifest.webmanifest", "/sw.js"];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (
    publicPaths.some((publicPath) => path === publicPath || path.startsWith("/_next")) ||
    path.match(/\.(png|jpg|jpeg|svg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }
  const sessionCookie = req.cookies.get("workwear_session")?.value;
  if (!(await isValidSessionCookie(sessionCookie))) {
    return redirectTo("/login", 307);
  }
  return NextResponse.next();
}

async function isValidSessionCookie(token?: string) {
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;
  const expected = await edgeSign(body);
  if (expected !== signature) return false;
  try {
    const base64 = body.replaceAll("-", "+").replaceAll("_", "/");
    const payload = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="))) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

async function edgeSign(value: string) {
  const secret = process.env.APP_SECRET || "dev-secret-change-me";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export const config = {
  matcher: ["/((?!api/auth/me).*)"]
};
