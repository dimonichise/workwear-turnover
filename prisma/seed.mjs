import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.station.upsert({
    where: { id: "yasenevo-seed" },
    update: {},
    create: { id: "yasenevo-seed", name: "Ясенево", isActive: true }
  });

  for (const name of ["Футболка", "Куртка", "Комбинезон"]) {
    await prisma.garmentType.upsert({
      where: { name },
      update: { isActive: true },
      create: { name }
    });
  }

  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "change_me";
  await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.admin,
      stationId: null
    },
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      fullName: process.env.ADMIN_NAME || "Администратор",
      role: UserRole.admin,
      stationId: null
    }
  });
}

main().finally(async () => prisma.$disconnect());
