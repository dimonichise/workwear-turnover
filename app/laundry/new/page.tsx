import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { stationScope } from "@/lib/access";

export default async function NewLaundryPage() {
  const user = await requireUser();
  const stations = await prisma.station.findMany({
    where: {
      isActive: true,
      id: stationScope(user)
    },
    orderBy: { name: "asc" }
  });
  return (
    <main className="shell max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Новая стирка</h1>
      <form action="/api/operations/laundry" method="post" className="panel space-y-4 p-4">
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
          <span>Дата операции</span>
          <input name="operationDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Номер акта</span>
          <input name="actNumber" />
        </label>
        <button className="bg-brand text-white">Создать операцию</button>
      </form>
    </main>
  );
}
