import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCheck,
  FileSpreadsheet,
  Mail,
  Shirt,
  Trash2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { assertOperationAccess } from "@/lib/access";
import { fileTypeLabel } from "@/lib/storage";
import { money, ruDate, statusNames } from "@/lib/format";
import { ScanBox } from "@/components/ScanBox";
import { AutoUploadFileInput } from "@/components/AutoUploadFileInput";

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
  if (operation.type === "firing_return" && user.role !== "admin") redirect("/");

  const received = operation.items.filter((item) => item.direction === "received_from_laundry");
  const sent = operation.items.filter((item) => item.direction === "sent_to_laundry");
  const returned = operation.items.filter((item) => item.direction === "returned_after_firing");
  const notReturned = operation.items.filter((item) => item.direction === "not_returned");
  const remaining = operation.employee?.garments.filter((garment) => !operation.items.some((item) => item.garmentId === garment.id)) || [];
  const editable = operation.status !== "sent" && operation.status !== "cancelled";
  const defaultMailTo = operation.station.mailTo || process.env.MAIL_TO || "";

  return (
    <main className="shell operation-page">
      <Link href="/operations" className="back-link">
        <ArrowLeft size={16} />
        История операций
      </Link>
      <section className="document-heading">
        <div>
          <p className="eyebrow">
            {operation.type === "laundry"
              ? "Стирка спецодежды"
              : "Документ возврата"}
          </p>
          <h1 className="page-title">
            {operation.type === "laundry"
              ? "Операция стирки"
              : "Возврат при увольнении"}
          </h1>
          <div className="document-meta">
            <span>
              <Building2 size={15} />
              {operation.station.name}
            </span>
            <span>
              <CalendarDays size={15} />
              {ruDate(operation.operationDate)}
            </span>
          </div>
        </div>
        <span className={`status-badge status-${operation.status}`}>
          {operation.status === "sent" && <CheckCheck size={15} />}
          {statusNames[operation.status] || operation.status}
        </span>
      </section>
      {editable && (
        <form
          action={`/api/operations/${operation.id}/delete-draft`}
          method="post"
          className="draft-actions"
        >
          <button className="button-danger-quiet">
            <Trash2 size={15} />
            Удалить черновик
          </button>
        </form>
      )}
      {operation.employee && (
        <p className="text-sm text-slate-600">
          Сотрудник: {operation.employee.fullName}
        </p>
      )}

      {operation.type === "laundry" ? (
        <section
          className="laundry-grid"
          aria-label="Приём и отправка спецодежды"
        >
          <div className="panel laundry-panel laundry-panel-received space-y-4 p-4">
            {editable && (
              <ScanBox
                operationId={operation.id}
                direction="received_from_laundry"
                label={`Принято из стирки · ${received.length}`}
              />
            )}
            {!editable && (
              <h3 className="font-semibold">
                Принято из стирки · {received.length}
              </h3>
            )}
            <ItemsTable
              items={received}
              otherDirection="sent_to_laundry"
              editable={editable}
            />
          </div>
          <div className="panel laundry-panel laundry-panel-sent space-y-4 p-4">
            {editable && (
              <ScanBox
                operationId={operation.id}
                direction="sent_to_laundry"
                label={`Отдано в стирку · ${sent.length}`}
              />
            )}
            {!editable && (
              <h3 className="font-semibold">Отдано в стирку · {sent.length}</h3>
            )}
            <ItemsTable
              items={sent}
              otherDirection="received_from_laundry"
              editable={editable}
            />
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="panel space-y-4 p-4 lg:col-span-2">
            {editable && (
              <ScanBox
                operationId={operation.id}
                direction="returned_after_firing"
                label={`Возвращено · ${returned.length}`}
              />
            )}
            {!editable && (
              <h3 className="font-semibold">Возвращено · {returned.length}</h3>
            )}
            <ItemsTable
              items={returned}
              otherDirection="not_returned"
              editable={editable}
            />
          </div>
          <div className="panel space-y-3 p-4">
            <h3 className="font-semibold">Не отмечены</h3>
            {editable &&
              remaining.map((garment) => (
                <form
                  key={garment.id}
                  action={`/api/operations/${operation.id}/scan`}
                  method="post"
                  className="space-y-2 border-b border-line pb-3"
                >
                  <input type="hidden" name="barcode" value={garment.barcode} />
                  <input type="hidden" name="direction" value="not_returned" />
                  <input
                    type="hidden"
                    name="redirectTo"
                    value={`/operations/${operation.id}`}
                  />
                  <div className="text-sm font-semibold">
                    {garment.garmentType.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {garment.barcode}
                  </div>
                  <input
                    name="deductionAmount"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Сумма удержания"
                    required
                  />
                  <button className="bg-panel">Не возвращено</button>
                </form>
              ))}
            <ItemsTable
              items={notReturned}
              otherDirection="returned_after_firing"
              editable={editable}
            />
          </div>
        </section>
      )}

      {editable && (
        <section className="document-completion">
          <div className="section-heading">
            <h2>Акт и отчёты</h2>
          <span>Вложения: {operation.attachments.length}</span>
          </div>
          <div
            className={`document-files-grid ${operation.type === "firing_return" ? "document-files-return" : ""}`}
          >
            <AutoUploadFileInput
              action={`/api/operations/${operation.id}/upload-act`}
              title="Фото акта"
            />
            {operation.type === "firing_return" && (
              <AutoUploadFileInput
                action={`/api/operations/${operation.id}/upload-return-photo`}
                title="Фото одежды"
              />
            )}
            <div className="panel document-send space-y-4 p-4">
              <h3 className="font-semibold">Отправка отчёта</h3>
              <form
                action={`/api/operations/${operation.id}/${operation.type === "laundry" ? "generate-excel" : "generate-return-excel"}`}
                method="post"
              >
                <button className="w-full bg-panel">
                  <FileSpreadsheet size={18} />
                  Сформировать Excel
                </button>
              </form>
              <form
                action={`/api/operations/${operation.id}/send-email`}
                method="post"
                className="space-y-2"
              >
                <label className="block space-y-1 text-sm">
                  <span>Получатель письма</span>
                  <input
                    name="mailTo"
                    type="email"
                    defaultValue={defaultMailTo}
                    required
                  />
                </label>
                <button className="w-full button-primary">
                  <Mail size={18} />
                  Отправить письмо
                </button>
              </form>
              <ul className="attachment-list text-sm text-slate-700">
                {operation.attachments.map((file) => (
                  <li key={file.id}>
                    <FileSpreadsheet size={15} />
                    <span>
                      {fileTypeLabel(file.fileType)}: {file.fileName}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function ItemsTable({
  items,
  otherDirection,
  editable,
}: {
  items: any[];
  otherDirection: string;
  editable: boolean;
}) {
  if (!items.length)
    return (
      <div className="operation-empty">
        <Shirt size={28} strokeWidth={1.5} />
        <p>Пока нет позиций</p>
      </div>
    );
  return (
    <ul className="operation-items">
      {items.map((item) => (
        <li key={item.id} className="operation-item">
          <span className="garment-icon" aria-hidden="true">
            <Shirt size={20} />
          </span>
          <div className="operation-item-info">
            <div className="font-semibold">{item.garment.garmentType.name}</div>
            <div className="text-sm text-slate-600">
              {item.garment.employee.fullName}
            </div>
            <div className="barcode-text">{item.garment.barcode}</div>
            {Number(item.deductionAmount) > 0 && (
              <div className="text-sm text-warn">
                {money(item.deductionAmount)}
              </div>
            )}
          </div>
          {editable && (
            <div className="operation-item-actions">
              <form
                action={`/api/operations/${item.operationId}/move-item`}
                method="post"
              >
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="direction" value={otherDirection} />
                <button className="bg-panel text-xs">Перенести</button>
              </form>
              <form
                action={`/api/operations/${item.operationId}/items/${item.id}`}
                method="post"
              >
                <button
                  className="icon-button"
                  title="Удалить из документа"
                  aria-label={`Удалить ${item.garment.garmentType.name}, ${item.garment.barcode} из документа`}
                >
                  <Trash2 size={16} />
                </button>
              </form>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
