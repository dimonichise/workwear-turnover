import fs from "fs/promises";
import { OperationStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const active = await prisma.operation.findMany({
    where: { status: { in: [OperationStatus.draft, OperationStatus.ready] } },
    include: { attachments: true },
    orderBy: { createdAt: "desc" }
  });
  const keep = new Set<string>();
  const remove: typeof active = [];

  for (const operation of active) {
    const key = `${operation.stationId}:${operation.type}`;
    if (!keep.has(key)) {
      keep.add(key);
      continue;
    }
    remove.push(operation);
  }

  for (const operation of remove) {
    for (const attachment of operation.attachments) {
      await fs.unlink(attachment.filePath).catch(() => undefined);
    }
    await prisma.operation.delete({ where: { id: operation.id } });
  }

  console.log(`Removed stale draft operations: ${remove.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
