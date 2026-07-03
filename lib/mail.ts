import fs from "fs/promises";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { fileDate } from "@/lib/format";
import { finalizeOperationGarmentStatuses } from "@/lib/operation";

export async function sendOperationEmail(operationId: string) {
  const operation = await prisma.operation.findUnique({
    where: { id: operationId },
    include: { station: true, attachments: true }
  });
  if (!operation) throw new Error("Операция не найдена");

  const required =
    operation.type === "laundry" ? ["excel_detail", "act_photo"] : ["excel_detail", "act_photo", "return_photo"];
  const missing = required.filter((type) => !operation.attachments.some((item) => item.fileType === type));
  if (missing.length) throw new Error(`Не хватает вложений: ${missing.join(", ")}`);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const subject = `${operation.station.name}_${operation.type === "laundry" ? "Стирка" : "Возврат"}_${fileDate(operation.operationDate)}`;
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.MAIL_TO || "25u@autopilot-sto.ru",
    subject,
    text: `Документы по операции ${subject}`,
    attachments: await Promise.all(
      operation.attachments.map(async (attachment) => ({
        filename: attachment.fileName,
        content: await fs.readFile(attachment.filePath)
      }))
    )
  });

  await finalizeOperationGarmentStatuses(operation.id);
  await prisma.operation.update({ where: { id: operation.id }, data: { status: "sent", emailSentAt: new Date() } });
  return { subject };
}
