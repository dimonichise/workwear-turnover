import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertEmployeeAccess } from "@/lib/access";
import { statusNames, ruDate } from "@/lib/format";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: { station: true, garments: { include: { garmentType: true }, orderBy: { updatedAt: "desc" } } }
  });
  if (!employee) notFound();
  assertEmployeeAccess(user, employee);
  return (
    <main className="shell space-y-5">
      <section className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{employee.fullName}</h1>
            <p className="text-sm text-slate-600">
              {employee.station.name} · {employee.position || "должность не указана"} · {statusNames[employee.status]}
            </p>
            {employee.firedDate && <p className="text-sm text-slate-600">Дата увольнения: {ruDate(employee.firedDate)}</p>}
          </div>
          <div className="flex gap-2">
            <form action={`/api/employees/${employee.id}/fire`} method="post">
              <button className="bg-panel">Уволить</button>
            </form>
            <form action="/api/operations/firing-return" method="post">
              <input type="hidden" name="employeeId" value={employee.id} />
              <button className="bg-brand text-white">Оформить возврат</button>
            </form>
          </div>
        </div>
      </section>
      <section className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Изделие</th>
              <th>Штрих-код</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {employee.garments.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-sm text-slate-600">
                  За сотрудником пока нет закрепленных изделий.
                </td>
              </tr>
            ) : (
              employee.garments.map((garment) => (
                <tr key={garment.id}>
                  <td>
                    <div className="font-semibold">{garment.garmentType.name}</div>
                    {garment.label && <div className="text-sm text-slate-600">{garment.label}</div>}
                  </td>
                  <td>{garment.barcode}</td>
                  <td>{statusNames[garment.status]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
      <Link href="/employees" className="button inline-block bg-white">
        Назад
      </Link>
    </main>
  );
}
