import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@biodentis.com" },
    update: {},
    create: {
      email: "admin@biodentis.com",
      passwordHash,
      role: Role.ADMIN,
      firstName: "Admin",
      lastName: "BIODENTIS",
    },
  });

  await prisma.user.upsert({
    where: { email: "recepcion@biodentis.com" },
    update: {},
    create: {
      email: "recepcion@biodentis.com",
      passwordHash,
      role: Role.RECEPTIONIST,
      firstName: "María",
      lastName: "García",
      phone: "555-0101",
    },
  });

  const dentistUser = await prisma.user.upsert({
    where: { email: "dr.martinez@biodentis.com" },
    update: {},
    create: {
      email: "dr.martinez@biodentis.com",
      passwordHash,
      role: Role.DENTIST,
      firstName: "Carlos",
      lastName: "Martínez",
      phone: "555-0102",
    },
  });

  const dentist = await prisma.dentist.upsert({
    where: { userId: dentistUser.id },
    update: {},
    create: { userId: dentistUser.id, specialty: "Odontología General" },
  });

  await prisma.user.upsert({
    where: { email: "paciente@biodentis.com" },
    update: {},
    create: {
      email: "paciente@biodentis.com",
      passwordHash,
      role: Role.PATIENT,
      firstName: "Ana",
      lastName: "López",
      phone: "555-0103",
    },
  });

  const schedule = [
    { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 1, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 2, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 2, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 3, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 4, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 4, startTime: "14:00", endTime: "18:00" },
    { dayOfWeek: 5, startTime: "08:00", endTime: "12:00" },
    { dayOfWeek: 5, startTime: "14:00", endTime: "18:00" },
  ];

  for (const slot of schedule) {
    await prisma.availability.upsert({
      where: { dentistId_dayOfWeek: { dentistId: dentist.id, dayOfWeek: slot.dayOfWeek } },
      update: { startTime: slot.startTime, endTime: slot.endTime },
      create: { dentistId: dentist.id, ...slot },
    });
  }

  console.log("Seed completado!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
