import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Box,
  ClipboardList,
  History,
  RotateCcw,
  Settings,
  Shirt,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";
import { isLaundryDelayed } from "@/lib/laundryDelay";
import { stationScope } from "@/lib/access";

export default async function HomePage() {
  const user = await requireUser();
  const stationWhere = { stationId: stationScope(user) };
  const [total, withEmployee, inLaundry, delayedLaundryCandidates, deductions] = await Promise.all([
    prisma.garment.count({ where: stationWhere }),
    prisma.garment.count({ where: { status: "with_employee", ...stationWhere } }),
    prisma.garment.count({ where: { status: "in_laundry", ...stationWhere } }),
    prisma.garment.findMany({
      where: { status: "in_laundry", ...stationWhere },
      select: { id: true, operationItems: { where: { direction: "sent_to_laundry", operation: { status: "sent" } }, orderBy: { scanTime: "desc" }, take: 1 } }
    }),
    prisma.operationItem.aggregate({ where: { direction: "not_returned", garment: stationWhere }, _sum: { deductionAmount: true } })
  ]);
  const delayedLaundry = delayedLaundryCandidates.filter((garment) => {
    const scanTime = garment.operationItems[0]?.scanTime;
    return scanTime && isLaundryDelayed(scanTime);
  }).length;
  const links = [
    ["/laundry/new", "Новая стирка", ClipboardList],
    ["/garments", "Спецодежда", Shirt],
    ["/operations", "История операций", History],
    ...(user.role === "admin"
      ? ([
          ["/returns/new", "Возврат уволенного", RotateCcw],
          ["/employees", "Сотрудники", Users],
          ["/analytics", "Аналитика", BarChart3],
          ["/settings", "Настройки", Settings]
        ] as const)
      : [])
  ] as const;
  const metrics: { label: string; value: string | number; icon: LucideIcon; iconClass: string; href: string }[] = [
    { label: "Всего изделий", value: total, icon: Box, iconClass: "icon-soft-teal", href: "/garments" },
    { label: "У сотрудников", value: withEmployee, icon: UserCheck, iconClass: "icon-soft-green", href: "/garments?status=with_employee" },
    { label: "В стирке", value: inLaundry, icon: ClipboardList, iconClass: "icon-soft-blue", href: "/garments?status=in_laundry" },
    { label: "Задержка", value: delayedLaundry, icon: AlertTriangle, iconClass: "icon-soft-red", href: "/garments?filter=delayed" },
    { label: "Удержания", value: money(deductions._sum.deductionAmount), icon: WalletCards, iconClass: "icon-soft-rose", href: "/analytics" }
  ];

  return (
    <main className="shell dashboard-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">
            {user.station ? `СТО ${user.station.name}` : "Все СТО"}
          </p>
          <h1 className="page-title">Обзор спецодежды</h1>
        </div>
        <Link href="/laundry/new" className="button button-primary">
          <ClipboardList size={18} />
          Новая стирка
        </Link>
      </section>
      <section className="dashboard-metrics" aria-label="Сводные показатели">
        {metrics.map(({ label, value, icon: Icon, iconClass, href }) => (
          <Link
            key={label}
            href={href}
            className="metric-card"
            aria-label={`${label}: ${value}`}
          >
            <div className="metric-top">
              <span className={`metric-icon ${iconClass}`}>
                <Icon size={20} />
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </div>
            <div className="metric-value">{value}</div>
            <div className="metric-label">{label}</div>
          </Link>
        ))}
      </section>
      <section className="dashboard-actions">
        <div className="section-heading">
          <h2>Работа со спецодеждой</h2>
          <span>Операции и справочники</span>
        </div>
        <div className="action-grid">
          {links.map(([href, label, Icon]) => (
            <Link key={href} href={href} className="action-card">
              <span className="action-icon">
                <Icon size={22} />
              </span>
              <span>{label}</span>
              <ArrowRight
                className="action-arrow"
                size={18}
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>
      <section className="delay-summary" aria-label="Контроль сроков">
        <span
          className={`metric-icon ${delayedLaundry ? "icon-soft-red" : "icon-soft-teal"}`}
        >
          <AlertTriangle size={20} />
        </span>
        <div>
          <h2>Контроль сроков стирки</h2>
          <p>Задержка: в стирке 7 дней и больше</p>
        </div>
        <Link href="/garments?filter=delayed" className="text-link">
          {delayedLaundry ? `Задержано: ${delayedLaundry}` : "Нет задержек"}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
