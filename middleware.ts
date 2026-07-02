import { NextRequest, NextResponse } from "next/server";

const publicPaths = ["/login", "/api/auth/login", "/manifest.webmanifest", "/sw.js"];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (
    publicPaths.some((publicPath) => path === publicPath || path.startsWith("/_next")) ||
    path.match(/\.(png|jpg|jpeg|svg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }
  const sessionCookie = req.cookies.get("workwear_session")?.value;
  if (!sessionCookie || !sessionCookie.includes(".")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth/me).*)"]
};
