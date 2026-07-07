import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { BarcodeScannerInput } from "@/components/BarcodeScannerInput";

export default async function NewGarmentPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const user = await requireUser();
  const query = await searchParams;
  const [stations, employees, types] = await Promise.all([
    prisma.station.findMany({
      where: {
        isActive: true,
        id: user.role === "admin" ? undefined : user.stationId || undefined
      },
      orderBy: { name: "asc" }
    }),
    prisma.employee.findMany({
      where: {
        status: { not: "archived" },
        stationId: user.role === "admin" ? undefined : user.stationId || undefined
      },
      orderBy: { fullName: "asc" }
    }),
    prisma.garmentType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
  ]);
  return (
    <main className="shell max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Новое изделие</h1>
      <form action="/api/garments" method="post" className="panel space-y-4 p-4">
        <input type="hidden" name="redirectTo" value={query.redirectTo || "/garments"} />
        <input type="hidden" name="status" value={query.status || "with_employee"} />
        {query.operationId && <input type="hidden" name="operationId" value={query.operationId} />}
        {query.direction && <input type="hidden" name="direction" value={query.direction} />}
        <BarcodeScannerInput defaultValue={query.barcode || ""} />
        <label className="block space-y-1 text-sm">
          <span>СТО</span>
          <select name="stationId" defaultValue={user.stationId || stations[0]?.id}>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Сотрудник</span>
          <select name="employeeId" required>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Тип изделия</span>
          <select name="garmentTypeId" required>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Уточнение</span>
          <input name="label" placeholder="Куртка 1" />
        </label>
        <button className="bg-brand text-white">Сохранить</button>
      </form>
    </main>
  );
}
