import { ArrowUpRight } from "lucide-react";
import {
  DataTable,
  DataCell,
  StatusBadge,
  EmptyState,
} from "@/components/DataTable";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ruDate } from "@/lib/format";
import { getVisibleOperations } from "@/lib/operations";

export default async function OperationsPage() {
  const user = await requireUser();
  const operations = await getVisibleOperations(user);
  return (
    <main className="shell list-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Документы</p>
          <h1 className="page-title">История операций</h1>
          <p className="page-count">Документов: {operations.length}</p>
        </div>
      </div>
      {operations.length === 0 ? (
        <EmptyState title="Документов пока нет." />
      ) : (
        <DataTable caption="История операций">
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                Дата
              </th>
              <th scope="col" role="columnheader">
                Тип
              </th>
              <th scope="col" role="columnheader">
                СТО
              </th>
              <th scope="col" role="columnheader">
                Сотрудник
              </th>
              <th scope="col" role="columnheader">
                Позиции
              </th>
              <th scope="col" role="columnheader">
                Статус
              </th>
              <th scope="col" role="columnheader">
                Документ
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {operations.map((operation) => (
              <tr role="row" key={operation.id}>
                <DataCell label="Дата" primary>
                  <Link
                    className="font-semibold text-brand"
                    href={`/operations/${operation.id}`}
                  >
                    {ruDate(operation.operationDate)}
                  </Link>
                </DataCell>
                <DataCell label="Тип">
                  {operation.type === "laundry" ? "Стирка" : "Возврат"}
                </DataCell>
                <DataCell label="СТО">{operation.station.name}</DataCell>
                <DataCell label="Сотрудник">
                  {operation.employee?.fullName || "—"}
                </DataCell>
                <DataCell label="Позиции">
                  <span className="number-emphasis">
                    {operation._count.items}
                  </span>
                </DataCell>
                <DataCell label="Статус">
                  <StatusBadge status={operation.status} />
                </DataCell>
                <DataCell label="Документ" className="data-actions">
                  <Link
                    className="text-link"
                    href={`/operations/${operation.id}`}
                  >
                    Открыть документ
                    <ArrowUpRight size={16} />
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
