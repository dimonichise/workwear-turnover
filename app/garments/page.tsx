import Link from "next/link";
import { GarmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ruDate, statusNames } from "@/lib/format";
import { isLaundryDelayed, laundryDays } from "@/lib/laundryDelay";
import { stationScope } from "@/lib/access";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function paramValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function filterTitle(status: string | undefined, filter: string | undefined) {
  if (filter === "delayed") return "Задержка";
  if (status === "with_employee") return "Спецодежда у сотрудников";
  if (status === "in_laundry") return "Спецодежда в стирке";
  return "Спецодежда";
}

export default async function GarmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const query = await searchParams;
  const status = paramValue(query.status);
  const filter = paramValue(query.filter);
  const allowedStatus = Object.values(GarmentStatus).includes(status as GarmentStatus) ? (status as GarmentStatus) : undefined;
  const delayedOnly = filter === "delayed";
  const garments = await prisma.garment.findMany({
    where: {
      stationId: stationScope(user),
      status: delayedOnly ? "in_laundry" : allowedStatus
    },
    include: {
      station: true,
      employee: true,
      garmentType: true,
      history: { orderBy: { createdAt: "desc" }, take: 1 },
      operationItems: { where: { direction: "sent_to_laundry", operation: { status: "sent" } }, orderBy: { scanTime: "desc" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" }
  });
  const filteredGarments = delayedOnly
    ? garments.filter((garment) => {
        const scanTime = garment.operationItems[0]?.scanTime;
        return scanTime && isLaundryDelayed(scanTime);
      })
    : garments;
  const title = filterTitle(allowedStatus, filter);

  return (
    <main className="shell space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">Найдено: {filteredGarments.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/" className="button bg-panel">
            Назад на дашборд
          </Link>
          <Link href="/garments/new" className="button bg-brand text-white">
            Добавить
          </Link>
        </div>
      </div>
      <section className="panel table-wrap">
        {filteredGarments.length === 0 ? (
          <div className="p-5 text-sm text-slate-600">Подходящих изделий нет.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Штрих-код</th>
                <th>Изделие</th>
                <th>Сотрудник</th>
                <th>СТО</th>
                <th>Статус</th>
                <th>{allowedStatus === "in_laundry" || delayedOnly ? "Передано в стирку" : "Последнее движение"}</th>
                {(allowedStatus === "in_laundry" || delayedOnly) && <th>Дней в стирке</th>}
                {delayedOnly && <th>Причина</th>}
              </tr>
            </thead>
            <tbody>
              {filteredGarments.map((garment) => {
                const scanTime = garment.operationItems[0]?.scanTime;
                const delayed = garment.status === "in_laundry" && scanTime && isLaundryDelayed(scanTime);
                const lastMovement = garment.history[0]?.createdAt || garment.updatedAt;
                const daysInLaundry = scanTime ? laundryDays(scanTime) : null;
                return (
                  <tr key={garment.id} className={delayed ? "delayed-row" : undefined}>
                    <td className="font-semibold">{garment.barcode}</td>
                    <td>
                      <div className="font-semibold">{garment.garmentType.name}</div>
                      {garment.label && <div className="text-sm text-slate-600">{garment.label}</div>}
                    </td>
                    <td>{garment.employee.fullName}</td>
                    <td>{garment.station.name}</td>
                    <td>{statusNames[garment.status]}</td>
                    <td>{scanTime && (allowedStatus === "in_laundry" || delayedOnly) ? ruDate(scanTime) : ruDate(lastMovement)}</td>
                    {(allowedStatus === "in_laundry" || delayedOnly) && <td>{daysInLaundry ?? "—"}</td>}
                    {delayedOnly && <td>{scanTime ? `В стирке ${daysInLaundry} дней, порог задержки — 7 дней` : "Нет даты передачи в стирку"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
