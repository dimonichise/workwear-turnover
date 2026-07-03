import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ruDate } from "@/lib/format";

export default async function OperationsPage() {
  const user = await requireUser();
  const operations = await prisma.operation.findMany({
    where: {
      stationId: user.role === "admin" ? undefined : user.stationId || undefined,
      type: user.role === "admin" ? undefined : "laundry"
    },
    include: { station: true, employee: true, _count: { select: { items: true, attachments: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return (
    <main className="shell space-y-5">
      <h1 className="text-2xl font-bold">История операций</h1>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Тип</th>
              <th>СТО</th>
              <th>Сотрудник</th>
              <th>Позиции</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((operation) => (
              <tr key={operation.id}>
                <td>
                  <Link className="font-semibold text-brand" href={`/operations/${operation.id}`}>
                    {ruDate(operation.operationDate)}
                  </Link>
                </td>
                <td>{operation.type === "laundry" ? "Стирка" : "Возврат"}</td>
                <td>{operation.station.name}</td>
                <td>{operation.employee?.fullName || ""}</td>
                <td>{operation._count.items}</td>
                <td>{operation.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
