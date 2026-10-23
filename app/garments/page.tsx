import { ArrowLeft, Plus } from "lucide-react";
import {
  DataTable,
  DataCell,
  StatusBadge,
  EmptyState,
} from "@/components/DataTable";
import Link from "next/link";
import { GarmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ruDate } from "@/lib/format";
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

export default async function GarmentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const status = paramValue(query.status);
  const filter = paramValue(query.filter);
  const allowedStatus = Object.values(GarmentStatus).includes(
    status as GarmentStatus,
  )
    ? (status as GarmentStatus)
    : undefined;
  const delayedOnly = filter === "delayed";
  const garments = await prisma.garment.findMany({
    where: {
      stationId: stationScope(user),
      status: delayedOnly ? "in_laundry" : allowedStatus,
    },
    include: {
      station: true,
      employee: true,
      garmentType: true,
      history: { orderBy: { createdAt: "desc" }, take: 1 },
      operationItems: {
        where: { direction: "sent_to_laundry", operation: { status: "sent" } },
        orderBy: { scanTime: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  const filteredGarments = delayedOnly
    ? garments.filter((garment) => {
        const scanTime = garment.operationItems[0]?.scanTime;
        return scanTime && isLaundryDelayed(scanTime);
      })
    : garments;
  const title = filterTitle(allowedStatus, filter);

  return (
    <main className="shell list-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Реестр изделий</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-count">Найдено: {filteredGarments.length}</p>
        </div>
        <div className="page-actions">
          <Link href="/" className="button bg-white">
            <ArrowLeft size={16} />
            На главную
          </Link>
          <Link href="/garments/new" className="button button-primary">
            <Plus size={18} />
            Добавить изделие
          </Link>
        </div>
      </div>
      <nav className="list-filters" aria-label="Состояние спецодежды">
        <Link
          href="/garments"
          aria-current={!allowedStatus && !delayedOnly ? "page" : undefined}
        >
          Все изделия
        </Link>
        <Link
          href="/garments?status=with_employee"
          aria-current={
            allowedStatus === "with_employee" && !delayedOnly
              ? "page"
              : undefined
          }
        >
          У сотрудников
        </Link>
        <Link
          href="/garments?status=in_laundry"
          aria-current={
            allowedStatus === "in_laundry" && !delayedOnly ? "page" : undefined
          }
        >
          В стирке
        </Link>
        <Link
          href="/garments?filter=delayed"
          aria-current={delayedOnly ? "page" : undefined}
        >
          Задержка
        </Link>
      </nav>
      <section aria-label={title}>
        {filteredGarments.length === 0 ? (
          <EmptyState title="Подходящих изделий нет." />
        ) : (
          <DataTable caption={title}>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">
                  Штрих-код
                </th>
                <th scope="col" role="columnheader">
                  Изделие
                </th>
                <th scope="col" role="columnheader">
                  Сотрудник
                </th>
                <th scope="col" role="columnheader">
                  СТО
                </th>
                <th scope="col" role="columnheader">
                  Статус
                </th>
                <th scope="col" role="columnheader">
                  {allowedStatus === "in_laundry" || delayedOnly
                    ? "Передано в стирку"
                    : "Последнее движение"}
                </th>
                {(allowedStatus === "in_laundry" || delayedOnly) && (
                  <th scope="col" role="columnheader">
                    Дней в стирке
                  </th>
                )}
                {delayedOnly && (
                  <th scope="col" role="columnheader">
                    Причина
                  </th>
                )}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {filteredGarments.map((garment) => {
                const scanTime = garment.operationItems[0]?.scanTime;
                const delayed =
                  garment.status === "in_laundry" &&
                  scanTime &&
                  isLaundryDelayed(scanTime);
                const lastMovement =
                  garment.history[0]?.createdAt || garment.updatedAt;
                const daysInLaundry = scanTime ? laundryDays(scanTime) : null;
                return (
                  <tr
                    role="row"
                    key={garment.id}
                    className={delayed ? "delayed-row" : undefined}
                  >
                    <DataCell label="Штрих-код">
                      <span className="barcode-text">{garment.barcode}</span>
                    </DataCell>
                    <DataCell label="Изделие" primary>
                      <div className="font-semibold">
                        {garment.garmentType.name}
                      </div>
                      {garment.label && (
                        <div className="cell-secondary">{garment.label}</div>
                      )}
                    </DataCell>
                    <DataCell label="Сотрудник">
                      {garment.employee.fullName}
                    </DataCell>
                    <DataCell label="СТО">{garment.station.name}</DataCell>
                    <DataCell label="Статус">
                      <StatusBadge status={garment.status} />
                    </DataCell>
                    <DataCell
                      label={
                        allowedStatus === "in_laundry" || delayedOnly
                          ? "Передано"
                          : "Движение"
                      }
                    >
                      {scanTime &&
                      (allowedStatus === "in_laundry" || delayedOnly)
                        ? ruDate(scanTime)
                        : ruDate(lastMovement)}
                    </DataCell>
                    {(allowedStatus === "in_laundry" || delayedOnly) && (
                      <DataCell label="Дней в стирке">
                        <span
                          className={
                            delayed
                              ? "number-emphasis number-delayed"
                              : "number-emphasis"
                          }
                        >
                          {daysInLaundry ?? "—"}
                        </span>
                      </DataCell>
                    )}
                    {delayedOnly && (
                      <DataCell label="Причина">
                        {scanTime
                          ? `В стирке ${daysInLaundry} дней, порог задержки — 7 дней`
                          : "Нет даты передачи в стирку"}
                      </DataCell>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        )}
      </section>
    </main>
  );
}
