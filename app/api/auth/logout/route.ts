import { NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { redirectTo } from "@/lib/http";

export async function POST(req: NextRequest) {
  await clearSession();
  return redirectTo("/login");
}
