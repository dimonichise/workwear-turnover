import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { money, ruDate } from "@/lib/format";

export default async function AnalyticsPage() {
  await requireUser();
  const [byEmployees, inLaundry, returns] = await Promise.all([
    prisma.employee.findMany({
      include: { station: true, garments: { include: { garmentType: true } } },
      orderBy: { fullName: "asc" }
    }),
    prisma.garment.findMany({
      where: { status: "in_laundry" },
      include: { employee: true, garmentType: true, operationItems: { where: { direction: "sent_to_laundry" }, orderBy: { scanTime: "desc" }, take: 1 } }
    }),
    prisma.operation.findMany({
      where: { type: "firing_return" },
      include: { employee: true, items: true },
      orderBy: { operationDate: "desc" }
    })
  ]);
  const today = Date.now();
  return (
    <main className="shell space-y-6">
      <h1 className="text-2xl font-bold">Аналитика</h1>
      <section className="panel table-wrap">
        <h2 className="p-4 text-lg font-bold">У сотрудников</h2>
        <table>
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>СТО</th>
              <th>Футболка</th>
              <th>Куртка</th>
              <th>Комбинезон</th>
              <th>Всего</th>
            </tr>
          </thead>
          <tbody>
            {byEmployees.map((employee) => {
              const active = employee.garments.filter((g) => g.status === "with_employee");
              return (
                <tr key={employee.id}>
                  <td>{employee.fullName}</td>
                  <td>{employee.station.name}</td>
                  <td>{countType(active, "Футболка")}</td>
                  <td>{countType(active, "Куртка")}</td>
                  <td>{countType(active, "Комбинезон")}</td>
                  <td>{active.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel table-wrap">
        <h2 className="p-4 text-lg font-bold">В стирке</h2>
        <table>
          <thead>
            <tr>
              <th>Дата сдачи</th>
              <th>Сотрудник</th>
              <th>Изделие</th>
              <th>Штрих-код</th>
              <th>Дней</th>
            </tr>
          </thead>
          <tbody>
            {inLaundry.map((garment) => {
              const scanTime = garment.operationItems[0]?.scanTime || garment.updatedAt;
              return (
                <tr key={garment.id}>
                  <td>{ruDate(scanTime)}</td>
                  <td>{garment.employee.fullName}</td>
                  <td>{garment.garmentType.name}</td>
                  <td>{garment.barcode}</td>
                  <td>{Math.max(0, Math.floor((today - new Date(scanTime).getTime()) / 86400000))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="panel table-wrap">
        <h2 className="p-4 text-lg font-bold">Уволенные / возвраты</h2>
        <table>
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Дата увольнения</th>
              <th>Возвращено</th>
              <th>Не возвращено</th>
              <th>Удержание</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((operation) => (
              <tr key={operation.id}>
                <td>{operation.employee?.fullName}</td>
                <td>{operation.employee?.firedDate ? ruDate(operation.employee.firedDate) : ""}</td>
                <td>{operation.items.filter((i) => i.direction === "returned_after_firing").length}</td>
                <td>{operation.items.filter((i) => i.direction === "not_returned").length}</td>
                <td>{money(operation.items.reduce((sum, item) => sum + Number(item.deductionAmount), 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function countType(garments: { garmentType: { name: string } }[], name: string) {
  return garments.filter((garment) => garment.garmentType.name === name).length;
}
