import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { statusNames } from "@/lib/format";
import { employeePositions } from "@/lib/positions";
import { stationScope } from "@/lib/access";

export default async function EmployeesPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const [employees, stations] = await Promise.all([
    prisma.employee.findMany({
      where: { stationId: stationScope(user) },
      include: { station: true, _count: { select: { garments: true } } },
      orderBy: { fullName: "asc" }
    }),
    prisma.station.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);
  return (
    <main className="shell space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Сотрудники</h1>
      </div>
      <form action="/api/employees" method="post" className="panel grid gap-3 p-4 md:grid-cols-5">
        <input name="fullName" placeholder="ФИО" required className="md:col-span-2" />
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
        <select name="stationId" defaultValue={user.stationId || stations[0]?.id}>
          {stations.map((station) => (
            <option key={station.id} value={station.id}>
              {station.name}
            </option>
          ))}
        </select>
        <button className="bg-brand text-white">Добавить</button>
      </form>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>СТО</th>
              <th>Статус</th>
              <th>Изделий</th>
              <th>Карточка</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>
                  <Link className="font-semibold text-brand" href={`/employees/${employee.id}`}>
                    {employee.fullName}
                  </Link>
                  <div className="text-sm text-slate-600">{employee.position}</div>
                </td>
                <td>{employee.station.name}</td>
                <td>{statusNames[employee.status]}</td>
                <td>{employee._count.garments}</td>
                <td>
                  <Link className="button inline-flex bg-panel text-brand" href={`/employees/${employee.id}`}>
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
