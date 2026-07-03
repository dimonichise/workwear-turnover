import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertAdmin, assertOperationAccess } from "@/lib/access";
import { fileTypeLabel } from "@/lib/storage";
import { money, ruDate, statusNames } from "@/lib/format";
import { ScanBox } from "@/components/ScanBox";

export default async function OperationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const operation = await prisma.operation.findUnique({
    where: { id },
    include: {
      station: true,
      employee: { include: { garments: { include: { garmentType: true } } } },
      attachments: true,
      items: {
        include: { garment: { include: { employee: true, garmentType: true, station: true } } },
        orderBy: { scanTime: "desc" }
      }
    }
  });
  if (!operation) notFound();
  assertOperationAccess(user, operation);
  if (operation.type === "firing_return") assertAdmin(user);

  const received = operation.items.filter((item) => item.direction === "received_from_laundry");
  const sent = operation.items.filter((item) => item.direction === "sent_to_laundry");
  const returned = operation.items.filter((item) => item.direction === "returned_after_firing");
  const notReturned = operation.items.filter((item) => item.direction === "not_returned");
  const remaining = operation.employee?.garments.filter((garment) => !operation.items.some((item) => item.garmentId === garment.id)) || [];

  return (
    <main className="shell space-y-5">
      <section className="panel p-4">
        <h1 className="text-2xl font-bold">{operation.type === "laundry" ? "Операция стирки" : "Возврат при увольнении"}</h1>
        <p className="text-sm text-slate-600">
          {operation.station.name} · {ruDate(operation.operationDate)} · статус: {statusNames[operation.status] || operation.status}
        </p>
        {operation.employee && <p className="text-sm text-slate-600">Сотрудник: {operation.employee.fullName}</p>}
      </section>

      {operation.type === "laundry" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <div className="panel space-y-4 p-4">
            <ScanBox operationId={operation.id} direction="received_from_laundry" label={`Принято из стирки · ${received.length}`} />
            <ItemsTable items={received} otherDirection="sent_to_laundry" />
          </div>
          <div className="panel space-y-4 p-4">
            <ScanBox operationId={operation.id} direction="sent_to_laundry" label={`Отдано в стирку · ${sent.length}`} />
            <ItemsTable items={sent} otherDirection="received_from_laundry" />
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="panel space-y-4 p-4 lg:col-span-2">
            <ScanBox operationId={operation.id} direction="returned_after_firing" label={`Возвращено · ${returned.length}`} />
            <ItemsTable items={returned} otherDirection="not_returned" />
          </div>
          <div className="panel space-y-3 p-4">
            <h3 className="font-semibold">Не отмечены</h3>
            {remaining.map((garment) => (
              <form key={garment.id} action={`/api/operations/${operation.id}/scan`} method="post" className="space-y-2 border-b border-line pb-3">
                <input type="hidden" name="barcode" value={garment.barcode} />
                <input type="hidden" name="direction" value="not_returned" />
                <input type="hidden" name="redirectTo" value={`/operations/${operation.id}`} />
                <div className="text-sm font-semibold">{garment.label || garment.garmentType.name}</div>
                <div className="text-xs text-slate-600">{garment.barcode}</div>
                <input name="deductionAmount" type="number" min="0" step="1" placeholder="Сумма удержания" required />
                <button className="bg-panel">Не возвращено</button>
              </form>
            ))}
            <ItemsTable items={notReturned} otherDirection="returned_after_firing" />
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <form action={`/api/operations/${operation.id}/upload-act`} method="post" encType="multipart/form-data" className="panel space-y-3 p-4">
          <h3 className="font-semibold">Фото акта</h3>
          <input name="file" type="file" accept="image/*" capture="environment" required />
          <button className="bg-panel">Загрузить</button>
        </form>
        {operation.type === "firing_return" && (
          <form action={`/api/operations/${operation.id}/upload-return-photo`} method="post" encType="multipart/form-data" className="panel space-y-3 p-4">
            <h3 className="font-semibold">Фото одежды</h3>
            <input name="file" type="file" accept="image/*" capture="environment" required />
            <button className="bg-panel">Загрузить</button>
          </form>
        )}
        <div className="panel space-y-3 p-4">
          <h3 className="font-semibold">Документы</h3>
          <form action={`/api/operations/${operation.id}/${operation.type === "laundry" ? "generate-excel" : "generate-return-excel"}`} method="post">
            <button className="w-full bg-panel">Сформировать Excel</button>
          </form>
          <form action={`/api/operations/${operation.id}/send-email`} method="post">
            <button className="w-full bg-brand text-white">Отправить письмо</button>
          </form>
          <ul className="text-sm text-slate-700">
            {operation.attachments.map((file) => (
              <li key={file.id}>
                {fileTypeLabel(file.fileType)}: {file.fileName}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function ItemsTable({ items, otherDirection }: { items: any[]; otherDirection: string }) {
  if (!items.length) return <p className="text-sm text-slate-600">Пока нет позиций</p>;
  return (
    <div className="table-wrap">
      <table>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <div className="font-semibold">{item.garment.employee.fullName}</div>
                <div className="text-sm text-slate-600">
                  {item.garment.label || item.garment.garmentType.name} · {item.garment.barcode}
                  {Number(item.deductionAmount) > 0 ? ` · ${money(item.deductionAmount)}` : ""}
                </div>
              </td>
              <td className="w-24">
                <form action={`/api/operations/${item.operationId}/move-item`} method="post" className="mb-2">
                  <input type="hidden" name="itemId" value={item.id} />
                  <input type="hidden" name="direction" value={otherDirection} />
                  <button className="bg-panel text-xs">Перенести</button>
                </form>
                <form action={`/api/operations/${item.operationId}/items/${item.id}`} method="post">
                  <button className="bg-panel text-xs">Удалить</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
