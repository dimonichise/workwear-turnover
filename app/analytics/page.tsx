import { ClipboardList, RotateCcw, Users } from "lucide-react";
import { SectionTabs } from "@/components/SectionTabs";
import { DataTable, DataCell, EmptyState } from "@/components/DataTable";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { money, ruDate } from "@/lib/format";
import { isLaundryDelayed, laundryDays } from "@/lib/laundryDelay";
import { stationScope } from "@/lib/access";

export default async function AnalyticsPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const stationWhere = { stationId: stationScope(user) };
  const [byEmployees, inLaundry, returns] = await Promise.all([
    prisma.employee.findMany({
      where: stationWhere,
      include: { station: true, garments: { include: { garmentType: true } } },
      orderBy: { fullName: "asc" },
    }),
    prisma.garment.findMany({
      where: { status: "in_laundry", ...stationWhere },
      include: {
        employee: true,
        garmentType: true,
        operationItems: {
          where: {
            direction: "sent_to_laundry",
            operation: { status: "sent" },
          },
          orderBy: { scanTime: "desc" },
          take: 1,
        },
      },
    }),
    prisma.operation.findMany({
      where: { type: "firing_return", ...stationWhere },
      include: { employee: true, items: true },
      orderBy: { operationDate: "desc" },
    }),
  ]);
  const today = Date.now();
  return (
    <main className="shell list-page analytics-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{user.station?.name || "Все СТО"}</p>
          <h1 className="page-title">Аналитика</h1>
        </div>
      </div>
      <section className="analytics-summary" aria-label="Сводка отчётов">
        <div>
          <span className="metric-icon icon-soft-green">
            <Users size={19} />
          </span>
          <div>
            <strong>{byEmployees.length}</strong>
            <span>Сотрудников в отчёте</span>
          </div>
        </div>
        <div>
          <span className="metric-icon icon-soft-blue">
            <ClipboardList size={19} />
          </span>
          <div>
            <strong>{inLaundry.length}</strong>
            <span>Изделий в стирке</span>
          </div>
        </div>
        <div>
          <span className="metric-icon icon-soft-rose">
            <RotateCcw size={19} />
          </span>
          <div>
            <strong>{returns.length}</strong>
            <span>Документов возврата</span>
          </div>
        </div>
      </section>
      <SectionTabs
        label="Отчёты по спецодежде"
        tabs={[
          {
            id: "employees",
            label: "У сотрудников",
            count: byEmployees.length,
            content: (
              <section className="analytics-section">
                <div className="section-heading">
                  <h2>Спецодежда у сотрудников</h2>
                </div>
                {byEmployees.length === 0 ? (
                  <EmptyState title="Сотрудников в отчёте пока нет." />
                ) : (
                  <DataTable caption="Спецодежда у сотрудников">
                    <thead role="rowgroup">
                      <tr role="row">
                        <th scope="col" role="columnheader">
                          Сотрудник
                        </th>
                        <th scope="col" role="columnheader">
                          СТО
                        </th>
                        <th scope="col" role="columnheader">
                          Футболка
                        </th>
                        <th scope="col" role="columnheader">
                          Куртка
                        </th>
                        <th scope="col" role="columnheader">
                          Комбинезон
                        </th>
                        <th scope="col" role="columnheader">
                          Всего
                        </th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {byEmployees.map((employee) => {
                        const active = employee.garments.filter(
                          (g) => g.status === "with_employee",
                        );
                        return (
                          <tr role="row" key={employee.id}>
                            <DataCell label="Сотрудник" primary>
                              <span className="font-semibold">
                                {employee.fullName}
                              </span>
                            </DataCell>
                            <DataCell label="СТО">
                              {employee.station.name}
                            </DataCell>
                            <DataCell label="Футболка">
                              <span className="number-emphasis">
                                {countType(active, "Футболка")}
                              </span>
                            </DataCell>
                            <DataCell label="Куртка">
                              <span className="number-emphasis">
                                {countType(active, "Куртка")}
                              </span>
                            </DataCell>
                            <DataCell label="Комбинезон">
                              <span className="number-emphasis">
                                {countType(active, "Комбинезон")}
                              </span>
                            </DataCell>
                            <DataCell label="Всего">
                              <strong className="number-emphasis">
                                {active.length}
                              </strong>
                            </DataCell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                )}
              </section>
            ),
          },
          {
            id: "laundry",
            label: "В стирке",
            count: inLaundry.length,
            content: (
              <section className="analytics-section">
                <div className="section-heading">
                  <h2>Спецодежда в стирке</h2>
                </div>
                {inLaundry.length === 0 ? (
                  <EmptyState title="Изделий в стирке нет." />
                ) : (
                  <DataTable caption="Спецодежда в стирке">
                    <thead role="rowgroup">
                      <tr role="row">
                        <th scope="col" role="columnheader">
                          Дата сдачи
                        </th>
                        <th scope="col" role="columnheader">
                          Сотрудник
                        </th>
                        <th scope="col" role="columnheader">
                          Изделие
                        </th>
                        <th scope="col" role="columnheader">
                          Штрих-код
                        </th>
                        <th scope="col" role="columnheader">
                          Дней
                        </th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {inLaundry.map((garment) => {
                        const scanTime =
                          garment.operationItems[0]?.scanTime ||
                          garment.updatedAt;
                        const days = laundryDays(scanTime, today);
                        const delayed = isLaundryDelayed(scanTime, today);
                        return (
                          <tr
                            role="row"
                            key={garment.id}
                            className={delayed ? "delayed-row" : undefined}
                          >
                            <DataCell label="Дата сдачи">
                              {ruDate(scanTime)}
                            </DataCell>
                            <DataCell label="Сотрудник">
                              {garment.employee.fullName}
                            </DataCell>
                            <DataCell label="Изделие" primary>
                              <span className="font-semibold">
                                {garment.garmentType.name}
                              </span>
                            </DataCell>
                            <DataCell label="Штрих-код">
                              <span className="barcode-text">
                                {garment.barcode}
                              </span>
                            </DataCell>
                            <DataCell label="Дней в стирке">
                              <span
                                className={
                                  delayed
                                    ? "number-emphasis number-delayed"
                                    : "number-emphasis"
                                }
                              >
                                {days}
                              </span>
                            </DataCell>
                          </tr>
                        );
                      })}
                    </tbody>
                  </DataTable>
                )}
              </section>
            ),
          },
          {
            id: "returns",
            label: "Возвраты",
            count: returns.length,
            content: (
              <section className="analytics-section">
                <div className="section-heading">
                  <h2>Уволенные и возвраты</h2>
                </div>
                {returns.length === 0 ? (
                  <EmptyState title="Документов возврата пока нет." />
                ) : (
                  <DataTable caption="Уволенные и возвраты">
                    <thead role="rowgroup">
                      <tr role="row">
                        <th scope="col" role="columnheader">
                          Сотрудник
                        </th>
                        <th scope="col" role="columnheader">
                          Дата увольнения
                        </th>
                        <th scope="col" role="columnheader">
                          Возвращено
                        </th>
                        <th scope="col" role="columnheader">
                          Не возвращено
                        </th>
                        <th scope="col" role="columnheader">
                          Удержание
                        </th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {returns.map((operation) => (
                        <tr role="row" key={operation.id}>
                          <DataCell label="Сотрудник" primary>
                            <span className="font-semibold">
                              {operation.employee?.fullName || "—"}
                            </span>
                          </DataCell>
                          <DataCell label="Уволен">
                            {operation.employee?.firedDate
                              ? ruDate(operation.employee.firedDate)
                              : "—"}
                          </DataCell>
                          <DataCell label="Возвращено">
                            <span className="number-emphasis">
                              {
                                operation.items.filter(
                                  (i) =>
                                    i.direction === "returned_after_firing",
                                ).length
                              }
                            </span>
                          </DataCell>
                          <DataCell label="Не возвращено">
                            <span className="number-emphasis">
                              {
                                operation.items.filter(
                                  (i) => i.direction === "not_returned",
                                ).length
                              }
                            </span>
                          </DataCell>
                          <DataCell label="Удержание">
                            <strong className="number-emphasis">
                              {money(
                                operation.items.reduce(
                                  (sum, item) =>
                                    sum + Number(item.deductionAmount),
                                  0,
                                ),
                              )}
                            </strong>
                          </DataCell>
                        </tr>
                      ))}
                    </tbody>
                  </DataTable>
                )}
              </section>
            ),
          },
        ]}
      />
    </main>
  );
}

function countType(
  garments: { garmentType: { name: string } }[],
  name: string,
) {
  return garments.filter((garment) => garment.garmentType.name === name).length;
}
