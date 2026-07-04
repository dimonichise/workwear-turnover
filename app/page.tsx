import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Box, ClipboardList, History, RotateCcw, Settings, Shirt, UserCheck, Users, WalletCards } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { money } from "@/lib/format";

export default async function HomePage() {
  const user = await requireUser();
  const stationWhere = { stationId: user.role === "admin" ? undefined : user.stationId || undefined };
  const [total, withEmployee, inLaundry, returned, notReturned, deductions] = await Promise.all([
    prisma.garment.count({ where: stationWhere }),
    prisma.garment.count({ where: { status: "with_employee", ...stationWhere } }),
    prisma.garment.count({ where: { status: "in_laundry", ...stationWhere } }),
    prisma.garment.count({ where: { status: "returned_after_firing", ...stationWhere } }),
    prisma.garment.count({ where: { status: "not_returned", ...stationWhere } }),
    prisma.operationItem.aggregate({ where: { direction: "not_returned", garment: stationWhere }, _sum: { deductionAmount: true } })
  ]);
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
  const metrics: { label: string; value: string | number; icon: LucideIcon; iconClass: string }[] = [
    { label: "Всего", value: total, icon: Box, iconClass: "icon-soft-teal" },
    { label: "У сотрудников", value: withEmployee, icon: UserCheck, iconClass: "icon-soft-green" },
    { label: "В стирке", value: inLaundry, icon: ClipboardList, iconClass: "icon-soft-blue" },
    { label: "Возвращено", value: returned, icon: RotateCcw, iconClass: "icon-soft-violet" },
    { label: "Не возвращено", value: notReturned, icon: History, iconClass: "icon-soft-amber" },
    { label: "Удержания", value: money(deductions._sum.deductionAmount), icon: WalletCards, iconClass: "icon-soft-rose" }
  ];

  return (
    <main className="shell space-y-7">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">СТО {user.station?.name || "Все СТО"}</h1>
          <p className="mt-1 text-sm text-slate-600">Рабочая панель контроля оборота спецодежды</p>
        </div>
        <Link href="/laundry/new" className="button bg-brand text-white">
          <ClipboardList size={18} />
          Новая стирка
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, iconClass }) => (
          <div key={label} className="metric-card">
            <span className={`metric-icon ${iconClass}`}>
              <Icon size={20} />
            </span>
            <div className="mt-5 text-3xl font-bold tracking-tight">{value}</div>
            <div className="mt-1 text-sm text-slate-600">{label}</div>
          </div>
        ))}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(([href, label, Icon]) => (
          <Link key={href} href={href} className="action-card">
            <Icon size={22} /> {label}
          </Link>
        ))}
      </section>
    </main>
  );
}
