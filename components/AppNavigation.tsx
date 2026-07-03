"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, BarChart3, ClipboardList, History, Home, RotateCcw, Settings, Shirt, Users } from "lucide-react";

type AppNavigationProps = {
  role: "admin" | "master";
};

export function AppNavigation({ role }: AppNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const items = [
    { href: "/", label: "Главная", icon: Home },
    { href: "/laundry/new", label: "Стирка", icon: ClipboardList },
    { href: "/garments", label: "Изделия", icon: Shirt },
    { href: "/operations", label: "История", icon: History },
    ...(role === "admin"
      ? [
          { href: "/employees", label: "Сотрудники", icon: Users },
          { href: "/returns/new", label: "Возврат", icon: RotateCcw },
          { href: "/analytics", label: "Аналитика", icon: BarChart3 },
          { href: "/settings", label: "Настройки", icon: Settings }
        ]
      : [])
  ];

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Навигация">
      {!isHome && (
        <button type="button" onClick={() => router.back()} className="bg-panel nav-control" title="Назад">
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Назад</span>
        </button>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
            <Icon size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
