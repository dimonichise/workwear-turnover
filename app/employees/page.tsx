import { ArrowRight, Plus, UserPlus } from "lucide-react";
import {
  DataTable,
  DataCell,
  StatusBadge,
  EmptyState,
} from "@/components/DataTable";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { employeePositions } from "@/lib/positions";
import { stationScope } from "@/lib/access";

export default async function EmployeesPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const [employees, stations] = await Promise.all([
    prisma.employee.findMany({
      where: { stationId: stationScope(user) },
      include: { station: true, _count: { select: { garments: true } } },
      orderBy: { fullName: "asc" },
    }),
    prisma.station.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return (
    <main className="shell list-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{user.station?.name || "Все СТО"}</p>
          <h1 className="page-title">Сотрудники</h1>
          <p className="page-count">Всего: {employees.length}</p>
        </div>
      </div>
      <details className="create-disclosure">
        <summary>
          <UserPlus size={18} />
          <span>Добавить сотрудника</span>
          <Plus className="disclosure-plus" size={18} />
        </summary>
        <form
          action="/api/employees"
          method="post"
          className="employee-create-grid"
        >
          <label className="form-field">
            <span>ФИО</span>
            <input name="fullName" placeholder="ФИО" required />
          </label>
          <label className="form-field">
            <span>Должность</span>
            <select name="position" defaultValue="" required>
              <option value="" disabled>
                Должность
              </option>
              {employeePositions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>СТО</span>
            <select
              name="stationId"
              defaultValue={user.stationId || stations[0]?.id}
            >
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button-primary">
            <Plus size={18} />
            Добавить
          </button>
        </form>
      </details>
      {employees.length === 0 ? (
        <EmptyState title="Сотрудников пока нет." />
      ) : (
        <DataTable caption="Сотрудники">
          <thead role="rowgroup">
            <tr role="row">
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
                Изделий
              </th>
              <th scope="col" role="columnheader">
                Карточка
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {employees.map((employee) => (
              <tr role="row" key={employee.id}>
                <DataCell label="Сотрудник" primary>
                  <Link
                    className="font-semibold text-brand"
                    href={`/employees/${employee.id}`}
                  >
                    {employee.fullName}
                  </Link>
                  <div className="cell-secondary">{employee.position}</div>
                </DataCell>
                <DataCell label="СТО">{employee.station.name}</DataCell>
                <DataCell label="Статус">
                  <StatusBadge status={employee.status} />
                </DataCell>
                <DataCell label="Изделий">
                  <span className="number-emphasis">
                    {employee._count.garments}
                  </span>
                </DataCell>
                <DataCell label="Карточка" className="data-actions">
                  <Link
                    className="text-link"
                    href={`/employees/${employee.id}`}
                  >
                    Открыть
                    <ArrowRight size={16} />
                  </Link>
                </DataCell>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </main>
  );
}
