import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { statusNames } from "@/lib/format";

export default async function GarmentsPage() {
  const user = await requireUser();
  const garments = await prisma.garment.findMany({
    where: { stationId: user.role === "admin" ? undefined : user.stationId || undefined },
    include: { station: true, employee: true, garmentType: true },
    orderBy: { updatedAt: "desc" }
  });
  return (
    <main className="shell space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Спецодежда</h1>
        <Link href="/garments/new" className="button bg-brand text-white">
          Добавить
        </Link>
      </div>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Штрих-код</th>
              <th>Изделие</th>
              <th>Сотрудник</th>
              <th>СТО</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {garments.map((garment) => (
              <tr key={garment.id}>
                <td className="font-semibold">{garment.barcode}</td>
                <td>{garment.label || garment.garmentType.name}</td>
                <td>{garment.employee.fullName}</td>
                <td>{garment.station.name}</td>
                <td>{statusNames[garment.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
