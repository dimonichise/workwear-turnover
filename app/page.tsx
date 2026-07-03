import Link from "next/link";
import { BarChart3, ClipboardList, History, RotateCcw, Settings, Shirt, Users } from "lucide-react";
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
  return (
    <main className="shell space-y-5">
      <section>
        <h1 className="text-2xl font-bold">СТО {user.station?.name || "Все СТО"}</h1>
        <p className="text-sm text-slate-600">Рабочая панель контроля оборота спецодежды</p>
      </section>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          ["Всего", total],
          ["У сотрудников", withEmployee],
          ["В стирке", inLaundry],
          ["Возвращено", returned],
          ["Не возвращено", notReturned],
          ["Удержания", money(deductions._sum.deductionAmount)]
        ].map(([label, value]) => (
          <div key={label} className="panel p-3">
            <div className="text-xs text-slate-600">{label}</div>
            <div className="mt-1 text-xl font-bold">{value}</div>
          </div>
        ))}
      </section>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(([href, label, Icon]) => (
          <Link key={href} href={href} className="panel flex items-center gap-3 p-4 font-semibold">
            <Icon size={22} /> {label}
          </Link>
        ))}
      </section>
    </main>
  );
}
