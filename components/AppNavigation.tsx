"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  History,
  Home,
  MoreHorizontal,
  RotateCcw,
  Settings,
  Shirt,
  Users,
} from "lucide-react";

type AppNavigationProps = {
  role: "admin" | "master";
};

export function AppNavigation({ role }: AppNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const moreRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (moreRef.current) moreRef.current.open = false;
  }, [pathname]);
  useEffect(() => {
    function closeOnOutsidePress(event: PointerEvent) {
      const menu = moreRef.current;
      if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
    }
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, []);
  const items = [
    { href: "/", label: "Главная", icon: Home },
    { href: "/laundry/new", label: "Новая стирка", icon: ClipboardList },
    { href: "/garments", label: "Спецодежда", icon: Shirt },
    { href: "/operations", label: "История операций", icon: History },
    ...(role === "admin"
      ? [
          { href: "/employees", label: "Сотрудники", icon: Users },
          {
            href: "/returns/new",
            label: "Возврат уволенного",
            icon: RotateCcw,
          },
          { href: "/analytics", label: "Аналитика", icon: BarChart3 },
          { href: "/settings", label: "Настройки", icon: Settings },
        ]
      : []),
  ];

  const primaryItems = items.slice(0, 3);
  const moreItems = items.slice(3);
  const moreActive = moreItems.some((item) => pathname.startsWith(item.href));

  return (
    <nav className="app-nav" aria-label="Навигация">
      <span className="nav-section-label">Рабочее пространство</span>
      {!isHome && (
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-panel nav-control"
          title="Назад"
        >
          <ArrowLeft size={16} />
          <span>Назад</span>
        </button>
      )}
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`nav-link ${primaryItems.includes(item) ? "nav-primary" : "nav-secondary"} ${active ? "nav-link-active" : ""}`}
          >
            <Icon size={16} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <details
        ref={moreRef}
        className="nav-more"
        onKeyDown={(event) => {
          if (event.key === "Escape" && moreRef.current) {
            moreRef.current.open = false;
            moreRef.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary className={`nav-link ${moreActive ? "nav-link-active" : ""}`}>
          <MoreHorizontal size={20} />
          <span>Ещё</span>
        </summary>
        <div className="nav-more-menu">
          {!isHome && (
            <button
              type="button"
              onClick={() => {
                if (moreRef.current) moreRef.current.open = false;
                router.back();
              }}
              className="nav-control"
            >
              <ArrowLeft size={18} />
              <span>Назад</span>
            </button>
          )}
          {moreItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
              className={`nav-link ${pathname.startsWith(href) ? "nav-link-active" : ""}`}
              onClick={() => {
                if (moreRef.current) moreRef.current.open = false;
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </details>
    </nav>
  );
}
