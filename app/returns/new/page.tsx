import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { stationScope } from "@/lib/access";

export default async function NewReturnPage() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  const employees = await prisma.employee.findMany({
    where: { stationId: stationScope(user), status: { in: ["active", "fired"] } },
    orderBy: { fullName: "asc" }
  });
  return (
    <main className="shell max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Возврат уволенного</h1>
      <form action="/api/operations/firing-return" method="post" className="panel space-y-4 p-4">
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
        <button className="bg-brand text-white">Оформить возврат</button>
      </form>
    </main>
  );
}
