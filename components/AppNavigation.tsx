"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";

export function AppNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) return null;

  return (
    <nav className="flex items-center gap-2" aria-label="Навигация">
      <button type="button" onClick={() => router.back()} className="bg-panel" title="Назад">
        <ArrowLeft size={16} />
        <span className="hidden sm:inline">Назад</span>
      </button>
      <Link href="/" className="button bg-panel" title="Главная">
        <Home size={16} />
        <span className="hidden sm:inline">Главная</span>
      </Link>
    </nav>
  );
}
