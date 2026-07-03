import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ruDate, statusNames } from "@/lib/format";
import { getVisibleOperations } from "@/lib/operations";

export default async function OperationsPage() {
  const user = await requireUser();
  const operations = await getVisibleOperations(user);
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
              <th>Документ</th>
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
                <td>{statusNames[operation.status] || operation.status}</td>
                <td>
                  <Link className="button inline-flex bg-panel text-brand" href={`/operations/${operation.id}`}>
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
