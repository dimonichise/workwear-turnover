import { ArrowLeft, RotateCcw, UserMinus } from "lucide-react";
import {
  DataTable,
  DataCell,
  StatusBadge,
  EmptyState,
} from "@/components/DataTable";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertEmployeeAccess } from "@/lib/access";
import { ruDate } from "@/lib/format";

export default async function EmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      station: true,
      garments: {
        include: { garmentType: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!employee) notFound();
  assertEmployeeAccess(user, employee);
  return (
    <main className="shell list-page">
      <Link href="/employees" className="back-link">
        <ArrowLeft size={16} />
        Сотрудники
      </Link>
      <section className="page-heading employee-heading">
        <div className="employee-heading-info">
          <p className="eyebrow">{employee.station.name}</p>
          <h1 className="page-title">{employee.fullName}</h1>
          <div className="employee-meta">
            <span>{employee.position || "должность не указана"}</span>
            <StatusBadge status={employee.status} />
          </div>
          {employee.firedDate && (
            <p className="page-count">
              Дата увольнения: {ruDate(employee.firedDate)}
            </p>
          )}
        </div>
        <div className="page-actions">
          <form action={`/api/employees/${employee.id}/fire`} method="post">
            <button className="button-danger-quiet">
              <UserMinus size={16} />
              Уволить
            </button>
          </form>
          <form action="/api/operations/firing-return" method="post">
            <input type="hidden" name="employeeId" value={employee.id} />
            <button className="button-primary">
              <RotateCcw size={16} />
              Оформить возврат
            </button>
          </form>
        </div>
      </section>
      <section>
        <div className="section-heading">
          <h2>Закреплённая спецодежда</h2>
          <span>Изделий: {employee.garments.length}</span>
        </div>
        {employee.garments.length === 0 ? (
          <EmptyState title="За сотрудником пока нет закрепленных изделий." />
        ) : (
          <DataTable caption="Спецодежда сотрудника">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">
                  Изделие
                </th>
                <th scope="col" role="columnheader">
                  Штрих-код
                </th>
                <th scope="col" role="columnheader">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {employee.garments.map((garment) => (
                <tr role="row" key={garment.id}>
                  <DataCell label="Изделие" primary>
                    <div className="font-semibold">
                      {garment.garmentType.name}
                    </div>
                    {garment.label && (
                      <div className="cell-secondary">{garment.label}</div>
                    )}
                  </DataCell>
                  <DataCell label="Штрих-код">
                    <span className="barcode-text">{garment.barcode}</span>
                  </DataCell>
                  <DataCell label="Статус">
                    <StatusBadge status={garment.status} />
                  </DataCell>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
    </main>
  );
}
